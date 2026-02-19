import { Link } from "react-router-dom";
import type { Session } from "dialai";

interface Props {
  session: Session;
}

export function SessionHeader({ session }: Props) {
  const isTerminal = session.currentState === session.machine.goalState;

  return (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.5rem" }}>
        <Link to="/" style={{ color: "#5555ff", textDecoration: "none", fontSize: "0.85rem" }}>
          &larr; Machines
        </Link>
        <h1 style={{ fontSize: "1.3rem", fontWeight: 600 }}>{session.machineName}</h1>
        <span
          style={{
            padding: "2px 10px",
            borderRadius: 4,
            fontSize: "0.8rem",
            fontWeight: 600,
            background: isTerminal ? "#1a3a1a" : "#1a1a3a",
            color: isTerminal ? "#4f4" : "#88f",
            border: `1px solid ${isTerminal ? "#2a5a2a" : "#2a2a5a"}`,
          }}
        >
          {session.currentState}
        </span>
      </div>
      <div style={{ color: "#666", fontSize: "0.75rem", fontFamily: "monospace" }}>
        {session.sessionId} &middot; {session.history.length} transitions
      </div>
    </div>
  );
}
