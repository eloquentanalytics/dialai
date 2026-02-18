#!/usr/bin/env npx tsx
/**
 * hanoi.ts — Tower of Hanoi as a DIAL state machine
 *
 * Demonstrates progressive collapse: a "human" (optimal solver) trains two
 * mock-LLM proposers through repeated puzzle solves. Over iterations, the
 * AI specialists build alignment and progressively take over decisions.
 *
 * State encoding: 3 disks on 3 pegs (A=0, B=1, C=2).
 *   State string = position of disk0 (smallest), disk1 (medium), disk2 (largest).
 *   e.g. "000" = all on peg A, "222" = all on peg C (goal).
 *
 * Six moves always presented: A→B, A→C, B→A, B→C, C→A, C→B.
 *   Invalid moves (empty source peg, or larger-on-smaller) loop back to
 *   the same state — wasting a turn.
 *
 * Three specialists:
 *   "human-optimal"  — registered as human, forces optimal moves when
 *                       AI consensus fails. Uses BFS shortest path.
 *   "llm-careful"    — mock LLM that learns from exemplars: replays the
 *                       human's choice if the current state was seen before,
 *                       falls back to a greedy heuristic otherwise.
 *   "llm-impulsive"  — mock LLM that picks a random valid move every time.
 *
 * Usage:
 *   npx tsx examples/hanoi.ts
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
// Hanoi Puzzle Logic
// ============================================================================

const PEG_NAMES = ["A", "B", "C"] as const;

const MOVES = [
  { name: "A_to_B", from: 0, to: 1 },
  { name: "A_to_C", from: 0, to: 2 },
  { name: "B_to_A", from: 1, to: 0 },
  { name: "B_to_C", from: 1, to: 2 },
  { name: "C_to_A", from: 2, to: 0 },
  { name: "C_to_B", from: 2, to: 1 },
] as const;

type Move = (typeof MOVES)[number];

function parseState(state: string): number[] {
  return state.split("").map(Number);
}

function encodeState(disks: number[]): string {
  return disks.join("");
}

function getPegStacks(disks: number[]): number[][] {
  const pegs: number[][] = [[], [], []];
  for (let d = 0; d < disks.length; d++) {
    pegs[disks[d]].push(d);
  }
  for (const peg of pegs) {
    peg.sort((a, b) => a - b);
  }
  return pegs;
}

function isMoveValid(disks: number[], fromPeg: number, toPeg: number): boolean {
  const pegs = getPegStacks(disks);
  if (pegs[fromPeg].length === 0) return false;
  if (pegs[toPeg].length === 0) return true;
  return pegs[fromPeg][0] < pegs[toPeg][0];
}

function applyMove(state: string, fromPeg: number, toPeg: number): string {
  const disks = parseState(state);
  if (!isMoveValid(disks, fromPeg, toPeg)) return state;
  const pegs = getPegStacks(disks);
  const diskToMove = pegs[fromPeg][0];
  disks[diskToMove] = toPeg;
  return encodeState(disks);
}

function getValidMoves(state: string): Move[] {
  const disks = parseState(state);
  return MOVES.filter((m) => isMoveValid(disks, m.from, m.to));
}

function formatState(state: string): string {
  const disks = parseState(state);
  const pegs = getPegStacks(disks);
  const labels = ["s", "M", "L"];
  return PEG_NAMES.map(
    (name, i) => `${name}:[${pegs[i].map((d) => labels[d]).join("")}]`
  ).join(" ");
}

// ============================================================================
// Machine Definition Generator
// ============================================================================

function generateHanoiMachine(): MachineDefinition {
  const states: MachineDefinition["states"] = {};

  for (let d0 = 0; d0 < 3; d0++) {
    for (let d1 = 0; d1 < 3; d1++) {
      for (let d2 = 0; d2 < 3; d2++) {
        const state = `${d0}${d1}${d2}`;
        const transitions: Record<string, string> = {};
        for (const move of MOVES) {
          transitions[move.name] = applyMove(state, move.from, move.to);
        }
        const valid = getValidMoves(state).map((m) => m.name).join(", ");
        states[state] = {
          prompt:
            `Hanoi: move all disks A→C. ${formatState(state)}. ` +
            `Valid: ${valid || "none"}. Invalid moves waste a turn.`,
          transitions,
        };
      }
    }
  }

  states["222"] = {};

  return {
    machineName: "hanoi",
    initialState: "000",
    goalState: "222",
    states,
  };
}

// ============================================================================
// BFS Optimal Solver (the "human")
// ============================================================================

function buildOptimalMoveTable(): Map<string, string> {
  const goal = "222";
  const table = new Map<string, string>();

  const allStates: string[] = [];
  for (let d0 = 0; d0 < 3; d0++)
    for (let d1 = 0; d1 < 3; d1++)
      for (let d2 = 0; d2 < 3; d2++) allStates.push(`${d0}${d1}${d2}`);

  for (const start of allStates) {
    if (start === goal) continue;
    const visited = new Set<string>([start]);
    const queue: Array<{ state: string; firstMove: string }> = [];

    for (const move of MOVES) {
      const next = applyMove(start, move.from, move.to);
      if (next === start) continue;
      if (next === goal) { table.set(start, move.name); break; }
      if (!visited.has(next)) {
        visited.add(next);
        queue.push({ state: next, firstMove: move.name });
      }
    }
    if (table.has(start)) continue;

    while (queue.length > 0) {
      const { state: curr, firstMove } = queue.shift()!;
      for (const move of MOVES) {
        const next = applyMove(curr, move.from, move.to);
        if (next === curr) continue;
        if (next === goal) { table.set(start, firstMove); break; }
        if (!visited.has(next)) {
          visited.add(next);
          queue.push({ state: next, firstMove });
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

const MACHINE_NAME = "hanoi";

/**
 * "LLM Careful" — learns from exemplars. If the current state has a human
 * exemplar, replays the human's choice. Otherwise greedy heuristic.
 */
