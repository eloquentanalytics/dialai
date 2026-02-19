import type { MachineDefinition, Session } from "dialai";

interface Props {
  session: Session;
  machine: MachineDefinition;
  onForceTransition: (transitionName: string, reasoning?: string) => Promise<void>;
}

export function TransitionPanel({ session, machine, onForceTransition }: Props) {
  const stateDef = machine.states[session.currentState];
  const transitions = stateDef?.transitions ?? {};
  const isTerminal = session.currentState === machine.goalState;

  if (isTerminal) {
    return (
      <div style={{ padding: "1rem", background: "#1a3a1a", borderRadius: 6, border: "1px solid #2a5a2a" }}>
        Goal state reached.
      </div>
    );
  }

  return (
    <div>
      <h3 style={{ fontSize: "0.9rem", marginBottom: "0.75rem", color: "#aaa" }}>Transitions</h3>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {Object.entries(transitions).map(([name, target]) => (
          <button
            key={name}
            onClick={() => onForceTransition(name, `Human override: ${name}`)}
            style={{
              padding: "0.4rem 0.8rem",
              background: "#1a1a2e",
              border: "1px solid #3a3a5a",
              borderRadius: 4,
              color: "#ccc",
              cursor: "pointer",
              fontSize: "0.8rem",
              fontFamily: "monospace",
              transition: "all 0.15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "#5555ff";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "#3a3a5a";
              e.currentTarget.style.color = "#ccc";
            }}
            title={`Force transition to ${target}`}
          >
            {name} &rarr; {target}
          </button>
        ))}
      </div>
    </div>
  );
}
