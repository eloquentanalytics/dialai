/**
 * server/index.ts — Entry point: load machines, auto-create sessions,
 * start tick loop, start HTTP + WebSocket server, serve static files
 */

import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { createSession, getSessions } from "dialai";
import { loadMachines } from "./machine-loader.js";
import { startTickLoop, setOnTickComplete } from "./tick-loop.js";
import { setMachines, handleRequest, registerMachineStrategies } from "./routes.js";
import { attachWebSocket, broadcastAll, setWsMachines } from "./ws.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);
const TICK_INTERVAL_MS = parseInt(process.env.TICK_INTERVAL_MS ?? "60000", 10);
const HANOI_DISKS = parseInt(process.env.HANOI_DISKS ?? "20", 10);

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const DIST_DIR = join(__dirname, "..", "dist");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

/** Default session configs per machine */
const SESSION_CONFIGS: Record<string, Record<string, unknown> | undefined> = {
  hanoi: { numDisks: HANOI_DISKS },
  "river-crossing": undefined,
  "simple-task": undefined,
};

async function main(): Promise<void> {
  console.log("DIAL AI Live Server\n");

  // Wire up Postgres persistence if DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    const { runMigrations } = await import("dialai/migrations");
    const { createPostgresStore } = await import("dialai/store-postgres");
    const { setStore } = await import("dialai");
    const ran = await runMigrations(process.env.DATABASE_URL);
    if (ran.length > 0) console.log(`  Migrations: ${ran.join(", ")}`);
    setStore(createPostgresStore(process.env.DATABASE_URL));
    console.log("  Using PostgreSQL persistence\n");
  } else {
    console.log("  Using in-memory persistence (no DATABASE_URL)\n");
  }

  // Load machines
  console.log("Loading machines...");
  const machines = await loadMachines();
  setMachines(machines);
  setWsMachines(machines);
  console.log(`  ${machines.size} machine(s) loaded\n`);

  // Register strategies and create sessions for machines that don't have one yet
  const existingSessions = await getSessions();
  const machinesWithSessions = new Set(existingSessions.map((s) => s.machineName));

  console.log("Ensuring sessions exist...");
  for (const [name, mod] of machines) {
    await registerMachineStrategies(mod);
    if (machinesWithSessions.has(name)) {
      console.log(`  ${name} → already has session(s), skipping`);
      continue;
    }
    const metaJson = SESSION_CONFIGS[name];
    const session = await createSession(mod.definition, metaJson);
    const label = metaJson ? ` (${JSON.stringify(metaJson)})` : "";
    console.log(`  ${name}${label} → created session ${session.sessionId}`);
  }
  console.log();

  // Wire broadcast to tick loop
  setOnTickComplete(broadcastAll);

  // Start tick loop
  startTickLoop(TICK_INTERVAL_MS);

  // Start HTTP server with static file fallback
  const server = createServer((req, res) => {
    handleRequest(req, res);

    // If routes didn't handle it, serve static files
    if ((res as { __notHandled?: boolean }).__notHandled) {
      void serveStatic(req.url ?? "/", res);
    }
  });

  // Attach WebSocket
  attachWebSocket(server);

  server.listen(PORT, () => {
    console.log(`\n  HTTP + WS server listening on http://localhost:${PORT}`);
    console.log(`  Tick interval: ${TICK_INTERVAL_MS}ms\n`);
  });
}

async function serveStatic(urlPath: string, res: import("node:http").ServerResponse): Promise<void> {
  try {
    // Try exact file match
    let filePath = join(DIST_DIR, urlPath);
    let fileStat = await stat(filePath).catch(() => null);

    // If directory, try index.html
    if (fileStat?.isDirectory()) {
      filePath = join(filePath, "index.html");
      fileStat = await stat(filePath).catch(() => null);
    }

    // If not found, SPA fallback to index.html
    if (!fileStat?.isFile()) {
      filePath = join(DIST_DIR, "index.html");
      fileStat = await stat(filePath).catch(() => null);
    }

    if (!fileStat?.isFile()) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = extname(filePath);
    const contentType = MIME_TYPES[ext] ?? "application/octet-stream";
    const content = await readFile(filePath);

    res.writeHead(200, { "Content-Type": contentType });
    res.end(content);
  } catch {
    res.writeHead(500);
    res.end("Internal server error");
  }
}

main().catch((e) => {
  console.error("Server failed to start:", e);
  process.exit(1);
});
