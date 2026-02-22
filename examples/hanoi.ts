#!/usr/bin/env npx tsx
/**
 * hanoi.ts — Tower of Hanoi as a 2-state DIAL machine
 *
 * Demonstrates progressive collapse with per-state specialists.
 *
 * Machine design: 2 states — "unsolved" and "solved". All move transitions
 * loop back to "unsolved"; "declare_solved" goes to "solved". Puzzle state
 * is reconstructed from transition history.
 *
 * Three specialists (declared on the "unsolved" state):
 *   "human-optimal"  — isHuman, disabled at state level. Forces optimal
 *                       moves via submitArbitration when AI can't reach consensus.
 *   "llm-careful"    — reconstructs board from history, replays exemplar
 *                       choices or falls back to a greedy heuristic.
 *   "llm-random"     — random valid move from reconstructed board state.
 *
 * Arbiter: aheadByK, threshold=0.4 (declared on the state).
 *
 * Usage:
 *   npx tsx examples/hanoi.ts
 *   npx tsx examples/hanoi.ts --disks 4
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
  callLlm,
} from "../src/dialai/index.js";
import type {
  MachineDefinition,
  TransitionRecord,
  ProposerContext,
  ProposerStrategyResult,
} from "../src/dialai/index.js";

// ============================================================================
// Configuration
// ============================================================================

const disksArg = process.argv.findIndex((a) => a === "--disks");
const NUM_DISKS = Math.max(1, Math.min(15, disksArg >= 0 ? parseInt(process.argv[disksArg + 1] ?? "3", 10) || 3 : 3));
const OPTIMAL_MOVES = 2 ** NUM_DISKS - 1;

const delayArg = process.argv.findIndex((a) => a === "--delay");
const DELAY_MS = delayArg >= 0 ? (parseFloat(process.argv[delayArg + 1] ?? "0") * 1000) : 0;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ============================================================================
// Puzzle Logic (history-based)
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

const MOVE_MAP = new Map(MOVES.map((m) => [m.name, m]));

/** Replay transition history to reconstruct current disk positions. */
function replayMoves(history: TransitionRecord[]): number[] {
  const disks: number[] = new Array(NUM_DISKS).fill(0) as number[]; // all on peg A
  for (const { transitionName } of history) {
    const move = MOVE_MAP.get(transitionName);
    if (!move) continue; // skip declare_solved
    applyMoveToDisks(disks, move.from, move.to);
  }
  return disks;
}

function getPegStacks(disks: number[]): number[][] {
  const pegs: number[][] = [[], [], []];
  for (let d = 0; d < disks.length; d++) pegs[disks[d]].push(d);
  for (const peg of pegs) peg.sort((a, b) => a - b);
  return pegs;
}

function isMoveValid(disks: number[], fromPeg: number, toPeg: number): boolean {
  const pegs = getPegStacks(disks);
  if (pegs[fromPeg].length === 0) return false;
  if (pegs[toPeg].length === 0) return true;
  return pegs[fromPeg][0] < pegs[toPeg][0];
}

function applyMoveToDisks(disks: number[], fromPeg: number, toPeg: number): void {
  if (!isMoveValid(disks, fromPeg, toPeg)) return;
  const pegs = getPegStacks(disks);
  disks[pegs[fromPeg][0]] = toPeg;
}

function getValidMoves(disks: number[]): Move[] {
  return MOVES.filter((m) => isMoveValid(disks, m.from, m.to));
}

function isSolved(disks: number[]): boolean {
  return disks.every((d) => d === 2);
}

function formatDisks(disks: number[]): string {
  const pegs = getPegStacks(disks);
  return PEG_NAMES.map(
    (name, i) => `${name}:[${pegs[i].map((d) => String(d)).join("")}]`
  ).join(" ");
}

// ============================================================================
// Optimal Solver (the "human")
// ============================================================================

function buildOptimalMoveTable(): Map<string, string> {
  const table = new Map<string, string>();
  const goal = "2".repeat(NUM_DISKS);
  const totalStates = 3 ** NUM_DISKS;

  for (let s = 0; s < totalStates; s++) {
    const state = s.toString(3).padStart(NUM_DISKS, "0");
    if (state === goal) continue;
    const visited = new Set([state]);
    const queue: Array<{ state: string; firstMove: string }> = [];

    for (const move of MOVES) {
      const disks = state.split("").map(Number);
      if (!isMoveValid(disks, move.from, move.to)) continue;
      applyMoveToDisks(disks, move.from, move.to);
      const next = disks.join("");
      if (next === goal) { table.set(state, move.name); break; }
      if (!visited.has(next)) {
        visited.add(next);
        queue.push({ state: next, firstMove: move.name });
      }
    }
    if (table.has(state)) continue;

    while (queue.length > 0) {
      const { state: curr, firstMove } = queue.shift()!;
      for (const move of MOVES) {
        const disks = curr.split("").map(Number);
        if (!isMoveValid(disks, move.from, move.to)) continue;
        applyMoveToDisks(disks, move.from, move.to);
        const next = disks.join("");
        if (next === goal) { table.set(state, firstMove); break; }
        if (!visited.has(next)) {
          visited.add(next);
          queue.push({ state: next, firstMove });
        }
      }
      if (table.has(state)) break;
    }
  }
  return table;
}

