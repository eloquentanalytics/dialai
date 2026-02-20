import { SessionHeader } from "../app/components/SessionHeader.js";
import { HistoryTimeline } from "../app/components/HistoryTimeline.js";
import { CollapseGauge } from "../app/components/CollapseGauge.js";
import type { ScreenProps } from "../machines/types.js";
import type { Proposal } from "dialai";

interface HanoiView {
  pegs: number[][];
  solved: boolean;
  pegNames: string[];
  disks: number[];
}

const DISK_COLORS = ["#ff6b6b", "#ffd93d", "#6bcb77"];
const DISK_WIDTHS = [60, 100, 140];

function PegViz({ pegs, solved, pegNames }: { pegs: number[][]; solved: boolean; pegNames: string[] }) {
  return (
    <div style={{
      padding: "0.75rem 1.5rem",
      background: solved ? "#1a3a1a" : "#141420",
      border: `1px solid ${solved ? "#2a5a2a" : "#2a2a3a"}`,
      borderRadius: 8,
      marginBottom: "0.75rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: 120 }}>
        {pegs.map((peg, pegIdx) => (
          <div key={pegIdx} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 160 }}>
            {/* Peg label */}
            <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: 4 }}>{pegNames[pegIdx]}</div>

            {/* Peg rod */}
            <div style={{ position: "relative", width: 6, height: 100, background: "#444", borderRadius: 3 }}>
              {/* Disks stacked from bottom */}
              {[...peg].reverse().map((diskId, stackIdx) => (
                <div
                  key={diskId}
                  style={{
                    position: "absolute",
                    bottom: stackIdx * 28,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: DISK_WIDTHS[diskId],
                    height: 24,
                    background: DISK_COLORS[diskId],
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "#000",
                  }}
                >
                  {["S", "M", "L"][diskId]}
                </div>
              ))}
            </div>

            {/* Base */}
            <div style={{ width: 160, height: 4, background: "#444", borderRadius: 2, marginTop: 2 }} />
          </div>
        ))}
      </div>

      {solved && (
        <div style={{ textAlign: "center", marginTop: "1rem", color: "#4f4", fontWeight: 600 }}>
          Puzzle Solved!
        </div>
      )}
    </div>
  );
}

function TransitionRow({
  name,
  target,
  proposals,
  onForce,
}: {
  name: string;
  target: string;
  proposals: Proposal[];
  onForce: () => void;
}) {
  return (
    <div
      onClick={onForce}
      style={{
        display: "flex",
        background: "#141420",
        border: `1px solid ${proposals.length > 0 ? "#3a3a6a" : "#2a2a3a"}`,
        borderRadius: 6,
        cursor: "pointer",
        transition: "border-color 0.15s",
        minHeight: 36,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#5555ff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = proposals.length > 0 ? "#3a3a6a" : "#2a2a3a"; }}
      title={`Force: ${name} → ${target}`}
    >
      {/* Left label — fixed width */}
      <div style={{
        width: 140,
        flexShrink: 0,
        padding: "0.5rem 0.75rem",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        borderRight: "1px solid #2a2a3a",
      }}>
        <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#ddd", fontSize: "0.8rem" }}>
          {name}
        </div>
      </div>

      {/* Right area — proposals stack vertically, expanding the row */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 1, padding: proposals.length > 0 ? "0.35rem 0.5rem" : 0 }}>
        {proposals.map((p) => (
          <div
            key={p.proposalId}
            style={{
              display: "flex",
              gap: "0.5rem",
              alignItems: "baseline",
              padding: "0.2rem 0.4rem",
              borderLeft: `2px solid ${p.isHuman ? "#f8a" : "#8af"}`,
              fontSize: "0.75rem",
            }}
          >
            <span style={{ color: p.isHuman ? "#f8a" : "#8af", fontWeight: 600, whiteSpace: "nowrap", fontSize: "0.7rem" }}>
              {p.specialistId}
            </span>
            <span style={{ color: "#999" }}>{p.reasoning}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HanoiScreen(props: ScreenProps) {
  const { session, machine, proposals, collapseMetrics, onForceTransition, view } = props;

  if (!view) {
    return (
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
        <p>Loading view...</p>
      </div>
    );
  }

  const { pegs, solved, pegNames } = view as unknown as HanoiView;

  const stateDef = machine.states[session.currentState];
  const transitions = stateDef?.transitions ?? {};
  const isTerminal = session.currentState === machine.goalState;

  // Group proposals by transitionName
  const proposalsByTransition: Record<string, Proposal[]> = {};
  for (const p of proposals) {
    (proposalsByTransition[p.transitionName] ??= []).push(p);
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <SessionHeader session={session} />

      <PegViz pegs={pegs} solved={solved} pegNames={pegNames} />

      {/* Transitions stacked vertically — rows grow with proposal count */}
      {isTerminal ? (
        <div style={{ padding: "1rem", background: "#1a3a1a", borderRadius: 6, border: "1px solid #2a5a2a", marginBottom: "1.5rem" }}>
          Goal state reached.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", marginBottom: "1.5rem" }}>
          {Object.entries(transitions).map(([name, target]) => (
            <TransitionRow
              key={name}
              name={name}
              target={target}
              proposals={proposalsByTransition[name] ?? []}
              onForce={() => onForceTransition(name, `Human override: ${name}`)}
            />
          ))}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <HistoryTimeline history={session.history} />
        <CollapseGauge metrics={collapseMetrics} />
      </div>
    </div>
  );
}
