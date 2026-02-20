import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSession } from "./hooks/useSession.js";
import { screenRegistry } from "../screens/index.js";
import { DefaultScreen } from "../screens/DefaultScreen.js";

export function SessionView() {
  const { name, id, state } = useParams<{ name: string; id: string; state: string }>();
  const navigate = useNavigate();
  const { session, proposals, lastTickResults, collapseMetrics, decisions, view, loading } = useSession(id);

  // Navigate to updated URL when state changes
  useEffect(() => {
    if (session && name && id && session.currentState !== state) {
      navigate(`/machine/${name}/session/${id}/state/${session.currentState}`, { replace: true });
    }
  }, [session, name, id, state, navigate]);

  if (loading || !session) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
        <p>Loading session...</p>
      </div>
    );
  }

  const ScreenComponent = (name && screenRegistry[name]) || DefaultScreen;

  async function onForceTransition(transitionName: string, reasoning?: string) {
    await fetch(`/api/sessions/${id}/arbitrate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transitionName, reasoning }),
    });
  }

  async function onSubmitProposal(transitionName: string, reasoning?: string) {
    await fetch(`/api/sessions/${id}/propose`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transitionName, reasoning }),
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
    />
  );
}
