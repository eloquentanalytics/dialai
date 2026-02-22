/**
 * useSession.ts — WebSocket-based session data hook (replaces polling)
 */

import { useEffect, useRef, useState, useCallback } from "react";
import type { Session, Proposal, TickResult, CollapseMetrics, DecisionRecord } from "dialai";
import type { Visitor } from "../../server/visitors.js";
import type { TickMeta } from "../../server/tick-loop.js";

interface SessionData {
  session: Session | null;
  proposals: Proposal[];
  lastTickResults: TickResult[];
  collapseMetrics: CollapseMetrics | null;
  decisions: DecisionRecord[];
  view: Record<string, unknown> | null;
  visitors: Visitor[];
  tickMeta: TickMeta | null;
  loading: boolean;
}

export function useSession(sessionId: string | undefined): SessionData {
  const [session, setSession] = useState<Session | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [lastTickResults, setLastTickResults] = useState<TickResult[]>([]);
  const [collapseMetrics, setCollapseMetrics] = useState<CollapseMetrics | null>(null);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [view, setView] = useState<Record<string, unknown> | null>(null);
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [tickMeta, setTickMeta] = useState<TickMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const reconnectDelay = useRef(1000);

  const connect = useCallback(() => {
    if (!sessionId) return;

    // Derive WS URL from current location (works in dev proxy + production)
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws?sessionId=${sessionId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectDelay.current = 1000; // reset backoff
    };

    ws.onmessage = (event) => {
      try {
        const snapshot = JSON.parse(event.data as string);
        if (snapshot.type === "snapshot") {
          const sessionData = snapshot.session;
          setSession(sessionData);
          setView(sessionData?.view ?? null);
          setProposals(snapshot.proposals ?? []);
          setLastTickResults(snapshot.tickResults ?? []);
          setCollapseMetrics(snapshot.collapseMetrics ?? null);
          setDecisions(snapshot.decisions ?? []);
          setVisitors(snapshot.visitors ?? []);
          setTickMeta(snapshot.tickMeta ?? null);
          setLoading(false);
        }
      } catch {
        // ignore parse errors
      }
    };

    ws.onclose = () => {
      wsRef.current = null;
      // Reconnect with exponential backoff
      reconnectTimer.current = setTimeout(() => {
        reconnectDelay.current = Math.min(reconnectDelay.current * 2, 30_000);
        connect();
      }, reconnectDelay.current);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, [sessionId]);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [connect]);

  return { session, proposals, lastTickResults, collapseMetrics, decisions, view, visitors, tickMeta, loading };
}
