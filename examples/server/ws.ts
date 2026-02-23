/**
 * ws.ts — WebSocket server: connection management, snapshot broadcasting
 */

import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import {
  getSession,
  getProposalsForRound,
  getCollapseMetrics,
  getStore,
} from "dialai";
import type { MachineModule } from "../machines/types.js";
import { getTickMeta } from "./tick-loop.js";
import { getVisitorsForMachine } from "./visitors.js";

let machineMap: Map<string, MachineModule> = new Map();

export function setWsMachines(machines: Map<string, MachineModule>): void {
  machineMap = machines;
}

// sessionId → Set<WebSocket>
const subscriptions = new Map<string, Set<WebSocket>>();

const HEARTBEAT_INTERVAL = 30_000;

export function attachWebSocket(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
    if (url.pathname !== "/ws") {
      socket.destroy();
      return;
    }

    const sessionId = url.searchParams.get("sessionId");
    if (!sessionId) {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, sessionId);
    });
  });

  wss.on("connection", (ws: WebSocket, _req: unknown, sessionId: string) => {
    // Subscribe
    if (!subscriptions.has(sessionId)) {
      subscriptions.set(sessionId, new Set());
    }
    subscriptions.get(sessionId)!.add(ws);

    // Mark alive for heartbeat
    (ws as WebSocket & { isAlive: boolean }).isAlive = true;
    ws.on("pong", () => {
      (ws as WebSocket & { isAlive: boolean }).isAlive = true;
    });

    // Send initial snapshot
    void sendSnapshot(ws, sessionId);

    ws.on("close", () => {
      const subs = subscriptions.get(sessionId);
      if (subs) {
        subs.delete(ws);
        if (subs.size === 0) subscriptions.delete(sessionId);
      }
    });
  });

  // Heartbeat ping every 30s
  setInterval(() => {
    for (const subs of subscriptions.values()) {
      for (const ws of subs) {
        const alive = ws as WebSocket & { isAlive: boolean };
        if (!alive.isAlive) {
          ws.terminate();
          continue;
        }
        alive.isAlive = false;
        ws.ping();
      }
    }
  }, HEARTBEAT_INTERVAL);
}

async function buildSnapshot(sessionId: string): Promise<Record<string, unknown> | null> {
  try {
    const session = await getSession(sessionId);
    const mod = machineMap.get(session.machineName);
    const view = mod?.computeView ? mod.computeView(session) : null;
    const store = getStore();
    const allSpecialists = await store.getSpecialistsByMachineAndRole(session.machineName, "arbiter");
    const arbiter = allSpecialists[0];
    const arbiterThreshold = arbiter && "threshold" in arbiter ? arbiter.threshold : undefined;

    const proposals = await getProposalsForRound(session.sessionId, session.currentRoundId);
    const metrics = await getCollapseMetrics(session.machineName);
    const decisions = await store.getDecisionRecordsByMachine(session.machineName);
    const visitors = getVisitorsForMachine(session.machineName);
    const tickMeta = getTickMeta();
    const isTerminal = session.currentState === session.machine.goalState;

    return {
      type: "snapshot",
      session: { ...session, view, arbiterThreshold },
      proposals,
      tickResults: [],
      collapseMetrics: metrics,
      decisions,
      visitors,
      tickMeta,
      isTerminal,
    };
  } catch {
    return null;
  }
}

async function sendSnapshot(ws: WebSocket, sessionId: string): Promise<void> {
  if (ws.readyState !== WebSocket.OPEN) return;
  const snapshot = await buildSnapshot(sessionId);
  if (snapshot) {
    ws.send(JSON.stringify(snapshot));
  } else {
    ws.send(JSON.stringify({ type: "error", code: "SESSION_NOT_FOUND" }));
    ws.close();
  }
}

/** Broadcast updated snapshot to all subscribers of a session */
export async function broadcast(sessionId: string): Promise<void> {
  const subs = subscriptions.get(sessionId);
  if (!subs || subs.size === 0) return;

  const snapshot = await buildSnapshot(sessionId);
  if (!snapshot) return;

  const data = JSON.stringify(snapshot);
  for (const ws of subs) {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

/** Broadcast to all sessions (used after tick) */
export async function broadcastAll(): Promise<void> {
  const sessionIds = [...subscriptions.keys()];
  await Promise.all(sessionIds.map((id) => broadcast(id)));
}
