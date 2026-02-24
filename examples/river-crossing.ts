#!/usr/bin/env npx tsx
/**
 * river-crossing.ts — Wolf-Goat-Cabbage as a 2-state DIAL machine
 *
 * Demonstrates progressive collapse with per-state specialists and
 * constraint reasoning. Board state reconstructed from transition history.
 *
 * Machine design: 2 states — "unsolved" and "solved". All crossing
 * transitions loop back to "unsolved"; "declare_solved" goes to "solved".
 *
 * State encoding: 4 items [F,W,G,C] each on side 0 (left) or 1 (right).
 * Safety: Wolf+Goat alone → wolf eats goat. Goat+Cabbage alone → eaten.
 *
 * Three specialists (declared on the "unsolved" state):
 *   "human-optimal"  — isHuman, disabled. Forces BFS-optimal moves.
 *   "llm-cautious"   — learns from exemplars; greedy: prefers taking
 *                       items right (fails at bring-goat-back step).
 *   "llm-greedy"     — random valid move (never learns).
 *
 * Usage:
 *   npx tsx examples/river-crossing.ts
 */

import {
  createSession,
  registerProposer,
  getEnabledProposersForState,
  submitArbitration,
  tick,
  getAlignmentScore,
  getAllAlignmentRecords,
  getExemplars,
  getCollapseMetrics,
} from "../src/dialai/index.js";
import type {
  MachineDefinition,
  TransitionRecord,
  ProposerContext,
  ProposerStrategyResult,
} from "../src/dialai/index.js";

// ============================================================================
// Puzzle Logic (history-based)
// ============================================================================

const ITEM_SHORT = ["F", "W", "G", "C"] as const;

interface Move {
  name: string;
  item: number | null; // index in FWGC, null = farmer only
}

const MOVES: Move[] = [
  { name: "cross_alone", item: null },
  { name: "take_wolf", item: 1 },
  { name: "take_goat", item: 2 },
  { name: "take_cabbage", item: 3 },
];

function isSafe(items: number[]): boolean {
  const [f, w, g, c] = items;
  if (w === g && f !== w) return false;
  if (g === c && f !== g) return false;
  return true;
}

function applyMoveToItems(items: number[], move: Move): number[] | null {
  const result = [...items];
  const farmerSide = result[0];
  if (move.item !== null && result[move.item] !== farmerSide) return null;
  result[0] = 1 - farmerSide;
  if (move.item !== null) result[move.item] = 1 - farmerSide;
  return isSafe(result) ? result : null;
}

/** Replay transition history to reconstruct current board. */
function replayMoves(history: TransitionRecord[]): number[] {
  let items = [0, 0, 0, 0]; // all on left bank
  for (const { transitionName } of history) {
    const move = MOVES.find((m) => m.name === transitionName);
    if (!move) continue; // skip declare_solved
    const next = applyMoveToItems(items, move);
    if (next) items = next;
  }
  return items;
}

function getValidMoves(items: number[]): Array<{ move: Move; target: number[] }> {
  const results: Array<{ move: Move; target: number[] }> = [];
  for (const move of MOVES) {
    const target = applyMoveToItems(items, move);
    if (target !== null) results.push({ move, target });
  }
  return results;
}

function isSolved(items: number[]): boolean {
  return items.every((i) => i === 1);
}

function formatItems(items: number[]): string {
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (items[i] === 0) left.push(ITEM_SHORT[i]);
    else right.push(ITEM_SHORT[i]);
  }
  return `L:[${left.join(",")}] R:[${right.join(",")}]`;
}

// ============================================================================
// Optimal Solver (the "human")
// ============================================================================

