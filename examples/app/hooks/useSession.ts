import { useEffect, useRef, useState } from "react";
import type { Session, Proposal, TickResult, CollapseMetrics, DecisionRecord } from "dialai";

interface SessionData {
  session: Session | null;
  proposals: Proposal[];
  lastTickResults: TickResult[];
  collapseMetrics: CollapseMetrics | null;
  decisions: DecisionRecord[];
  view: Record<string, unknown> | null;
  loading: boolean;
}

export function useSession(sessionId: string | undefined): SessionData {
  const [session, setSession] = useState<Session | null>(null);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [lastTickResults, setLastTickResults] = useState<TickResult[]>([]);
  const [collapseMetrics, setCollapseMetrics] = useState<CollapseMetrics | null>(null);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [view, setView] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const metricsIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  useEffect(() => {
    if (!sessionId) return;

    async function fetchFast() {
      try {
        const [sessionRes, proposalRes, tickRes] = await Promise.all([
          fetch(`/api/sessions/${sessionId}`),
          fetch(`/api/sessions/${sessionId}/proposals`),
          fetch("/api/tick"),
        ]);
        if (sessionRes.ok) {
          const data = await sessionRes.json() as Session & { view?: Record<string, unknown> };
          setSession(data);
          setView(data.view ?? null);
        }
        if (proposalRes.ok) setProposals(await proposalRes.json());
        if (tickRes.ok) setLastTickResults(await tickRes.json());
        setLoading(false);
      } catch {
        // ignore fetch errors
      }
    }

    async function fetchSlow() {
      try {
        const [metricsRes, decisionsRes] = await Promise.all([
          fetch(`/api/sessions/${sessionId}/metrics`),
          fetch(`/api/sessions/${sessionId}/decisions`),
        ]);
        if (metricsRes.ok) setCollapseMetrics(await metricsRes.json());
        if (decisionsRes.ok) setDecisions(await decisionsRes.json());
      } catch {
        // ignore fetch errors
      }
    }

    void fetchFast();
    void fetchSlow();

    intervalRef.current = setInterval(() => void fetchFast(), 500);
    metricsIntervalRef.current = setInterval(() => void fetchSlow(), 2000);

    return () => {
      clearInterval(intervalRef.current);
      clearInterval(metricsIntervalRef.current);
    };
  }, [sessionId]);

  return { session, proposals, lastTickResults, collapseMetrics, decisions, view, loading };
}