async function llmCarefulStrategy(
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

  // Greedy fallback: prefer moves to goal peg (C=2)
  const validMoves = getValidMoves(ctx.currentState);
  const toGoal = validMoves.filter((m) => m.to === 2);
  const chosen = toGoal.length > 0 ? toGoal[0] : validMoves[0];
  if (!chosen) {
    return {
      transitionName: MOVES[0].name,
      toState: ctx.transitions[MOVES[0].name],
      reasoning: "Greedy fallback: no valid moves",
    };
  }
  return {
    transitionName: chosen.name,
    toState: ctx.transitions[chosen.name],
    reasoning: `Greedy: ${PEG_NAMES[chosen.from]}→${PEG_NAMES[chosen.to]}`,
  };
}

/**
 * "LLM Impulsive" — random valid move every time.
 */
async function llmImpulsiveStrategy(
  ctx: ProposerContext
): Promise<ProposerStrategyResult> {
  const validMoves = getValidMoves(ctx.currentState);
  if (validMoves.length === 0) {
    return {
      transitionName: MOVES[0].name,
      toState: ctx.transitions[MOVES[0].name],
      reasoning: "Random: no valid moves",
    };
  }
  const chosen = validMoves[Math.floor(Math.random() * validMoves.length)];
  return {
    transitionName: chosen.name,
    toState: ctx.transitions[chosen.name],
    reasoning: `Random: ${PEG_NAMES[chosen.from]}→${PEG_NAMES[chosen.to]}`,
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

  while (session.currentState !== "222") {
    moves++;
    if (moves > 50) {
      if (verbose) console.log("      !! safety valve (>50 moves)");
      break;
    }

    const state = session.currentState;
    const transitions = machine.states[state]?.transitions ?? {};

    // LLMs propose
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "llm-careful",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "llm-impulsive",
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
  console.log("=== Tower of Hanoi — DIAL Progressive Collapse Demo ===\n");
  console.log("3 disks, 3 pegs. 6 moves per state (some invalid). Optimal: 7 moves.\n");
  console.log("Specialists:");
  console.log("  human-optimal   forces BFS-optimal moves (isHuman=true)");
  console.log("  llm-careful     learns from exemplars, greedy fallback");
  console.log("  llm-impulsive   random valid move (never learns)\n");
  console.log("Arbiter: aheadByK, threshold=0.4\n");

  const machine = generateHanoiMachine();
  const TRAINING_ROUNDS = 2;
  const TOTAL_ROUNDS = 10;

  // Register specialists (persist across sessions via global store)
  await registerProposer({
    specialistId: "human-optimal",
    machineName: MACHINE_NAME,
    isHuman: true,
    strategyFn: async (ctx) => getOptimalMove(ctx.currentState, ctx.transitions),
  });
  await registerProposer({
    specialistId: "llm-careful",
    machineName: MACHINE_NAME,
    strategyFn: llmCarefulStrategy,
  });
  await registerProposer({
    specialistId: "llm-impulsive",
    machineName: MACHINE_NAME,
    strategyFn: llmImpulsiveStrategy,
  });
  await registerArbiter({
    specialistId: "hanoi-arbiter",
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
    carefulAlign: number;
    impulsiveAlign: number;
  }> = [];

  for (let i = 1; i <= TRAINING_ROUNDS; i++) {
    const verbose = i === 1;
    if (verbose) console.log(`    Solve #${i} (step-by-step):`);

    const r = await solvePuzzle(machine, true, verbose);
    const ca = getAlignmentScore("llm-careful", MACHINE_NAME);
    const ia = getAlignmentScore("llm-impulsive", MACHINE_NAME);

    results.push({ iteration: i, phase: "train", ...r, carefulAlign: ca, impulsiveAlign: ia });

    console.log(
      `    #${String(i).padStart(2)}: ` +
        `${r.moves} moves, all human-forced  ` +
        `align: careful=${ca.toFixed(3)} impulsive=${ia.toFixed(3)}`
    );
  }

  // ── Phase 2: Guided Handoff ──────────────────────────────────────────
  console.log("\n─── Phase 2: Consensus Enabled ────────────────────────────────────────");
  console.log("    AI reaches consensus where possible. Human forces the rest.\n");

  for (let i = TRAINING_ROUNDS + 1; i <= TOTAL_ROUNDS; i++) {
    const verbose = i === TRAINING_ROUNDS + 1 || i === TOTAL_ROUNDS;
    if (verbose) console.log(`    Solve #${i} (step-by-step):`);

    const r = await solvePuzzle(machine, false, verbose);
    const ca = getAlignmentScore("llm-careful", MACHINE_NAME);
    const ia = getAlignmentScore("llm-impulsive", MACHINE_NAME);

    results.push({ iteration: i, phase: "live", ...r, carefulAlign: ca, impulsiveAlign: ia });

    const pct = r.moves > 0 ? ((r.aiDecisions / r.moves) * 100).toFixed(0) : "0";
    console.log(
      `    #${String(i).padStart(2)}: ` +
        `${String(r.moves).padStart(2)} moves ` +
        `(human ${String(r.humanDecisions).padStart(2)}, AI ${String(r.aiDecisions).padStart(2)}) ` +
        `collapse ${pct.padStart(3)}%  ` +
        `align: careful=${ca.toFixed(3)} impulsive=${ia.toFixed(3)}`
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