function buildOptimalMoveTable(): Map<string, string> {
  const goal = "1111";
  const table = new Map<string, string>();

  const safeStates: string[] = [];
  for (let bits = 0; bits < 16; bits++) {
    const items = [(bits >> 3) & 1, (bits >> 2) & 1, (bits >> 1) & 1, bits & 1];
    const state = items.join("");
    if (isSafe(items) && state !== goal) safeStates.push(state);
  }

  for (const start of safeStates) {
    const startItems = start.split("").map(Number);
    const visited = new Set([start]);
    const queue: Array<{ items: number[]; firstMove: string }> = [];

    for (const { move, target } of getValidMoves(startItems)) {
      const key = target.join("");
      if (key === goal) { table.set(start, move.name); break; }
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ items: target, firstMove: move.name });
      }
    }
    if (table.has(start)) continue;

    while (queue.length > 0) {
      const { items: curr, firstMove } = queue.shift()!;
      for (const { target } of getValidMoves(curr)) {
        const key = target.join("");
        if (key === goal) { table.set(start, firstMove); break; }
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ items: target, firstMove });
        }
      }
      if (table.has(start)) break;
    }
  }

  return table;
}

const OPTIMAL_TABLE = buildOptimalMoveTable();

function getOptimalMove(items: number[], transitions: Record<string, string>): ProposerStrategyResult {
  const key = items.join("");
  const moveName = OPTIMAL_TABLE.get(key);
  if (!moveName) throw new Error(`No optimal move from "${key}"`);
  return {
    transitionName: moveName,
    toState: transitions[moveName],
    reasoning: `Optimal: ${moveName}`,
  };
}

// ============================================================================
// Strategy Functions (history-based)
// ============================================================================

const MACHINE_NAME = "river-crossing";

/** LLM Cautious — replays exemplar if available, else greedy heuristic. */
async function llmCautiousStrategy(ctx: ProposerContext): Promise<ProposerStrategyResult> {
  const items = replayMoves(ctx.history);

  if (isSolved(items)) {
    return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
  }

  // Check exemplars for matching board state
  const stateExemplars = getExemplars(MACHINE_NAME, "unsolved");
  for (const ex of [...stateExemplars].reverse()) {
    const exItems = replayMoves(ex.context.history);
    if (exItems.join("") === items.join("")) {
      return {
        transitionName: ex.humanTransitionName,
        toState: ctx.transitions[ex.humanTransitionName],
        reasoning: `Learned: replay ${ex.humanTransitionName}`,
      };
    }
  }

  // Greedy fallback: prefer taking items to right bank
  const transitionNames = Object.keys(ctx.transitions).filter((t) => t !== "declare_solved");
  if (items[0] === 0) {
    const withItem = transitionNames.filter((t) => t !== "cross_alone");
    if (withItem.length > 0) {
      return {
        transitionName: withItem[0],
        toState: ctx.transitions[withItem[0]],
        reasoning: `Greedy: ${withItem[0]} (move item right)`,
      };
    }
  }

  const chosen = transitionNames[0];
  return {
    transitionName: chosen,
    toState: ctx.transitions[chosen],
    reasoning: `Greedy: ${chosen} (first available)`,
  };
}

/** LLM Greedy — random valid move. */
async function llmGreedyStrategy(ctx: ProposerContext): Promise<ProposerStrategyResult> {
  const items = replayMoves(ctx.history);

  if (isSolved(items)) {
    return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
  }

  const transitionNames = Object.keys(ctx.transitions).filter((t) => t !== "declare_solved");
  const chosen = transitionNames[Math.floor(Math.random() * transitionNames.length)];
  return {
    transitionName: chosen,
    toState: ctx.transitions[chosen],
    reasoning: `Random: ${chosen}`,
  };
}

// ============================================================================
// Machine Definition (2-state, per-state specialists)
// ============================================================================

