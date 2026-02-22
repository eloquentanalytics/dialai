/**
 * river-crossing.ts — Wolf-Goat-Cabbage machine module
 *
 * Contains machine definition, strategy functions, and all puzzle logic.
 */

import { getExemplars } from "dialai";
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

const ITEM_NAMES = ["Farmer", "Wolf", "Goat", "Cabbage"] as const;

interface Move {
  name: string;
  item: number | null;
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

function replayMoves(history: Array<{ transitionName: string }>): number[] {
  let items = [0, 0, 0, 0];
  for (const { transitionName } of history) {
    const move = MOVES.find((m) => m.name === transitionName);
    if (!move) continue;
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

function getOptimalMove(items: number[], transitions: Record<string, string>): { transitionName: string; toState: string; reasoning: string } {
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
// computeView
// ============================================================================

function computeView(session: Session): Record<string, unknown> {
  const items = replayMoves(session.history);
  const solved = isSolved(items);
  return { items, solved, itemNames: [...ITEM_NAMES] };
}

// ============================================================================
// Strategy Functions
// ============================================================================

const MACHINE_NAME = "river-crossing";

async function humanOptimalStrategy(ctx: ProposerContext): Promise<ProposerStrategyResult> {
  const items = replayMoves(ctx.history);
  if (isSolved(items)) {
    return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
  }
  return getOptimalMove(items, ctx.transitions);
}

async function llmCautiousStrategy(ctx: ProposerContext): Promise<ProposerStrategyResult> {
  const items = replayMoves(ctx.history);

  if (isSolved(items)) {
    return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
  }

  const stateExemplars = await getExemplars(MACHINE_NAME, "unsolved");
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
// Machine Definition
// ============================================================================

const allTransitions: Record<string, string> = {};
for (const move of MOVES) {
  allTransitions[move.name] = "unsolved";
}
allTransitions["declare_solved"] = "solved";

const definition: MachineDefinition = {
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
        { role: "arbiter", specialistId: "river-arbiter", strategyFnName: "aheadByK", threshold: 0.4 },
      ],
    },
    solved: {},
  },
};

// ============================================================================
// Module Export
// ============================================================================

const riverCrossing: MachineModule = {
  definition,
  strategies: {
    "human-optimal": humanOptimalStrategy,
    "llm-cautious": llmCautiousStrategy,
    "llm-greedy": llmGreedyStrategy,
  },
  computeView,
};

export default riverCrossing;
