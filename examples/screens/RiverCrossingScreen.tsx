import { SessionHeader } from "../app/components/SessionHeader.js";
import { TransitionPanel } from "../app/components/TransitionPanel.js";
import { ProposalList } from "../app/components/ProposalList.js";
import { HistoryTimeline } from "../app/components/HistoryTimeline.js";
import { CollapseGauge } from "../app/components/CollapseGauge.js";
import { replayMoves, ITEM_NAMES, isSolved } from "../machines/river-crossing-puzzle.js";
import type { ScreenProps } from "../machines/types.js";

const ITEM_EMOJIS = ["\uD83D\uDC68\u200D\uD83C\uDF3E", "\uD83D\uDC3A", "\uD83D\uDC10", "\uD83E\uDD6C"];

function RiverViz({ items }: { items: number[] }) {
  const solved = isSolved(items);
  const leftBank = items.map((side, i) => (side === 0 ? i : -1)).filter((i) => i >= 0);
  const rightBank = items.map((side, i) => (side === 1 ? i : -1)).filter((i) => i >= 0);

  return (
    <div style={{
      padding: "1.5rem",
      background: solved ? "#1a3a1a" : "#141420",
      border: `1px solid ${solved ? "#2a5a2a" : "#2a2a3a"}`,
      borderRadius: 8,
      marginBottom: "1.5rem",
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: "1rem", alignItems: "center" }}>
        {/* Left bank */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.5rem" }}>Left Bank</div>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", minHeight: 60 }}>
            {leftBank.map((idx) => (
              <div key={idx} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem" }}>{ITEM_EMOJIS[idx]}</div>
                <div style={{ fontSize: "0.7rem", color: "#aaa" }}>{ITEM_NAMES[idx]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* River */}
        <div style={{
          textAlign: "center",
          background: "#0a2a4a",
          borderRadius: 8,
          padding: "1rem 0",
          fontSize: "0.8rem",
          color: "#4af",
        }}>
          ~~~
          <br />
          river
          <br />
          ~~~
        </div>

        {/* Right bank */}
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.5rem" }}>Right Bank</div>
          <div style={{ display: "flex", justifyContent: "center", gap: "1rem", minHeight: 60 }}>
            {rightBank.map((idx) => (
              <div key={idx} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "2rem" }}>{ITEM_EMOJIS[idx]}</div>
                <div style={{ fontSize: "0.7rem", color: "#aaa" }}>{ITEM_NAMES[idx]}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {solved && (
        <div style={{ textAlign: "center", marginTop: "1rem", color: "#4f4", fontWeight: 600 }}>
          All items safely across!
        </div>
      )}
    </div>
  );
}

export function RiverCrossingScreen(props: ScreenProps) {
  const { session, machine, proposals, collapseMetrics, onForceTransition } = props;
  const items = replayMoves(session.history);

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <SessionHeader session={session} />

      <RiverViz items={items} />

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