function buildRiverCrossingMachine(): MachineDefinition {
  // Compute valid transitions from each safe non-goal state
  const transitions: Record<string, string> = {};
  const startItems = [0, 0, 0, 0];
  for (const { move } of getValidMoves(startItems)) {
    transitions[move.name] = "unsolved";
  }
  // We need ALL possible moves since board is reconstructed from history.
  // Include all 4 moves — invalid ones are simply no-ops (strategy picks valid ones).
  const allTransitions: Record<string, string> = {};
  for (const move of MOVES) {
    allTransitions[move.name] = "unsolved";
  }
  allTransitions["declare_solved"] = "solved";

  return {
    machineName: MACHINE_NAME,
    initialState: "unsolved",
    goalState: "solved",
    states: {
      unsolved: {
        prompt: "River crossing: move all items (Farmer, Wolf, Goat, Cabbage) to right bank",
        transitions: allTransitions,
        specialists: [
          { role: "proposer", specialistId: "human-optimal", isHuman: true, disabled: true },
          { role: "proposer", specialistId: "llm-cautious" },
          { role: "proposer", specialistId: "llm-greedy" },
          { role: "arbiter", specialistId: "river-arbiter", strategyFnName: "alignmentMargin", threshold: 0.4 },
        ],
      },
      solved: {},
    },
  };
}

// ============================================================================
// Solve Loop (tick-based)
// ============================================================================

interface SolveResult {
  moves: number;
  humanDecisions: number;
  aiDecisions: number;
}