const OPTIMAL_TABLE = buildOptimalMoveTable();

function getOptimalMove(disks: number[], transitions: Record<string, string>): ProposerStrategyResult {
  const stateKey = disks.join("");
  const moveName = OPTIMAL_TABLE.get(stateKey);
  if (!moveName) throw new Error(`No optimal move from "${stateKey}"`);
  return {
    transitionName: moveName,
    toState: transitions[moveName],
    reasoning: `Optimal: ${moveName}`,
  };
}

// ============================================================================
// Strategy Functions (history-based)
// ============================================================================

const MACHINE_NAME = "hanoi";

/** LLM Careful — replays exemplar if available, else greedy heuristic. */
async function llmCarefulStrategy(ctx: ProposerContext): Promise<ProposerStrategyResult> {
  const disks = replayMoves(ctx.history);

  if (isSolved(disks)) {
    return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
  }

  // Check exemplars for matching history length (proxy for board state)
  const stateExemplars = getExemplars(MACHINE_NAME, "unsolved");
  for (const ex of stateExemplars.reverse()) {
    const exDisks = replayMoves(ex.context.history);
    if (exDisks.join("") === disks.join("")) {
      return {
        transitionName: ex.humanTransitionName,
        toState: ctx.transitions[ex.humanTransitionName],
        reasoning: `Learned: replay ${ex.humanTransitionName}`,
      };
    }
  }

  // Greedy fallback: prefer moves toward goal peg (C=2)
  const valid = getValidMoves(disks);
  const toGoal = valid.filter((m) => m.to === 2);
  const chosen = toGoal.length > 0 ? toGoal[0] : valid[0];
  if (!chosen) {
    return { transitionName: "A_to_B", toState: ctx.transitions["A_to_B"], reasoning: "Greedy fallback" };
  }
  return {
    transitionName: chosen.name,
    toState: ctx.transitions[chosen.name],
    reasoning: `Greedy: ${PEG_NAMES[chosen.from]}→${PEG_NAMES[chosen.to]}`,
  };
}

/** LLM Random — random valid move from reconstructed board. */
async function llmRandomStrategy(ctx: ProposerContext): Promise<ProposerStrategyResult> {
  const disks = replayMoves(ctx.history);

  if (isSolved(disks)) {
    return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
  }

  const valid = getValidMoves(disks);
  if (valid.length === 0) {
    return { transitionName: "A_to_B", toState: ctx.transitions["A_to_B"], reasoning: "Random: no valid moves" };
  }
  const chosen = valid[Math.floor(Math.random() * valid.length)];
  return {
    transitionName: chosen.name,
    toState: ctx.transitions[chosen.name],
    reasoning: `Random: ${PEG_NAMES[chosen.from]}→${PEG_NAMES[chosen.to]}`,
  };
}

/** LLM GPT-4o-mini — calls OpenAI with n-shot exemplars, greedy fallback. */
async function llmGpt4oMiniStrategy(ctx: ProposerContext): Promise<ProposerStrategyResult> {
  const disks = replayMoves(ctx.history);

  if (isSolved(disks)) {
    return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
  }

  const pegs = getPegStacks(disks);
  const pegDescription = PEG_NAMES.map((name, i) =>
    `Peg ${name}: [${pegs[i].map(d => `disk${d}`).join(", ")}]`
  ).join("\n");
  const validMoveNames = getValidMoves(disks).map(m => m.name).join(", ");

  // Build n-shot examples from exemplars
  const stateExemplars = getExemplars(MACHINE_NAME, "unsolved");
  let exemplarSection = "";
  if (stateExemplars.length > 0) {
    const shots = stateExemplars.map((ex) => {
      const exDisks = replayMoves(ex.context.history);
      const exPegs = getPegStacks(exDisks);
      const exBoard = PEG_NAMES.map((name, i) =>
        `Peg ${name}: [${exPegs[i].map(d => `disk${d}`).join(", ")}]`
      ).join(", ");
      return `Board: ${exBoard} → Correct move: ${ex.humanTransitionName}`;
    });
    exemplarSection = `\n\nHere are examples of correct moves from previous games:\n${shots.join("\n")}`;
  }

  const systemMessage = "You are solving Tower of Hanoi. Move all disks from peg A to peg C. Smaller-numbered disks are smaller. A larger disk cannot be placed on a smaller one. Respond with ONLY a JSON object: {\"transitionName\": \"...\", \"toState\": \"...\", \"reasoning\": \"...\"}";
  const userMessage = `Current board:\n${pegDescription}\n\nValid moves: ${validMoveNames}\n\nAvailable transitions:\n${Object.entries(ctx.transitions).map(([name, target]) => `  "${name}" → "${target}"`).join("\n")}${exemplarSection}\n\nChoose the best move to make progress toward getting all disks to peg C.`;

  const result = await callLlm("openai/gpt-4o-mini", systemMessage, userMessage);
  const cleaned = result.content.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
  const parsed = JSON.parse(cleaned) as ProposerStrategyResult;
  if (!parsed.transitionName || !ctx.transitions[parsed.transitionName]) {
    throw new Error(`GPT-4o-mini returned invalid transition: ${parsed.transitionName}`);
  }
  return {
    transitionName: parsed.transitionName,
    toState: ctx.transitions[parsed.transitionName],
    reasoning: `GPT-4o-mini (${stateExemplars.length} exemplars): ${parsed.reasoning ?? parsed.transitionName}`,
  };
}

