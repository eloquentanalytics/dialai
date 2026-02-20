/**
 * routes.ts — REST API endpoints using node:http
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import {
  createSession,
  getSession,
  getSessions,
  registerProposer,
  registerArbiter,
  submitArbitration,
  submitProposal,
  getProposalsForRound,
  getCollapseMetrics,
  decisionLog,
  specialists,
} from "dialai";
import type { MachineModule } from "../machines/types.js";
import { getLatestTickResults } from "./tick-loop.js";

type RouteHandler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>
) => Promise<void>;

interface Route {
  method: string;
  pattern: RegExp;
  keys: string[];
  handler: RouteHandler;
}

const routes: Route[] = [];
const registeredMachines = new Set<string>();

let machineMap: Map<string, MachineModule> = new Map();

export function setMachines(machines: Map<string, MachineModule>): void {
  machineMap = machines;
}

function route(method: string, path: string, handler: RouteHandler): void {
  const keys: string[] = [];
  const pattern = new RegExp(
    "^" +
      path.replace(/:(\w+)/g, (_match, key: string) => {
        keys.push(key);
        return "([^/]+)";
      }) +
      "$"
  );
  routes.push({ method, pattern, keys, handler });
}

function json(res: ServerResponse, data: unknown, status = 200): void {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function err(res: ServerResponse, message: string, status = 400): void {
  json(res, { error: message }, status);
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString();
      try {
        resolve(body.length > 0 ? JSON.parse(body) as Record<string, unknown> : {});
      } catch {
        resolve({});
      }
    });
  });
}

/**
 * Register strategies from a MachineModule for specialists that need custom strategyFn.
 * Only runs once per machine.
 */
async function registerMachineStrategies(mod: MachineModule): Promise<void> {
  const name = mod.definition.machineName;
  if (registeredMachines.has(name)) return;
  registeredMachines.add(name);

  if (!mod.strategies) return;

  // Collect all specialist definitions from machine-level + per-state
  const allSpecs = [...(mod.definition.specialists ?? [])];
  for (const stateDef of Object.values(mod.definition.states)) {
    if (stateDef.specialists) allSpecs.push(...stateDef.specialists);
  }

  for (const spec of allSpecs) {
    // Skip if already registered or has a built-in strategy
    if (specialists.has(spec.specialistId)) continue;
    if (spec.strategyFnName) continue;

    const strategyFn = mod.strategies[spec.specialistId];
    if (!strategyFn) continue;

    if (spec.role === "proposer") {
      await registerProposer({
        specialistId: spec.specialistId,
        machineName: spec.machineName ?? name,
        isHuman: spec.isHuman,
        strategyFn: strategyFn as Parameters<typeof registerProposer>[0]["strategyFn"],
      });
    } else if (spec.role === "arbiter") {
      await registerArbiter({
        specialistId: spec.specialistId,
        machineName: spec.machineName ?? name,
        strategyFn: strategyFn as Parameters<typeof registerArbiter>[0]["strategyFn"],
      });
    }
  }
}

// ============================================================================
// Route Definitions
// ============================================================================

// GET /api/machines
route("GET", "/api/machines", async (_req, res) => {
  const machines = [...machineMap.entries()].map(([name, mod]) => ({
    name,
    initialState: mod.definition.initialState,
    goalState: mod.definition.goalState,
    stateCount: Object.keys(mod.definition.states).length,
  }));
  json(res, machines);
});

// GET /api/machines/:name
route("GET", "/api/machines/:name", async (_req, res, params) => {
  const mod = machineMap.get(params.name);
  if (!mod) return err(res, `Machine not found: ${params.name}`, 404);
  json(res, mod.definition);
});

// POST /api/machines/:name/sessions
route("POST", "/api/machines/:name/sessions", async (_req, res, params) => {
  const mod = machineMap.get(params.name);
  if (!mod) return err(res, `Machine not found: ${params.name}`, 404);

  await registerMachineStrategies(mod);
  const session = await createSession(mod.definition);
  json(res, {
    sessionId: session.sessionId,
    machineName: session.machineName,
    currentState: session.currentState,
    url: `/machine/${params.name}/session/${session.sessionId}/state/${session.currentState}`,
  }, 201);
});

