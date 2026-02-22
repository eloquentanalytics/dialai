/**
 * hanoi.ts — Tower of Hanoi machine module
 *
 * Contains machine definition, strategy functions, and all puzzle logic.
 */

import { getExemplars, callLlm } from "dialai";
import type {
  MachineDefinition,
  ProposerContext,
  ProposerStrategyResult,
  Session,
} from "dialai";
import type { MachineModule } from "./types.js";

// ============================================================================
// Puzzle Logic
// ============================================================================

const DEFAULT_NUM_DISKS = 3;
const MAX_NUM_DISKS = 15;
const PEG_NAMES = ["A", "B", "C"] as const;

function getNumDisks(metaJson?: Record<string, unknown>): number {
  const raw = metaJson?.numDisks;
  if (typeof raw === "number" && raw >= 1 && raw <= MAX_NUM_DISKS) return Math.floor(raw);
  return DEFAULT_NUM_DISKS;
}

const MOVES = [
  { name: "A_to_B", from: 0, to: 1 },
  { name: "A_to_C", from: 0, to: 2 },
  { name: "B_to_A", from: 1, to: 0 },
  { name: "B_to_C", from: 1, to: 2 },
  { name: "C_to_A", from: 2, to: 0 },
  { name: "C_to_B", from: 2, to: 1 },
] as const;

type Move = (typeof MOVES)[number];

const MOVE_MAP: Map<string, Move> = new Map(MOVES.map((m) => [m.name, m]));

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

function replayMoves(history: Array<{ transitionName: string }>, numDisks: number): number[] {
  const disks: number[] = new Array(numDisks).fill(0) as number[];
  for (const { transitionName } of history) {
    const move = MOVE_MAP.get(transitionName);
    if (!move) continue;
    applyMoveToDisks(disks, move.from, move.to);
  }
  return disks;
}

