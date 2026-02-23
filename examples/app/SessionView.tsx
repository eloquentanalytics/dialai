import { useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSession } from "./hooks/useSession.js";
import { useVisitor } from "./hooks/useVisitor.js";
import { screenRegistry } from "../screens/index.js";
import { DefaultScreen } from "../screens/DefaultScreen.js";

export function SessionView() {
  const { name, id, state } = useParams<{ name: string; id: string; state: string }>();
  const navigate = useNavigate();
  const { session, proposals, lastTickResults, collapseMetrics, decisions, view, visitors, tickMeta, loading } = useSession(id);
  const { identity, register, clear } = useVisitor(name);
  const redirectTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Navigate to updated URL when state changes
  useEffect(() => {
    if (session && name && id && session.currentState !== state) {
      navigate(`/machine/${name}/session/${id}/state/${session.currentState}`, { replace: true });
    }
  }, [session, name, id, state, navigate]);

  // Redirect to machine list if session not found (loading finished but no session)
  useEffect(() => {
    if (!loading && !session && id) {
      navigate("/", { replace: true });
    }
  }, [loading, session, navigate, id]);

  // Fallback: redirect if loading takes too long (6 seconds)
  useEffect(() => {
    if (loading && id) {
      redirectTimer.current = setTimeout(() => {
        if (!session) {
          navigate("/", { replace: true });
        }
      }, 6000);
      return () => {
        if (redirectTimer.current) {
          clearTimeout(redirectTimer.current);
        }
      };
    } else {
      if (redirectTimer.current) {
        clearTimeout(redirectTimer.current);
      }
    }
  }, [loading, session, navigate, id]);

  if (loading || !session) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
        <p>Loading session...</p>
      </div>
    );
  }

  const ScreenComponent = (name && screenRegistry[name]) || DefaultScreen;

  async function onForceTransition(_transitionName: string, _reasoning?: string) {
    // Force-transition disabled in public UI — visitors propose instead
  }

  async function onSubmitProposal(transitionName: string, reasoning?: string) {
    if (!identity) return;
    await fetch(`/api/sessions/${id}/visitor-propose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visitorId: identity.visitorId,
        transitionName,
        reasoning: reasoning ?? `Proposal by ${identity.handle}`,
      }),
    });
  }

  return (
    <ScreenComponent
      session={session}
      machine={session.machine}
      proposals={proposals}
      lastTickResults={lastTickResults}
      collapseMetrics={collapseMetrics}
      decisions={decisions}
      view={view}
      onForceTransition={onForceTransition}
      onSubmitProposal={onSubmitProposal}
      isVisitor={!!identity}
      visitors={visitors}
      tickMeta={tickMeta}
      visitorIdentity={identity}
      onRegister={register}
      onLeave={clear}
    />
  );
}
