import { SessionHeader } from "../app/components/SessionHeader.js";
import { TransitionPanel } from "../app/components/TransitionPanel.js";
import { ProposalList } from "../app/components/ProposalList.js";
import { HistoryTimeline } from "../app/components/HistoryTimeline.js";
import { CollapseGauge } from "../app/components/CollapseGauge.js";
import { replayMoves, getPegStacks, PEG_NAMES, isSolved } from "../machines/hanoi-puzzle.js";
import type { ScreenProps } from "../machines/types.js";

const DISK_COLORS = ["#ff6b6b", "#ffd93d", "#6bcb77"];
const DISK_WIDTHS = [60, 100, 140];

function PegViz({ disks }: { disks: number[] }) {
  const pegs = getPegStacks(disks);
  const solved = isSolved(disks);

  return (
    <div style={{
      padding: "1.5rem",
      background: solved ? "#1a3a1a" : "#141420",
      border: `1px solid ${solved ? "#2a5a2a" : "#2a2a3a"}`,
      borderRadius: 8,
      marginBottom: "1.5rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: 160 }}>
        {pegs.map((peg, pegIdx) => (
          <div key={pegIdx} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 160 }}>
            {/* Peg label */}
            <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: 4 }}>{PEG_NAMES[pegIdx]}</div>

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

export function HanoiScreen(props: ScreenProps) {
  const { session, machine, proposals, collapseMetrics, onForceTransition } = props;
  const disks = replayMoves(session.history);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <SessionHeader session={session} />

      <PegViz disks={disks} />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div style={{ display: "grid", gap: "1.5rem", alignContent: "start" }}>
          <TransitionPanel session={session} machine={machine} onForceTransition={onForceTransition} />
          <ProposalList proposals={proposals} />
          <HistoryTimeline history={session.history} />
        </div>
        <div>
          <CollapseGauge metrics={collapseMetrics} />
        </div>
      </div>
    </div>
  );
}
