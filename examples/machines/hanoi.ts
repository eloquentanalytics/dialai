/**
 * hanoi.ts — Tower of Hanoi machine module
 *
 * Exports the machine definition and strategy functions.
 * Puzzle logic lives in hanoi-puzzle.ts (browser-safe).
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
  getValidMoves,
  isSolved,
  getOptimalMove,
  PEG_NAMES,
} from "./hanoi-puzzle.js";

// Re-export puzzle helpers for convenience
export {
  PEG_NAMES,
  MOVES,
  replayMoves,
  getPegStacks,
  isMoveValid,
  getValidMoves,
  isSolved,
  formatDisks,
  getOptimalMove,
} from "./hanoi-puzzle.js";

// ============================================================================
// Strategy Functions
// ============================================================================

const MACHINE_NAME = "hanoi";

async function humanOptimalStrategy(ctx: ProposerContext): Promise<ProposerStrategyResult> {
  const disks = replayMoves(ctx.history);
  if (isSolved(disks)) {
    return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
  }
  return getOptimalMove(disks, ctx.transitions);
}

async function llmCarefulStrategy(ctx: ProposerContext): Promise<ProposerStrategyResult> {
  const disks = replayMoves(ctx.history);

  if (isSolved(disks)) {
    return { transitionName: "declare_solved", toState: ctx.transitions["declare_solved"], reasoning: "Solved" };
  }

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
      prompt: "Tower of Hanoi: move all 3 disks from peg A to peg C",
      transitions: {
        A_to_B: "unsolved", A_to_C: "unsolved",
        B_to_A: "unsolved", B_to_C: "unsolved",
        C_to_A: "unsolved", C_to_B: "unsolved",
        declare_solved: "solved",
      },
      specialists: [
        { role: "proposer", specialistId: "human-optimal", isHuman: true, disabled: true },
        { role: "proposer", specialistId: "llm-careful" },
        { role: "proposer", specialistId: "llm-random" },
        { role: "arbiter", specialistId: "hanoi-arbiter", strategyFnName: "aheadByK", threshold: 0.4 },
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
    "llm-random": llmRandomStrategy,
  },
};

export default hanoi;