async function solvePuzzle(
  machine: MachineDefinition,
  training: boolean,
  verbose: boolean
): Promise<SolveResult> {
  const session = await createSession(machine);
  const proposerCount = getEnabledProposersForState(session).length;
  let humanDecisions = 0;
  let aiDecisions = 0;
  let moves = 0;
  let solicitedThisRound = 0;

  while (session.currentState !== "solved") {
    if (moves > 30) {
      if (verbose) console.log("      !! safety valve (>30 moves)");
      break;
    }

    const results = await tick();
    const r = results.find((t) => t.sessionId === session.sessionId);
    if (!r) break;

    if (r.status === "solicited") {
      solicitedThisRound++;

      if (training && solicitedThisRound >= proposerCount) {
        const items = replayMoves(session.history);
        const transitions = machine.states["unsolved"]?.transitions ?? {};

        if (isSolved(items)) {
          await submitArbitration({
            sessionId: session.sessionId,
            roundId: session.currentRoundId,
            specialistId: "human-optimal",
            transitionName: "declare_solved",
            reasoning: "Human: puzzle solved",
          });
        } else {
          const optimal = getOptimalMove(items, transitions);
          await submitArbitration({
            sessionId: session.sessionId,
            roundId: session.currentRoundId,
            specialistId: "human-optimal",
            transitionName: optimal.transitionName,
            reasoning: optimal.reasoning,
          });
        }
        humanDecisions++;
        moves++;
        solicitedThisRound = 0;
        if (verbose) {
          console.log(
            `      ${String(moves).padStart(2)}. ${formatItems(replayMoves(session.history.slice(0, -1)))} ─▸ ${formatItems(replayMoves(session.history))}  [TRAIN]`
          );
        }
      }
      continue;
    }

    solicitedThisRound = 0;

    if (r.status === "advanced") {
      moves++;
      aiDecisions++;
      if (verbose) {
        console.log(
          `      ${String(moves).padStart(2)}. ${formatItems(replayMoves(session.history.slice(0, -1)))} ─${r.transitionName!}─▸ ${formatItems(replayMoves(session.history))}  [AI]`
        );
      }
      continue;
    }

    if (r.status === "needs_human") {
      const items = replayMoves(session.history);
      const transitions = machine.states["unsolved"]?.transitions ?? {};

      if (isSolved(items)) {
        await submitArbitration({
          sessionId: session.sessionId,
          roundId: session.currentRoundId,
          specialistId: "human-optimal",
          transitionName: "declare_solved",
          reasoning: "Human: puzzle solved",
        });
      } else {
        const optimal = getOptimalMove(items, transitions);
        await submitArbitration({
          sessionId: session.sessionId,
          roundId: session.currentRoundId,
          specialistId: "human-optimal",
          transitionName: optimal.transitionName,
          reasoning: optimal.reasoning,
        });
      }
      humanDecisions++;
      moves++;
      if (verbose) {
        console.log(
          `      ${String(moves).padStart(2)}. ${formatItems(replayMoves(session.history.slice(0, -1)))} ─▸ ${formatItems(replayMoves(session.history))}  [HUMAN]`
        );
      }
    }
  }

  return { moves, humanDecisions, aiDecisions };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log("=== Wolf-Goat-Cabbage River Crossing — DIAL Progressive Collapse Demo ===\n");
  console.log("2-state machine with per-state specialists. Board reconstructed from history.\n");
  console.log("Specialists (on 'unsolved' state):");
  console.log("  human-optimal   forces BFS-optimal moves (isHuman=true, disabled)");
  console.log("  llm-cautious    learns from exemplars, greedy fallback (move items right)");
  console.log("  llm-greedy      random valid move (never learns)\n");
  console.log("Arbiter: alignmentMargin, threshold=0.4\n");

  const machine = buildRiverCrossingMachine();
  const TRAINING_ROUNDS = 3;
  const TOTAL_ROUNDS = 10;

  // Register specialists with custom strategyFn (not auto-registered by createSession)
  await registerProposer({
    specialistId: "human-optimal",
    machineName: MACHINE_NAME,
    isHuman: true,
    strategyFn: async (ctx) => {
      const items = replayMoves(ctx.history);
      if (isSolved(items)) return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
      return getOptimalMove(items, ctx.transitions);
    },
  });

  await registerProposer({
    specialistId: "llm-cautious",
    machineName: MACHINE_NAME,
    strategyFn: llmCautiousStrategy,
  });
  await registerProposer({
    specialistId: "llm-greedy",
    machineName: MACHINE_NAME,
    strategyFn: llmGreedyStrategy,
  });

  // Arbiter auto-registered by createSession (has strategyFnName: "alignmentMargin")

  // ── Phase 1: Training ────────────────────────────────────────────────
  console.log("─── Phase 1: Cold Start Training ──────────────────────────────────────");
  console.log("    Human forces all decisions. LLMs propose for alignment tracking.\n");

  const results: Array<{
    iteration: number;
    phase: string;
    moves: number;
    humanDecisions: number;
    aiDecisions: number;
    cautiousAlign: number;
    greedyAlign: number;
  }> = [];

  for (let i = 1; i <= TRAINING_ROUNDS; i++) {
    const verbose = i === 1;
    if (verbose) console.log(`    Solve #${i} (step-by-step):`);

    const r = await solvePuzzle(machine, true, verbose);
    const ca = getAlignmentScore("llm-cautious", MACHINE_NAME, "unsolved");
    const ga = getAlignmentScore("llm-greedy", MACHINE_NAME, "unsolved");

    results.push({ iteration: i, phase: "train", ...r, cautiousAlign: ca, greedyAlign: ga });

    console.log(
      `    #${String(i).padStart(2)}: ` +
        `${r.moves} moves, all human-forced  ` +
        `align: cautious=${ca.toFixed(3)} greedy=${ga.toFixed(3)}`
    );
  }

  // ── Phase 2: Guided Handoff ──────────────────────────────────────────
  console.log("\n─── Phase 2: Consensus Enabled ────────────────────────────────────────");
  console.log("    AI reaches consensus where possible. Human forces the rest.\n");

  for (let i = TRAINING_ROUNDS + 1; i <= TOTAL_ROUNDS; i++) {
    const verbose = i === TRAINING_ROUNDS + 1 || i === TOTAL_ROUNDS;
    if (verbose) console.log(`    Solve #${i} (step-by-step):`);

    const r = await solvePuzzle(machine, false, verbose);
    const ca = getAlignmentScore("llm-cautious", MACHINE_NAME, "unsolved");
    const ga = getAlignmentScore("llm-greedy", MACHINE_NAME, "unsolved");

    results.push({ iteration: i, phase: "live", ...r, cautiousAlign: ca, greedyAlign: ga });

    const pct = r.moves > 0 ? ((r.aiDecisions / r.moves) * 100).toFixed(0) : "0";
    console.log(
      `    #${String(i).padStart(2)}: ` +
        `${String(r.moves).padStart(2)} moves ` +
        `(human ${String(r.humanDecisions).padStart(2)}, AI ${String(r.aiDecisions).padStart(2)}) ` +
        `collapse ${pct.padStart(3)}%  ` +
        `align: cautious=${ca.toFixed(3)} greedy=${ga.toFixed(3)}`
    );
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log("\n─── Summary ───────────────────────────────────────────────────────────\n");

  const liveResults = results.filter((r) => r.phase === "live");
  const first = liveResults[0];
  const last = liveResults[liveResults.length - 1];

  if (first && last) {
    console.log(
      `  First live solve (#${first.iteration}): ` +
        `${first.humanDecisions} human, ${first.aiDecisions} AI (${first.moves} moves)`
    );
    console.log(
      `  Last solve  (#${last.iteration}): ` +
        `${last.humanDecisions} human, ${last.aiDecisions} AI (${last.moves} moves)`
    );
  }

  const totalH = results.reduce((s, r) => s + r.humanDecisions, 0);
  const totalA = results.reduce((s, r) => s + r.aiDecisions, 0);
  const totalM = results.reduce((s, r) => s + r.moves, 0);
  console.log(
    `\n  Total: ${totalM} moves across ${TOTAL_ROUNDS} solves ` +
      `(${totalH} human, ${totalA} AI)`
  );

  const records = getAllAlignmentRecords(MACHINE_NAME, "unsolved");
  console.log("\n  Final alignment (per-state: unsolved):");
  for (const r of records) {
    console.log(
      `    ${r.specialistId.padEnd(16)} ` +
        `${r.alignmentScore.toFixed(3)} (${r.matchingChoices}/${r.totalComparisons})`
    );
  }

  console.log();
  if (last && last.humanDecisions === 0 && last.moves === 7) {
    console.log("  ** FULL COLLAPSE: AI solves optimally (7 moves) with zero human intervention. **");
  } else if (last && last.humanDecisions === 0) {
    console.log(`  ** FULL COLLAPSE: AI solves autonomously (${last.moves} moves). **`);
  } else if (first && last && last.humanDecisions < first.humanDecisions) {
    console.log(`  ** PARTIAL COLLAPSE: human decisions ${first.humanDecisions} → ${last.humanDecisions}. **`);
  } else {
    console.log("  ** Collapse not yet achieved. **");
  }

  // ── Collapse Metrics ─────────────────────────────────────────────────
  console.log("\n─── Collapse Metrics ──────────────────────────────────────────────────\n");

  const metrics = getCollapseMetrics(MACHINE_NAME, "unsolved");
  console.log(
    `  Collapse ratio: ${(metrics.collapseRatio * 100).toFixed(1)}% overall, ` +
      `${(metrics.recentCollapseRatio * 100).toFixed(1)}% recent`
  );
  console.log(`  Avg consensus margin: ${metrics.averageConsensusMargin.toFixed(3)}`);

  if (metrics.signals.length > 0) {
    console.log("\n  Active signals:");
    for (const s of metrics.signals) {
      const icon = s.level === "action" ? "!!" : s.level === "warning" ? " !" : "  ";
      console.log(`    ${icon} [${s.code}] ${s.message}`);
    }
  }

  if (metrics.specialists.length > 0) {
    console.log("\n  Specialist win rates:");
    for (const s of metrics.specialists) {
      console.log(
        `    ${s.specialistId.padEnd(16)} ` +
          `align=${s.alignment.toFixed(3)}  ` +
          `wins=${s.winningProposals}/${s.totalProposals} ` +
          `(${(s.winRate * 100).toFixed(0)}%)`
      );
    }
  }
}

main().catch((err: unknown) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
