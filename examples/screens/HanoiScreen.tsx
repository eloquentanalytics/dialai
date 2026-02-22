import { useState, useEffect } from "react";
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
  numDisks?: number;
}

function generateDiskColors(n: number): string[] {
  return Array.from({ length: n }, (_, i) =>
    `hsl(${Math.round((i * 360) / n)}, 70%, 55%)`
  );
}

function generateDiskWidths(n: number): number[] {
  return Array.from({ length: n }, (_, i) =>
    n === 1 ? 90 : 40 + (i / (n - 1)) * 100
  );
}

const PEG_NAMES = ["A", "B", "C"];

/** BFS solver: returns the optimal next transition name (e.g. "A_to_C") or null if solved. */
function computeOptimalMove(pegs: number[][]): string | null {
  const numDisks = pegs.reduce((sum, p) => sum + p.length, 0);
  if (numDisks === 0) return null;

  // Convert pegs to per-disk positions: diskPos[d] = peg index
  const diskPos = new Array(numDisks).fill(0);
  for (let p = 0; p < pegs.length; p++) {
    for (const d of pegs[p]) diskPos[d] = p;
  }

  const goalKey = new Array(numDisks).fill(2).join(",");
  const startKey = diskPos.join(",");
  if (startKey === goalKey) return null;

  const queue: [number[], string | null][] = [[diskPos, null]];
  const visited = new Set<string>([startKey]);

  while (queue.length > 0) {
    const [pos, firstMove] = queue.shift()!;

    // Build peg stacks from positions (sorted ascending = smallest on top)
    const stacks: number[][] = [[], [], []];
    for (let d = 0; d < numDisks; d++) stacks[pos[d]].push(d);
    for (const s of stacks) s.sort((a, b) => a - b);

    for (let from = 0; from < 3; from++) {
      if (stacks[from].length === 0) continue;
      const disk = stacks[from][0]; // top disk (smallest index)
      for (let to = 0; to < 3; to++) {
        if (from === to) continue;
        if (stacks[to].length > 0 && stacks[to][0] < disk) continue;

        const next = [...pos];
        next[disk] = to;
        const key = next.join(",");
        if (visited.has(key)) continue;
        visited.add(key);

        const move = `${PEG_NAMES[from]}_to_${PEG_NAMES[to]}`;
        const fm = firstMove ?? move;
        if (key === goalKey) return fm;
        queue.push([next, fm]);
      }
    }
  }
  return null;
}

const SPECIALIST_COLORS = [
  "#f0a",     // magenta (human-ish)
  "#4fc3f7",  // sky blue
  "#ab47bc",  // purple
  "#ff7043",  // orange
  "#66bb6a",  // green
  "#ffd54f",  // amber
  "#26c6da",  // teal
];

const FIXED_ROD_HEIGHT = 80;