// ============================================================================
// Machine Definition (2-state, per-state specialists)
// ============================================================================

function buildHanoiMachine(): MachineDefinition {
  return {
    machineName: MACHINE_NAME,
    initialState: "unsolved",
    goalState: "solved",
    states: {
      unsolved: {
        prompt: `Tower of Hanoi: move all ${NUM_DISKS} disks from peg A to peg C`,
        transitions: {
          A_to_B: "unsolved", A_to_C: "unsolved",
          B_to_A: "unsolved", B_to_C: "unsolved",
          C_to_A: "unsolved", C_to_B: "unsolved",
          declare_solved: "solved",
        },
        specialists: [
          { role: "proposer", specialistId: "human-optimal", isHuman: true, disabled: true },
          { role: "proposer", specialistId: "llm-careful" },
          { role: "proposer", specialistId: "llm-gpt4o-mini" },
          { role: "proposer", specialistId: "llm-random" },
          { role: "arbiter", specialistId: "hanoi-arbiter", strategyFnName: "aheadByK", threshold: 1.0 },
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
  const session = await createSession(machine, { numDisks: NUM_DISKS });
  const proposerCount = getEnabledProposersForState(session).length;
  let humanDecisions = 0;
  let aiDecisions = 0;
  let moves = 0;
  let solicitedThisRound = 0;

  while (session.currentState !== "solved") {
    if (moves > 4 * OPTIMAL_MOVES) {
      if (verbose) console.log(`      !! safety valve (>${4 * OPTIMAL_MOVES} moves)`);
      break;
    }

    const results = await tick();
    const r = results.find((t) => t.sessionId === session.sessionId);
    if (!r) break;

    if (r.status === "solicited") {
      solicitedThisRound++;

      if (training && solicitedThisRound >= proposerCount) {
        const disks = replayMoves(session.history);
        const transitions = machine.states["unsolved"]?.transitions ?? {};

        if (isSolved(disks)) {
          await submitArbitration({
            sessionId: session.sessionId,
            roundId: session.currentRoundId,
            specialistId: "human-optimal",
            transitionName: "declare_solved",
            reasoning: "Human: puzzle solved",
          });
        } else {
          const optimal = getOptimalMove(disks, transitions);
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
            `      ${String(moves).padStart(2)}. ${formatDisks(replayMoves(session.history.slice(0, -1)))} ─▸ ${formatDisks(replayMoves(session.history))}  [TRAIN]`
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
          `      ${String(moves).padStart(2)}. ${formatDisks(replayMoves(session.history.slice(0, -1)))} ─${r.transitionName!}─▸ ${formatDisks(replayMoves(session.history))}  [AI]`
        );
      }
      continue;
    }

    if (r.status === "needs_human") {
      const disks = replayMoves(session.history);
      const transitions = machine.states["unsolved"]?.transitions ?? {};

      if (isSolved(disks)) {
        await submitArbitration({
          sessionId: session.sessionId,
          roundId: session.currentRoundId,
          specialistId: "human-optimal",
          transitionName: "declare_solved",
          reasoning: "Human: puzzle solved",
        });
      } else {
        const optimal = getOptimalMove(disks, transitions);
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
          `      ${String(moves).padStart(2)}. ${formatDisks(replayMoves(session.history.slice(0, -1)))} ─▸ ${formatDisks(replayMoves(session.history))}  [HUMAN]`
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
  console.log(`=== Tower of Hanoi (${NUM_DISKS} disks) — DIAL Progressive Collapse Demo ===\n`);
  console.log(`2-state machine with per-state specialists. Board reconstructed from history. Optimal: ${OPTIMAL_MOVES} moves.\n`);
  console.log("Specialists (on 'unsolved' state):");
  console.log("  human-optimal   forces BFS-optimal moves (isHuman=true, disabled)");
  console.log("  llm-careful     learns from exemplars, greedy fallback");
  console.log("  llm-gpt4o-mini  GPT-4o-mini with n-shot exemplars");
  console.log("  llm-random      random valid move (never learns)\n");
  console.log("Arbiter: aheadByK, threshold=1.0\n");

  const machine = buildHanoiMachine();
  const TRAINING_ROUNDS = 2;
  const TOTAL_ROUNDS = 10;

  // Register specialists with custom strategyFn (not auto-registered by createSession)
  await registerProposer({
    specialistId: "human-optimal",
    machineName: MACHINE_NAME,
    isHuman: true,
    strategyFn: async (ctx) => {
      const disks = replayMoves(ctx.history);
      if (isSolved(disks)) return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
      return getOptimalMove(disks, ctx.transitions);
    },
  });

  await registerProposer({
    specialistId: "llm-careful",
    machineName: MACHINE_NAME,
    strategyFn: llmCarefulStrategy,
  });
  await registerProposer({
    specialistId: "llm-gpt4o-mini",
    machineName: MACHINE_NAME,
    strategyFn: llmGpt4oMiniStrategy,
  });
  await registerProposer({
    specialistId: "llm-random",
    machineName: MACHINE_NAME,
    strategyFn: llmRandomStrategy,
  });

  // Arbiter auto-registered by createSession (has strategyFnName: "aheadByK")

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
    gpt4oMiniAlign: number;
    randomAlign: number;
  }> = [];

  for (let i = 1; i <= TRAINING_ROUNDS; i++) {
    const verbose = i === 1;
    if (verbose) console.log(`    Solve #${i} (step-by-step):`);

    const r = await solvePuzzle(machine, true, verbose);
    const ca = getAlignmentScore("llm-careful", MACHINE_NAME, "unsolved");
    const ga = getAlignmentScore("llm-gpt4o-mini", MACHINE_NAME, "unsolved");
    const ra = getAlignmentScore("llm-random", MACHINE_NAME, "unsolved");

    results.push({ iteration: i, phase: "train", ...r, carefulAlign: ca, gpt4oMiniAlign: ga, randomAlign: ra });

    console.log(
      `    #${String(i).padStart(2)}: ` +
        `${r.moves} moves, all human-forced  ` +
        `align: careful=${ca.toFixed(3)} gpt4o-mini=${ga.toFixed(3)} random=${ra.toFixed(3)}`
    );
    if (DELAY_MS > 0 && i < TRAINING_ROUNDS) await sleep(DELAY_MS);
  }

  // ── Phase 2: Guided Handoff ──────────────────────────────────────────
  console.log("\n─── Phase 2: Consensus Enabled ────────────────────────────────────────");
  console.log("    AI reaches consensus where possible. Human forces the rest.\n");

  for (let i = TRAINING_ROUNDS + 1; i <= TOTAL_ROUNDS; i++) {
    const verbose = i === TRAINING_ROUNDS + 1 || i === TOTAL_ROUNDS;
    if (verbose) console.log(`    Solve #${i} (step-by-step):`);

    const r = await solvePuzzle(machine, false, verbose);
    const ca = getAlignmentScore("llm-careful", MACHINE_NAME, "unsolved");
    const ga = getAlignmentScore("llm-gpt4o-mini", MACHINE_NAME, "unsolved");
    const ra = getAlignmentScore("llm-random", MACHINE_NAME, "unsolved");

    results.push({ iteration: i, phase: "live", ...r, carefulAlign: ca, gpt4oMiniAlign: ga, randomAlign: ra });

    const pct = r.moves > 0 ? ((r.aiDecisions / r.moves) * 100).toFixed(0) : "0";
    console.log(
      `    #${String(i).padStart(2)}: ` +
        `${String(r.moves).padStart(2)} moves ` +
        `(human ${String(r.humanDecisions).padStart(2)}, AI ${String(r.aiDecisions).padStart(2)}) ` +
        `collapse ${pct.padStart(3)}%  ` +
        `align: careful=${ca.toFixed(3)} gpt4o-mini=${ga.toFixed(3)} random=${ra.toFixed(3)}`
    );
    if (DELAY_MS > 0 && i < TOTAL_ROUNDS) await sleep(DELAY_MS);
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
  if (last && last.humanDecisions === 0 && last.moves === OPTIMAL_MOVES) {
    console.log(`  ** FULL COLLAPSE: AI solves optimally (${OPTIMAL_MOVES} moves) with zero human intervention. **`);
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
