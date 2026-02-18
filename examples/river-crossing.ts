#!/usr/bin/env npx tsx
/**
 * river-crossing.ts — Wolf-Goat-Cabbage as a DIAL state machine
 *
 * Demonstrates progressive collapse with constraint reasoning: a "human"
 * (optimal solver) trains two mock-LLM proposers through repeated puzzle
 * solves. The key insight — bringing the goat back — defeats greedy
 * heuristics, making human training more dramatic than Hanoi.
 *
 * State encoding: 4-char string "FWGC" where each char is 0 (left) or 1 (right).
 *   F=Farmer, W=Wolf, G=Goat, C=Cabbage.
 *   e.g. "0000" = all on left (start), "1111" = all on right (goal).
 *
 * Safety rules (when farmer is away):
 *   Wolf + Goat on same side without Farmer → wolf eats goat
 *   Goat + Cabbage on same side without Farmer → goat eats cabbage
 *
 * Four moves (farmer always crosses):
 *   cross_alone  — farmer only
 *   take_wolf    — farmer + wolf (wolf must be on farmer's side)
 *   take_goat    — farmer + goat (goat must be on farmer's side)
 *   take_cabbage — farmer + cabbage (cabbage must be on farmer's side)
 *
 * Only moves producing safe states are valid transitions.
 *
 * Optimal solution (7 moves):
 *   0000 →take_goat→ 1010 →cross_alone→ 0010 →take_wolf→ 1110
 *   →take_goat→ 0100 →take_cabbage→ 1101 →cross_alone→ 0101 →take_goat→ 1111
 *
 * Three specialists:
 *   "human-optimal"  — registered as human, forces optimal moves via BFS.
 *   "llm-cautious"   — learns from exemplars; greedy fallback prefers
 *                       moving items right (fails at bring-goat-back step).
 *   "llm-greedy"     — random valid move every time (never learns).
 *
 * Usage:
 *   npx tsx examples/river-crossing.ts
 */

import {
  createSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  submitArbitration,
  evaluateConsensus,
  getAlignmentScore,
  getAllAlignmentRecords,
  getExemplars,
  getCollapseMetrics,
} from "../src/dialai/index.js";
import type {
  MachineDefinition,
  ProposerContext,
  ProposerStrategyResult,
} from "../src/dialai/index.js";

// ============================================================================
// Puzzle Logic
// ============================================================================

const ITEM_SHORT = ["F", "W", "G", "C"] as const;

interface Move {
  name: string;
  item: number | null; // index in FWGC array, null = farmer only
}

const MOVES: Move[] = [
  { name: "cross_alone", item: null },
  { name: "take_wolf", item: 1 },
  { name: "take_goat", item: 2 },
  { name: "take_cabbage", item: 3 },
];

function parseState(state: string): number[] {
  return state.split("").map(Number);
}

function encodeState(items: number[]): string {
  return items.join("");
}

/**
 * A state is safe if, when the farmer is away from a group,
 * wolf+goat aren't alone together and goat+cabbage aren't alone together.
 */
function isSafe(state: string): boolean {
  const [f, w, g, c] = parseState(state);
  // Wolf eats goat if on same side without farmer
  if (w === g && f !== w) return false;
  // Goat eats cabbage if on same side without farmer
  if (g === c && f !== g) return false;
  return true;
}

/**
 * Apply a move to a state. Returns new state or null if invalid/unsafe.
 * The farmer always crosses. If an item is specified, it must be on the
 * farmer's current side.
 */
function applyMove(state: string, move: Move): string | null {
  const items = parseState(state);
  const farmerSide = items[0];

  // If taking an item, it must be on the farmer's current side
  if (move.item !== null && items[move.item] !== farmerSide) return null;

  // Farmer crosses
  items[0] = 1 - farmerSide;
  // Item crosses (if any)
  if (move.item !== null) items[move.item] = 1 - farmerSide;

  const newState = encodeState(items);
  return isSafe(newState) ? newState : null;
}

/**
 * Get all valid moves from a state (only those producing safe states).
 */
function getValidMoves(state: string): Array<{ move: Move; target: string }> {
  const results: Array<{ move: Move; target: string }> = [];
  for (const move of MOVES) {
    const target = applyMove(state, move);
    if (target !== null) {
      results.push({ move, target });
    }
  }
  return results;
}

/**
 * Pretty-print a state: "L:[F,W,C] R:[G]"
 */
function formatState(state: string): string {
  const items = parseState(state);
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (items[i] === 0) left.push(ITEM_SHORT[i]);
    else right.push(ITEM_SHORT[i]);
  }
  return `L:[${left.join(",")}] R:[${right.join(",")}]`;
}

// ============================================================================
// Machine Definition Generator
// ============================================================================