function PegViz({ pegs, solved, pegNames }: { pegs: number[][]; solved: boolean; pegNames: string[] }) {
  const numDisks = pegs.reduce((sum, p) => sum + p.length, 0);
  const colors = generateDiskColors(numDisks);
  const widths = generateDiskWidths(numDisks);
  const rodHeight = FIXED_ROD_HEIGHT;
  const diskSpacing = numDisks > 1 ? Math.min(28, (rodHeight - 6) / numDisks) : rodHeight - 6;
  const diskHeight = Math.max(6, diskSpacing - 4);

  return (
    <div style={{
      padding: "0.75rem 1.5rem",
      background: solved ? "#1a3a1a" : "#141420",
      border: `1px solid ${solved ? "#2a5a2a" : "#2a2a3a"}`,
      borderRadius: 8,
      marginBottom: "0.75rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-around", alignItems: "flex-end", height: rodHeight + 30 }}>
        {pegs.map((peg, pegIdx) => (
          <div key={pegIdx} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 160 }}>
            {/* Peg label */}
            <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: 4 }}>{pegNames[pegIdx]}</div>

            {/* Peg rod */}
            <div style={{ position: "relative", width: 6, height: rodHeight, background: "#444", borderRadius: 3 }}>
              {/* Disks stacked from bottom */}
              {[...peg].reverse().map((diskId, stackIdx) => (
                <div
                  key={diskId}
                  style={{
                    position: "absolute",
                    bottom: stackIdx * diskSpacing,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: widths[diskId],
                    height: diskHeight,
                    background: colors[diskId],
                    borderRadius: 4,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    color: "#000",
                  }}
                >
                  {String(diskId)}
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
  colorMap,
  isOptimal,
  onForce,
}: {
  name: string;
  target: string;
  proposals: Proposal[];
  colorMap: Record<string, string>;
  isOptimal?: boolean;
  onForce: () => void;
}) {
  const defaultBorder = isOptimal ? "#2a5a3a" : (proposals.length > 0 ? "#3a3a6a" : "#2a2a3a");
  return (
    <div
      onClick={onForce}
      data-optimal={isOptimal ? "true" : undefined}
      data-transition={name}
      style={{
        display: "flex",
        background: isOptimal ? "#1a2a1a" : "#141420",
        border: `1px solid ${defaultBorder}`,
        borderRadius: 6,
        cursor: "pointer",
        transition: "border-color 0.15s",
        minHeight: 36,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = isOptimal ? "#4a8a5a" : "#5555ff"; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = defaultBorder; }}
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
        {proposals.map((p) => {
          const color = colorMap[p.specialistId] ?? (p.isHuman ? "#f8a" : "#8af");
          return (
            <div
              key={p.proposalId}
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "baseline",
                padding: "0.2rem 0.4rem",
                borderLeft: `2px solid ${color}`,
                fontSize: "0.75rem",
              }}
            >
              <span style={{ color, fontWeight: 600, whiteSpace: "nowrap", fontSize: "0.7rem" }}>
                {p.specialistId}
              </span>
              <span style={{ color: "#999" }}>{p.reasoning}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpecialistAlignmentBar({
  specialists,
  colorMap,
}: {
  specialists: { specialistId: string; alignment: number; totalProposals: number; winningProposals: number; winRate: number }[];
  colorMap: Record<string, string>;
}) {
  const sorted = [...specialists].sort((a, b) => a.alignment - b.alignment);

  return (
    <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
      {sorted.map((s) => {
        const color = colorMap[s.specialistId] ?? "#888";
        return (
          <div
            key={s.specialistId}
            style={{
              flex: 1,
              background: "#141420",
              border: "1px solid #2a2a3a",
              borderRadius: 6,
              padding: "0.6rem 0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.35rem",
            }}
          >
            {/* Specialist name */}
            <div style={{ color, fontWeight: 700, fontSize: "0.8rem", fontFamily: "monospace" }}>
              {s.specialistId}
            </div>

            {/* Alignment score — large */}
            <div style={{ color: "#eee", fontSize: "1.3rem", fontWeight: 700 }}>
              {(s.alignment * 100).toFixed(1)}%
            </div>

            {/* Alignment bar */}
            <div style={{ height: 4, background: "#2a2a3a", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${s.alignment * 100}%`, background: color, borderRadius: 2 }} />
            </div>

            {/* Win rate */}
            <div style={{ color: "#888", fontSize: "0.7rem" }}>
              {s.winningProposals}/{s.totalProposals} wins ({(s.winRate * 100).toFixed(0)}%)
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ThresholdSlider({
  sessionId,
  threshold,
  setThreshold,
  specialists,
  colorMap,
}: {
  sessionId: string;
  threshold: number;
  setThreshold: (v: number) => void;
  specialists: { specialistId: string; alignment: number }[];
  colorMap: Record<string, string>;
}) {
  const trackWidth = 250;

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    setThreshold(v);
    fetch(`/api/sessions/${sessionId}/threshold`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ threshold: v }),
    });
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
      <span style={{ color: "#888", fontSize: "0.75rem", whiteSpace: "nowrap" }}>Threshold</span>
      <div style={{ position: "relative", width: trackWidth, height: 32 }}>
        {/* Specialist alignment markers */}
        {specialists.map((s) => {
          const color = colorMap[s.specialistId] ?? "#888";
          const left = s.alignment * trackWidth;
          return (
            <div
              key={s.specialistId}
              title={`${s.specialistId}: ${(s.alignment * 100).toFixed(1)}%`}
              style={{
                position: "absolute",
                top: 0,
                left: left - 5,
                width: 0,
                height: 0,
                borderLeft: "5px solid transparent",
                borderRight: "5px solid transparent",
                borderTop: `6px solid ${color}`,
                zIndex: 2,
              }}
            />
          );
        })}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={threshold}
          onChange={onChange}
          style={{
            position: "absolute",
            top: 10,
            left: 0,
            width: trackWidth,
            accentColor: "#5555ff",
            cursor: "pointer",
          }}
        />
      </div>
      <span style={{ color: "#ccc", fontSize: "0.8rem", fontFamily: "monospace", minWidth: 36 }}>
        {threshold.toFixed(2)}
      </span>
    </div>
  );
}

export function HanoiScreen(props: ScreenProps) {
  const { session, machine, proposals, collapseMetrics, onForceTransition, view } = props;
  const serverThreshold = (session as unknown as Record<string, unknown>).arbiterThreshold as number | undefined;
  const [threshold, setThreshold] = useState(serverThreshold ?? 1.0);

  // Sync from server on first load
  useEffect(() => {
    if (serverThreshold !== undefined) setThreshold(serverThreshold);
  }, [serverThreshold]);

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

  // Build specialist → color map (from metrics first, then fill gaps from proposals)
  const colorMap: Record<string, string> = {};
  if (collapseMetrics?.specialists) {
    for (let i = 0; i < collapseMetrics.specialists.length; i++) {
      colorMap[collapseMetrics.specialists[i].specialistId] = SPECIALIST_COLORS[i % SPECIALIST_COLORS.length];
    }
  }
  // Assign colors to any specialists seen in proposals but not yet in metrics
  for (const p of proposals) {
    if (!colorMap[p.specialistId]) {
      colorMap[p.specialistId] = SPECIALIST_COLORS[Object.keys(colorMap).length % SPECIALIST_COLORS.length];
    }
  }

  // Compute optimal next move (declare_solved when pegs are in goal position)
  const optimalMove = solved ? "declare_solved" : computeOptimalMove(pegs);

  // Group proposals by transitionName
  const proposalsByTransition: Record<string, Proposal[]> = {};
  for (const p of proposals) {
    (proposalsByTransition[p.transitionName] ??= []).push(p);
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <SessionHeader session={session} />
        <ThresholdSlider
          sessionId={session.sessionId}
          threshold={threshold}
          setThreshold={setThreshold}
          specialists={Object.keys(colorMap).map((id) => {
            const found = collapseMetrics?.specialists?.find((s) => s.specialistId === id);
            return { specialistId: id, alignment: found?.alignment ?? 0 };
          })}
          colorMap={colorMap}
        />
      </div>

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
              colorMap={colorMap}
              isOptimal={name === optimalMove}
              onForce={() => onForceTransition(name, `Human override: ${name}`)}
            />
          ))}
        </div>
      )}

      {Object.keys(colorMap).length > 0 && (
        <SpecialistAlignmentBar
          specialists={Object.keys(colorMap).map((id) => {
            const found = collapseMetrics?.specialists?.find((s) => s.specialistId === id);
            return found ?? { specialistId: id, alignment: 0, totalProposals: 0, winningProposals: 0, winRate: 0 };
          })}
          colorMap={colorMap}
        />
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <HistoryTimeline history={session.history} />
        <CollapseGauge metrics={collapseMetrics} />
      </div>
    </div>
  );
}
