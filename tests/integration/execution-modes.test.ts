/**
 * Integration Tests - Specialist Execution Modes
 * DIAL_300–DIAL_301
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerArbiter,
  submitProposal,
} from "../../src/dialai/index.js";
import type {
  MachineDefinition,
  ProposerContext,
  ProposerStrategyResult,
} from "../../src/dialai/types.js";

describe("Integration: Specialist Execution Modes", () => {
  beforeEach(() => {
    clear();
  });

  const machine: MachineDefinition = {
    machineName: "exec-modes",
    initialState: "start",
    goalState: "end",
    states: {
      start: {
        prompt: "Choose a path",
        transitions: {
          go: "end",
        },
      },
      end: {},
    },
  };

  it("DIAL_300: strategyFnName resolves to built-in and executes", async () => {
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "builtin-proposer",
      machineName: "exec-modes",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "exec-modes",
      strategyFnName: "firstProposal",
    });

    // submitProposal without transitionName invokes the built-in strategy
    const proposal = await submitProposal({
      sessionId: session.sessionId,
      specialistId: "builtin-proposer",
      roundId: session.currentRoundId,
    });

    expect(proposal.transitionName).toBe("go");
    expect(proposal.toState).toBe("end");
    expect(proposal.reasoning).toContain("first available");
  });

  it("DIAL_301: contextFn return value is accessible via custom strategyFn", async () => {
    const capturedContexts: ProposerContext[] = [];

    const session = await createSession(machine);

    await registerProposer({
      specialistId: "ctx-proposer",
      machineName: "exec-modes",
      strategyFn: async (ctx: ProposerContext): Promise<ProposerStrategyResult> => {
        capturedContexts.push(ctx);
        const transitionName = Object.keys(ctx.transitions)[0];
        return {
          transitionName,
          toState: ctx.transitions[transitionName],
          reasoning: "Custom strategy with context capture",
        };
      },
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "exec-modes",
      strategyFnName: "firstProposal",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "ctx-proposer",
      roundId: session.currentRoundId,
    });

    expect(capturedContexts).toHaveLength(1);
    const ctx = capturedContexts[0];
    expect(ctx.sessionId).toBe(session.sessionId);
    expect(ctx.currentState).toBe("start");
    expect(ctx.prompt).toBe("Choose a path");
    expect(ctx.transitions).toEqual({ go: "end" });
    expect(ctx.history).toEqual([]);
  });
});
