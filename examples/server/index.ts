/**
 * server/index.ts — Entry point: load machines, start tick loop, start HTTP
 */

import { createServer } from "node:http";
import { loadMachines } from "./machine-loader.js";
import { startTickLoop } from "./tick-loop.js";
import { setMachines, handleRequest } from "./routes.js";

const PORT = parseInt(process.env.PORT ?? "3001", 10);

async function main(): Promise<void> {
  console.log("DIAL AI Examples Server\n");

  // Load machines
  console.log("Loading machines...");
  const machines = await loadMachines();
  setMachines(machines);
  console.log(`  ${machines.size} machine(s) loaded\n`);

  // Start tick loop
  startTickLoop(200);

  // Start HTTP server
  const server = createServer(handleRequest);
  server.listen(PORT, () => {
    console.log(`\n  HTTP server listening on http://localhost:${PORT}`);
    console.log(`  API: http://localhost:${PORT}/api/machines\n`);
  });
}

main().catch((e) => {
  console.error("Server failed to start:", e);
  process.exit(1);
});
