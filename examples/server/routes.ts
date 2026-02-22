/**
 * routes.ts — REST API endpoints using node:http
 */

import type { IncomingMessage, ServerResponse } from "node:http";
import {
  getSession,
  getSessions,
  getStore,
  registerProposer,
  registerArbiter,
  submitProposal,
  submitArbitration,
  getProposalsForRound,
  getCollapseMetrics,
} from "dialai";
import type { MachineModule } from "../machines/types.js";
import { getLatestTickResults, getTickMeta } from "./tick-loop.js";
import { registerVisitor, getVisitor, getVisitorsForMachine } from "./visitors.js";
import { broadcast } from "./ws.js";

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
export async function registerMachineStrategies(mod: MachineModule): Promise<void> {
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
    if (await getStore().hasSpecialist(spec.specialistId)) continue;
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

// GET /api/sessions — enhanced with isTerminal, goalState
route("GET", "/api/sessions", async (_req, res) => {
  const allSessions = await getSessions();
  json(res, allSessions.map((s) => ({
    sessionId: s.sessionId,
    machineName: s.machineName,
    currentState: s.currentState,
    historyLength: s.history.length,
    createdAt: s.createdAt,
    isTerminal: s.currentState === s.machine.goalState,
    goalState: s.machine.goalState,
  })));
});

// GET /api/sessions/:id
route("GET", "/api/sessions/:id", async (_req, res, params) => {
  try {
    const session = await getSession(params.id);
    const mod = machineMap.get(session.machineName);
    const view = mod?.computeView ? mod.computeView(session) : null;
    const store = getStore();
    const arbiters = await store.getSpecialistsByMachineAndRole(session.machineName, "arbiter");
    const arbiter = arbiters[0];
    const arbiterThreshold = arbiter && "threshold" in arbiter ? arbiter.threshold : undefined;
    json(res, { ...session, view, arbiterThreshold });
  } catch {
    err(res, `Session not found: ${params.id}`, 404);
  }
});

// PATCH /api/sessions/:id/threshold
route("PATCH", "/api/sessions/:id/threshold", async (req, res, params) => {
  try {
    const session = await getSession(params.id);
    const body = await readBody(req);
    const threshold = body.threshold as number;
    if (typeof threshold !== "number" || threshold < 0 || threshold > 1) {
      return err(res, "threshold must be a number between 0 and 1");
    }
    const store = getStore();
    const arbiters = await store.getSpecialistsByMachineAndRole(session.machineName, "arbiter");
    const arbiter = arbiters[0];
    if (!arbiter) return err(res, "No arbiter found for this machine", 404);
    (arbiter as { threshold?: number }).threshold = threshold;
    await store.setSpecialist(arbiter);
    json(res, { threshold });
    void broadcast(session.sessionId);
  } catch {
    err(res, `Session not found: ${params.id}`, 404);
  }
});

// GET /api/sessions/:id/proposals
route("GET", "/api/sessions/:id/proposals", async (_req, res, params) => {
  try {
    const session = await getSession(params.id);
    const proposals = await getProposalsForRound(session.sessionId, session.currentRoundId);
    json(res, proposals);
  } catch {
    err(res, `Session not found: ${params.id}`, 404);
  }
});

// GET /api/sessions/:id/metrics
route("GET", "/api/sessions/:id/metrics", async (_req, res, params) => {
  try {
    const session = await getSession(params.id);
    const metrics = await getCollapseMetrics(session.machineName);
    json(res, metrics);
  } catch {
    err(res, `Session not found: ${params.id}`, 404);
  }
});

// GET /api/sessions/:id/decisions
route("GET", "/api/sessions/:id/decisions", async (_req, res, params) => {
  try {
    const session = await getSession(params.id);
    const decisions = await getStore().getDecisionRecordsByMachine(session.machineName);
    json(res, decisions);
  } catch {
    err(res, `Session not found: ${params.id}`, 404);
  }
});

// POST /api/sessions/:id/propose — existing human proposal (keep for backwards compat)
route("POST", "/api/sessions/:id/propose", async (req, res, params) => {
  try {
    const session = await getSession(params.id);
    const body = await readBody(req);

    const allSpecs = await getStore().getSpecialistsByMachineAndRole(session.machineName, "proposer");
    const humanSpec = allSpecs.find((s) => "isHuman" in s && s.isHuman);
    if (!humanSpec) return err(res, "No human specialist registered for this machine");

    const proposal = await submitProposal({
      sessionId: session.sessionId,
      specialistId: humanSpec.specialistId,
      roundId: session.currentRoundId,
      transitionName: body.transitionName as string,
      reasoning: (body.reasoning as string) ?? "Human proposal via UI",
    });
    json(res, proposal);
    void broadcast(session.sessionId);
  } catch (e) {
    err(res, e instanceof Error ? e.message : "Proposal failed");
  }
});

// POST /api/sessions/:id/visitor-propose — visitor submits proposal
route("POST", "/api/sessions/:id/visitor-propose", async (req, res, params) => {
  try {
    const session = await getSession(params.id);
    const body = await readBody(req);

    const visitorId = body.visitorId as string;
    if (!visitorId) return err(res, "visitorId is required");

    const visitor = getVisitor(visitorId);
    if (!visitor) return err(res, "Visitor not found. Please register first.", 404);

    const proposal = await submitProposal({
      sessionId: session.sessionId,
      specialistId: visitor.specialistId,
      roundId: session.currentRoundId,
      transitionName: body.transitionName as string,
      reasoning: (body.reasoning as string) ?? `Proposal by ${visitor.handle}`,
    });
    json(res, proposal);
    void broadcast(session.sessionId);
  } catch (e) {
    err(res, e instanceof Error ? e.message : "Proposal failed");
  }
});

// POST /api/sessions/:id/arbitrate — force-transition (programmatic use, not in public UI)
route("POST", "/api/sessions/:id/arbitrate", async (req, res, params) => {
  try {
    const session = await getSession(params.id);
    const body = await readBody(req);

    const allSpecs = await getStore().getSpecialistsByMachineAndRole(session.machineName, "proposer");
    const humanSpec = allSpecs.find((s) => "isHuman" in s && s.isHuman);
    if (!humanSpec) return err(res, "No human specialist registered for this machine");

    const result = await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
      specialistId: humanSpec.specialistId,
      transitionName: body.transitionName as string,
      reasoning: (body.reasoning as string) ?? "Human override via API",
    });
    json(res, result);
    void broadcast(session.sessionId);
  } catch (e) {
    err(res, e instanceof Error ? e.message : "Arbitration failed");
  }
});