function generateRiverCrossingMachine(): MachineDefinition {
  const states: MachineDefinition["states"] = {};

  // Enumerate all 16 possible states (2^4 FWGC combinations)
  for (let bits = 0; bits < 16; bits++) {
    const state = [
      (bits >> 3) & 1,
      (bits >> 2) & 1,
      (bits >> 1) & 1,
      bits & 1,
    ].join("");

    // Skip unsafe states entirely — they can never be entered
    if (!isSafe(state)) continue;

    // Goal state is terminal
    if (state === "1111") {
      states[state] = {};
      continue;
    }

    const validMoves = getValidMoves(state);
    const transitions: Record<string, string> = {};
    for (const { move, target } of validMoves) {
      transitions[move.name] = target;
    }

    const moveNames = validMoves.map((v) => v.move.name).join(", ");
    states[state] = {
      prompt:
        `River crossing: move all to right bank. ${formatState(state)}. ` +
        `Valid: ${moveNames || "none"}.`,
      transitions,
    };
  }

  return {
    machineName: "river-crossing",
    initialState: "0000",
    goalState: "1111",
    states,
  };
}

// ============================================================================
// BFS Optimal Solver (the "human")
// ============================================================================

function buildOptimalMoveTable(): Map<string, string> {
  const goal = "1111";
  const table = new Map<string, string>();

  // Collect all safe, non-goal states
  const safeStates: string[] = [];
  for (let bits = 0; bits < 16; bits++) {
    const state = [
      (bits >> 3) & 1,
      (bits >> 2) & 1,
      (bits >> 1) & 1,
      bits & 1,
    ].join("");
    if (isSafe(state) && state !== goal) safeStates.push(state);
  }

  for (const start of safeStates) {
    const visited = new Set<string>([start]);
    const queue: Array<{ state: string; firstMove: string }> = [];

    for (const { move, target } of getValidMoves(start)) {
      if (target === goal) { table.set(start, move.name); break; }
      if (!visited.has(target)) {
        visited.add(target);
        queue.push({ state: target, firstMove: move.name });
      }
    }
    if (table.has(start)) continue;

    while (queue.length > 0) {
      const { state: curr, firstMove } = queue.shift()!;
      for (const { target } of getValidMoves(curr)) {
        if (target === goal) { table.set(start, firstMove); break; }
        if (!visited.has(target)) {
          visited.add(target);
          queue.push({ state: target, firstMove });
        }
      }
      if (table.has(start)) break;
    }
  }

  return table;
}

const OPTIMAL_TABLE = buildOptimalMoveTable();

function getOptimalMove(
  state: string,
  transitions: Record<string, string>
): ProposerStrategyResult {
  const moveName = OPTIMAL_TABLE.get(state);
  if (!moveName) throw new Error(`No optimal move from "${state}"`);
  return {
    transitionName: moveName,
    toState: transitions[moveName],
    reasoning: `Optimal: ${moveName}`,
  };
}

// ============================================================================
// Mock LLM Proposer Strategies
// ============================================================================

const MACHINE_NAME = "river-crossing";

/**
 * "LLM Cautious" — learns from exemplars. If the current state has a human
 * exemplar, replays the human's choice. Otherwise greedy heuristic that
 * prefers moving items to the right bank (toward goal).
 *
 * This heuristic intentionally fails at step 4 where you need to bring
 * the goat back — demonstrating why human training matters.
 */
async function llmCautiousStrategy(
  ctx: ProposerContext
): Promise<ProposerStrategyResult> {
  const stateExemplars = getExemplars(MACHINE_NAME, ctx.currentState);
  if (stateExemplars.length > 0) {
    const ex = stateExemplars[stateExemplars.length - 1];
    return {
      transitionName: ex.humanTransitionName,
      toState: ctx.transitions[ex.humanTransitionName],
      reasoning: `Learned: replay ${ex.humanTransitionName}`,
    };
  }

  // Greedy fallback: prefer moves that take items to the right bank
  const transitionNames = Object.keys(ctx.transitions);
  const items = parseState(ctx.currentState);
  const farmerSide = items[0];

  // "Move right" = farmer going from left(0) to right(1) with an item
  if (farmerSide === 0) {
    // Prefer taking an item over crossing alone
    const withItem = transitionNames.filter((t) => t !== "cross_alone");
    if (withItem.length > 0) {
      const chosen = withItem[0];
      return {
        transitionName: chosen,
        toState: ctx.transitions[chosen],
        reasoning: `Greedy: ${chosen} (move item right)`,
      };
    }
  }

  // If farmer is on right, or no "take" moves available, pick first transition
  const chosen = transitionNames[0];
  return {
    transitionName: chosen,
    toState: ctx.transitions[chosen],
    reasoning: `Greedy: ${chosen} (first available)`,
  };
}

/**
 * "LLM Greedy" — random valid move every time. Never learns.
 */
async function llmGreedyStrategy(
  ctx: ProposerContext
): Promise<ProposerStrategyResult> {
  const transitionNames = Object.keys(ctx.transitions);
  const chosen =
    transitionNames[Math.floor(Math.random() * transitionNames.length)];
  return {
    transitionName: chosen,
    toState: ctx.transitions[chosen],
    reasoning: `Random: ${chosen}`,
  };
}

// ============================================================================
// Solve Loop
// ============================================================================

interface SolveResult {
  moves: number;
  humanDecisions: number;
  aiDecisions: number;
}