// GET /api/sessions
route("GET", "/api/sessions", async (_req, res) => {
  const allSessions = await getSessions();
  json(res, allSessions.map((s) => ({
    sessionId: s.sessionId,
    machineName: s.machineName,
    currentState: s.currentState,
    historyLength: s.history.length,
    createdAt: s.createdAt,
  })));
});

// GET /api/sessions/:id
route("GET", "/api/sessions/:id", async (_req, res, params) => {
  try {
    const session = await getSession(params.id);
    const mod = machineMap.get(session.machineName);
    const view = mod?.computeView ? mod.computeView(session) : null;
    json(res, { ...session, view });
  } catch {
    err(res, `Session not found: ${params.id}`, 404);
  }
});

// GET /api/sessions/:id/proposals
route("GET", "/api/sessions/:id/proposals", async (_req, res, params) => {
  try {
    const session = await getSession(params.id);
    const proposals = getProposalsForRound(session.sessionId, session.currentRoundId);
    json(res, proposals);
  } catch {
    err(res, `Session not found: ${params.id}`, 404);
  }
});

// GET /api/sessions/:id/metrics
route("GET", "/api/sessions/:id/metrics", async (_req, res, params) => {
  try {
    const session = await getSession(params.id);
    const metrics = getCollapseMetrics(session.machineName);
    json(res, metrics);
  } catch {
    err(res, `Session not found: ${params.id}`, 404);
  }
});

// GET /api/sessions/:id/decisions
route("GET", "/api/sessions/:id/decisions", async (_req, res, params) => {
  try {
    const session = await getSession(params.id);
    const decisions = [...decisionLog.values()].filter(
      (d) => d.sessionId === session.sessionId
    );
    json(res, decisions);
  } catch {
    err(res, `Session not found: ${params.id}`, 404);
  }
});

// POST /api/sessions/:id/arbitrate
route("POST", "/api/sessions/:id/arbitrate", async (req, res, params) => {
  try {
    const session = await getSession(params.id);
    const body = await readBody(req);

    // Find a human specialist for this machine
    const humanSpec = [...specialists.values()].find(
      (s) => s.machineName === session.machineName && "isHuman" in s && s.isHuman
    );
    if (!humanSpec) return err(res, "No human specialist registered for this machine");

    const result = await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
      specialistId: humanSpec.specialistId,
      transitionName: body.transitionName as string,
      reasoning: (body.reasoning as string) ?? "Human override via UI",
    });
    json(res, result);
  } catch (e) {
    err(res, e instanceof Error ? e.message : "Arbitration failed");
  }
});

// POST /api/sessions/:id/propose
route("POST", "/api/sessions/:id/propose", async (req, res, params) => {
  try {
    const session = await getSession(params.id);
    const body = await readBody(req);

    const humanSpec = [...specialists.values()].find(
      (s) => s.machineName === session.machineName && "isHuman" in s && s.isHuman
    );
    if (!humanSpec) return err(res, "No human specialist registered for this machine");

    const proposal = await submitProposal({
      sessionId: session.sessionId,
      specialistId: humanSpec.specialistId,
      roundId: session.currentRoundId,
      transitionName: body.transitionName as string,
      reasoning: (body.reasoning as string) ?? "Human proposal via UI",
    });
    json(res, proposal);
  } catch (e) {
    err(res, e instanceof Error ? e.message : "Proposal failed");
  }
});

// GET /api/tick
route("GET", "/api/tick", async (_req, res) => {
  json(res, getLatestTickResults());
});

// ============================================================================
// Request Handler
// ============================================================================

export function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  // CORS preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = url.pathname;
  const method = req.method ?? "GET";

  for (const r of routes) {
    if (r.method !== method) continue;
    const match = pathname.match(r.pattern);
    if (!match) continue;

    const params: Record<string, string> = {};
    r.keys.forEach((key, i) => {
      params[key] = decodeURIComponent(match[i + 1]);
    });

    r.handler(req, res, params).catch((e) => {
      console.error("Route error:", e);
      err(res, e instanceof Error ? e.message : "Internal error", 500);
    });
    return;
  }

  err(res, "Not found", 404);
}