// POST /api/visitors/register — register a visitor as specialist
route("POST", "/api/visitors/register", async (req, res) => {
  const body = await readBody(req);
  const handle = body.handle as string;
  const machineName = body.machineName as string;

  if (!handle || !machineName) {
    return err(res, "handle and machineName are required");
  }

  const visitor = await registerVisitor(handle, machineName, body.visitorId as string | undefined);
  json(res, visitor, 201);

  // Broadcast updated state to all sessions of this machine
  const allSessions = await getSessions();
  for (const s of allSessions) {
    if (s.machineName === machineName) {
      void broadcast(s.sessionId);
    }
  }
});

// GET /api/visitors — list visitors for a machine
route("GET", "/api/visitors", async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const machineName = url.searchParams.get("machineName");
  if (!machineName) return err(res, "machineName query parameter is required");
  json(res, getVisitorsForMachine(machineName));
});

// GET /api/tick-meta — tick countdown info
route("GET", "/api/tick-meta", async (_req, res) => {
  json(res, getTickMeta());
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
      "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    });
    res.end();
    return;
  }

  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const pathname = url.pathname;
  const method = req.method ?? "GET";

  // Only match /api routes
  if (pathname.startsWith("/api")) {
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
    return;
  }

  // Non-API requests are handled by static file serving in index.ts
  // Signal that this request wasn't handled
  (res as ServerResponse & { __notHandled?: boolean }).__notHandled = true;
}