function buildOptimalMoveTable(numDisks: number): Map<string, string> {
  const table = new Map<string, string>();
  const goal = "2".repeat(numDisks);
  const totalStates = 3 ** numDisks;

  for (let s = 0; s < totalStates; s++) {
    const state = s.toString(3).padStart(numDisks, "0");
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

const optimalTableCache = new Map<number, Map<string, string>>();

function getOptimalTable(numDisks: number): Map<string, string> {
  let table = optimalTableCache.get(numDisks);
  if (!table) {
    table = buildOptimalMoveTable(numDisks);
    optimalTableCache.set(numDisks, table);
  }
  return table;
}

function getOptimalMove(disks: number[], transitions: Record<string, string>, numDisks: number): { transitionName: string; toState: string; reasoning: string } {
  const stateKey = disks.join("");
  const moveName = getOptimalTable(numDisks).get(stateKey);
  if (!moveName) throw new Error(`No optimal move from "${stateKey}"`);
  return {
    transitionName: moveName,
    toState: transitions[moveName],
    reasoning: `Optimal: ${moveName}`,
  };
}

// ============================================================================
// computeView
// ============================================================================

function computeView(session: Session): Record<string, unknown> {
  const numDisks = getNumDisks(session.metaJson);
  const disks = replayMoves(session.history, numDisks);
  const pegs = getPegStacks(disks);
  const solved = isSolved(disks);
  return { pegs, solved, pegNames: [...PEG_NAMES], disks, numDisks };
}

// ============================================================================
// Strategy Functions
// ============================================================================

const MACHINE_NAME = "hanoi";

async function humanOptimalStrategy(ctx: ProposerContext): Promise<ProposerStrategyResult> {
  const numDisks = getNumDisks(ctx.metaJson);
  const disks = replayMoves(ctx.history, numDisks);
  if (isSolved(disks)) {
    return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
  }
  return getOptimalMove(disks, ctx.transitions, numDisks);
}

async function llmCarefulStrategy(ctx: ProposerContext): Promise<ProposerStrategyResult> {
  const numDisks = getNumDisks(ctx.metaJson);
  const disks = replayMoves(ctx.history, numDisks);

  if (isSolved(disks)) {
    return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
  }

  const stateExemplars = getExemplars(MACHINE_NAME, "unsolved");
  for (const ex of stateExemplars.reverse()) {
    const exDisks = replayMoves(ex.context.history, numDisks);
    if (exDisks.join("") === disks.join("")) {
      return {
        transitionName: ex.humanTransitionName,
        toState: ctx.transitions[ex.humanTransitionName],
        reasoning: `Learned: replay ${ex.humanTransitionName}`,
      };
    }
  }

  const valid = getValidMoves(disks);
  const toGoal = valid.filter((m) => m.to === 2);
  const chosen = toGoal.length > 0 ? toGoal[0] : valid[0];
  if (!chosen) {
    return { transitionName: "A_to_B", toState: ctx.transitions["A_to_B"], reasoning: "Greedy fallback" };
  }
  return {
    transitionName: chosen.name,
    toState: ctx.transitions[chosen.name],
    reasoning: `Greedy: ${PEG_NAMES[chosen.from]}->${PEG_NAMES[chosen.to]}`,
  };
}

async function llmGpt4oMiniStrategy(ctx: ProposerContext): Promise<ProposerStrategyResult> {
  const numDisks = getNumDisks(ctx.metaJson);
  const disks = replayMoves(ctx.history, numDisks);

  if (isSolved(disks)) {
    return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
  }

  const pegs = getPegStacks(disks);
  const pegDescription = PEG_NAMES.map((name, i) =>
    `Peg ${name}: [${pegs[i].map(d => `disk${d}`).join(", ")}]`
  ).join("\n");
  const validMoves = getValidMoves(disks).map(m => m.name).join(", ");

  // Build n-shot examples from exemplars
  const stateExemplars = getExemplars(MACHINE_NAME, "unsolved");
  let exemplarSection = "";
  if (stateExemplars.length > 0) {
    const shots = stateExemplars.map((ex) => {
      const exDisks = replayMoves(ex.context.history, numDisks);
      const exPegs = getPegStacks(exDisks);
      const exBoard = PEG_NAMES.map((name, i) =>
        `Peg ${name}: [${exPegs[i].map(d => `disk${d}`).join(", ")}]`
      ).join(", ");
      return `Board: ${exBoard} → Correct move: ${ex.humanTransitionName}`;
    });
    exemplarSection = `\n\nHere are examples of correct moves from previous games:\n${shots.join("\n")}`;
  }

  const systemMessage = "You are solving Tower of Hanoi. Move all disks from peg A to peg C. Smaller-numbered disks are smaller. A larger disk cannot be placed on a smaller one. Respond with ONLY a JSON object: {\"transitionName\": \"...\", \"toState\": \"...\", \"reasoning\": \"...\"}";
  const userMessage = `Current board:\n${pegDescription}\n\nValid moves: ${validMoves}\n\nAvailable transitions:\n${Object.entries(ctx.transitions).map(([name, target]) => `  "${name}" → "${target}"`).join("\n")}${exemplarSection}\n\nChoose the best move to make progress toward getting all disks to peg C.`;

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

async function llmRandomStrategy(ctx: ProposerContext): Promise<ProposerStrategyResult> {
  const numDisks = getNumDisks(ctx.metaJson);
  const disks = replayMoves(ctx.history, numDisks);

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
    reasoning: `Random: ${PEG_NAMES[chosen.from]}->${PEG_NAMES[chosen.to]}`,
  };
}

// ============================================================================
// Machine Definition
// ============================================================================

const definition: MachineDefinition = {
  machineName: MACHINE_NAME,
  initialState: "unsolved",
  goalState: "solved",
  states: {
    unsolved: {
      prompt: "Tower of Hanoi: move all disks from peg A to peg C",
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

// ============================================================================
// Module Export
// ============================================================================

const hanoi: MachineModule = {
  definition,
  strategies: {
    "human-optimal": humanOptimalStrategy,
    "llm-careful": llmCarefulStrategy,
    "llm-gpt4o-mini": llmGpt4oMiniStrategy,
    "llm-random": llmRandomStrategy,
  },
  computeView,
};

export default hanoi;
