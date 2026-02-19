/**
 * river-crossing.ts — Wolf-Goat-Cabbage machine module
 *
 * Exports the machine definition and strategy functions.
 * Puzzle logic lives in river-crossing-puzzle.ts (browser-safe).
 */

import { getExemplars } from "dialai";
import type {
  MachineDefinition,
  ProposerContext,
  ProposerStrategyResult,
} from "dialai";
import type { MachineModule } from "./types.js";
import {
  replayMoves,
  isSolved,
  getOptimalMove,
  MOVES,
} from "./river-crossing-puzzle.js";

// Re-export puzzle helpers for convenience
export {
  ITEM_SHORT,
  ITEM_NAMES,
  MOVES,
  replayMoves,
  getValidMoves,
  isSafe,
  isSolved,
  formatItems,
  getOptimalMove,
} from "./river-crossing-puzzle.js";

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
};

export default riverCrossing;
