import type { MachineDefinition, Session } from "dialai";

interface Props {
  session: Session;
  machine: MachineDefinition;
  onForceTransition: (transitionName: string, reasoning?: string) => Promise<void>;
  isVisitor?: boolean;
}

export function TransitionPanel({ session, machine, onForceTransition, isVisitor }: Props) {
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
      <h3 style={{ fontSize: "0.9rem", marginBottom: "0.75rem", color: "#aaa" }}>
        {isVisitor ? "Propose a Transition" : "Transitions"}
      </h3>
      {!isVisitor && (
        <div style={{ fontSize: "0.75rem", color: "#666", marginBottom: "0.5rem" }}>
          Register to propose moves
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {Object.entries(transitions).map(([name, target]) => (
          <button
            key={name}
            onClick={isVisitor ? () => onForceTransition(name, `Visitor proposal: ${name}`) : undefined}
            disabled={!isVisitor}
            style={{
              padding: "0.4rem 0.8rem",
              background: "#1a1a2e",
              border: "1px solid #3a3a5a",
              borderRadius: 4,
              color: isVisitor ? "#ccc" : "#666",
              cursor: isVisitor ? "pointer" : "default",
              fontSize: "0.8rem",
              fontFamily: "monospace",
              transition: "all 0.15s",
              opacity: isVisitor ? 1 : 0.5,
            }}
            onMouseEnter={(e) => {
              if (!isVisitor) return;
              e.currentTarget.style.borderColor = "#5555ff";
              e.currentTarget.style.color = "#fff";
            }}
            onMouseLeave={(e) => {
              if (!isVisitor) return;
              e.currentTarget.style.borderColor = "#3a3a5a";
              e.currentTarget.style.color = "#ccc";
            }}
            title={isVisitor ? `Propose transition to ${target}` : "Register to propose moves"}
          >
            {name} &rarr; {target}
          </button>
        ))}
      </div>
    </div>
  );
}