/**
 * Solve the puzzle once.
 *
 * @param training - If true, human always forces (cold start training).
 *                   LLMs still propose so alignment is tracked.
 * @param verbose  - Print each step
 */
async function solvePuzzle(
  machine: MachineDefinition,
  training: boolean,
  verbose: boolean
): Promise<SolveResult> {
  const session = await createSession(machine);
  let humanDecisions = 0;
  let aiDecisions = 0;
  let moves = 0;

  while (session.currentState !== "1111") {
    moves++;
    if (moves > 30) {
      if (verbose) console.log("      !! safety valve (>30 moves)");
      break;
    }

    const state = session.currentState;
    const transitions = machine.states[state]?.transitions ?? {};

    // LLMs propose
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "llm-cautious",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "llm-greedy",
      roundId: session.currentRoundId,
    });

    // In training mode: skip consensus, human always forces
    if (!training) {
      const consensus = await evaluateConsensus(session.sessionId);
      if (consensus.consensusReached) {
        const result = await submitArbitration({
          sessionId: session.sessionId,
          roundId: session.currentRoundId,
        });
        if (result.executed) {
          aiDecisions++;
          if (verbose) {
            console.log(
              `      ${String(moves).padStart(2)}. ${formatState(state)} ` +
                `─${result.transitionName!}─▸ ${formatState(result.toState!)}  [AI]`
            );
          }
          continue;
        }
      }
    }

    // Human forces optimal move
    const optimal = getOptimalMove(state, transitions);
    const result = await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
      specialistId: "human-optimal",
      transitionName: optimal.transitionName,
      reasoning: optimal.reasoning,
    });

    humanDecisions++;
    if (verbose) {
      const tag = training ? "TRAIN" : "HUMAN";
      console.log(
        `      ${String(moves).padStart(2)}. ${formatState(state)} ` +
          `─${optimal.transitionName}─▸ ${formatState(result.toState!)}  [${tag}]`
      );
    }
  }

  return { moves, humanDecisions, aiDecisions };
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log("=== Wolf-Goat-Cabbage River Crossing — DIAL Progressive Collapse Demo ===\n");
  console.log("4 entities (FWGC), 4 moves per state (some invalid/unsafe). Optimal: 7 moves.\n");
  console.log("Specialists:");
  console.log("  human-optimal   forces BFS-optimal moves (isHuman=true)");
  console.log("  llm-cautious    learns from exemplars, greedy fallback (move items right)");
  console.log("  llm-greedy      random valid move (never learns)\n");
  console.log("Arbiter: aheadByK, threshold=0.4\n");

  const machine = generateRiverCrossingMachine();
  const TRAINING_ROUNDS = 3;
  const TOTAL_ROUNDS = 10;

  // Register specialists (persist across sessions via global store)
  await registerProposer({
    specialistId: "human-optimal",
    machineName: MACHINE_NAME,
    isHuman: true,
    strategyFn: async (ctx) => getOptimalMove(ctx.currentState, ctx.transitions),
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
  await registerArbiter({
    specialistId: "river-arbiter",
    machineName: MACHINE_NAME,
    strategyFnName: "aheadByK",
    threshold: 0.4,
  });

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
    const ca = getAlignmentScore("llm-cautious", MACHINE_NAME);
    const ga = getAlignmentScore("llm-greedy", MACHINE_NAME);

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
    const ca = getAlignmentScore("llm-cautious", MACHINE_NAME);
    const ga = getAlignmentScore("llm-greedy", MACHINE_NAME);

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

  const records = getAllAlignmentRecords(MACHINE_NAME);
  console.log("\n  Final alignment:");
  for (const r of records) {
    console.log(
      `    ${r.specialistId.padEnd(16)} ` +
        `${r.alignmentScore.toFixed(3)} (${r.matchingChoices}/${r.totalComparisons})`
    );
  }

  console.log();
  if (last && last.humanDecisions === 0 && last.moves === 7) {
    console.log(
      "  ** FULL COLLAPSE: AI solves optimally (7 moves) with zero human intervention. **"
    );
  } else if (last && last.humanDecisions === 0) {
    console.log(
      `  ** FULL COLLAPSE: AI solves autonomously (${last.moves} moves). **`
    );
  } else if (first && last && last.humanDecisions < first.humanDecisions) {
    console.log(
      `  ** PARTIAL COLLAPSE: human decisions ${first.humanDecisions} → ${last.humanDecisions}. **`
    );
  } else {
    console.log("  ** Collapse not yet achieved. **");
  }

  // ── Collapse Metrics ─────────────────────────────────────────────────
  console.log("\n─── Collapse Metrics ──────────────────────────────────────────────────\n");

  const metrics = getCollapseMetrics(MACHINE_NAME);
  console.log(
    `  Collapse ratio: ${(metrics.collapseRatio * 100).toFixed(1)}% overall, ` +
      `${(metrics.recentCollapseRatio * 100).toFixed(1)}% recent`
  );
  console.log(
    `  Avg consensus margin: ${metrics.averageConsensusMargin.toFixed(3)}`
  );

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
