import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  evaluateConsensus,
  getSession,
  updateAlignment,
} from "../../src/dialai/index.js";
import type {
  MachineDefinition,
  ArbiterContext,
  ArbiterStrategyResult,
} from "../../src/dialai/types.js";

function twoOptionMachine(): MachineDefinition {
  return {
    machineName: "consensus-test",
    initialState: "pending",
    goalState: "approved",
    states: {
      pending: {
        prompt: "Approve or reject?",
        transitions: { approve: "approved", reject: "rejected" },
      },
      approved: {},
      rejected: {},
    },
  };
}

describe("DIAL_115–DIAL_127: Evaluate Consensus", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_115: requires arbiter registered", async () => {
    const session = await createSession(twoOptionMachine());

    await expect(evaluateConsensus(session.sessionId)).rejects.toThrow(
      "No arbiter registered for machine"
    );
  });

  test("DIAL_116: returns consensusReached=false with no proposals", async () => {
    const session = await createSession(twoOptionMachine());
    await registerArbiter({
      specialistId: "a1",
      machineName: "consensus-test",
      strategyFnName: "firstProposal",
    });

    const result = await evaluateConsensus(session.sessionId);

    expect(result.consensusReached).toBe(false);
  });

  test("DIAL_117: is read-only — does not execute transition", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "consensus-test",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "consensus-test",
      strategyFnName: "firstProposal",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
    });

    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);

    const updated = await getSession(session.sessionId);
    expect(updated.currentState).toBe("pending");
  });

  test("DIAL_118: returns winningProposalId when consensus reached", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "consensus-test",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "consensus-test",
      strategyFnName: "firstProposal",
    });

    const proposal = await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
    });

    const result = await evaluateConsensus(session.sessionId);

    expect(result.consensusReached).toBe(true);
    expect(result.winningProposalId).toBe(proposal.proposalId);
  });

  test("DIAL_119: returns reasoning explaining consensus decision", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "consensus-test",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "consensus-test",
      strategyFnName: "firstProposal",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
    });

    const result = await evaluateConsensus(session.sessionId);

    expect(result.reasoning).toBeDefined();
    expect(result.reasoning.length).toBeGreaterThan(0);
  });

  test("DIAL_125: builds alignment scores in arbiter context", async () => {
    const session = await createSession(twoOptionMachine());

    // Register a proposer and submit a proposal
    await registerProposer({
      specialistId: "p1",
      machineName: "consensus-test",
      strategyFnName: "firstAvailable",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
    });

    // Update alignment for p1 so it has a score
    updateAlignment("p1", "consensus-test", true);

    // Use a custom arbiter strategy to capture the context
    let capturedCtx: ArbiterContext | undefined;
    await registerArbiter({
      specialistId: "a1",
      machineName: "consensus-test",
      strategyFn: async (ctx: ArbiterContext): Promise<ArbiterStrategyResult> => {
        capturedCtx = ctx;
        return {
          consensusReached: false,
          reasoning: "Captured context",
        };
      },
    });

    await evaluateConsensus(session.sessionId);

    expect(capturedCtx).toBeDefined();
    expect(capturedCtx!.alignmentScores).toBeDefined();
    expect(capturedCtx!.alignmentScores!["p1"]).toBe(1.0);
  });

  test("DIAL_127: arbiter threshold defaults to 1 when not set", async () => {
    const session = await createSession(twoOptionMachine());

    await registerProposer({
      specialistId: "p1",
      machineName: "consensus-test",
      strategyFnName: "firstAvailable",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
    });

    // Register arbiter without threshold
    let capturedThreshold: number | undefined;
    await registerArbiter({
      specialistId: "a1",
      machineName: "consensus-test",
      strategyFn: async (ctx: ArbiterContext): Promise<ArbiterStrategyResult> => {
        capturedThreshold = ctx.threshold;
        return {
          consensusReached: false,
          reasoning: "Captured threshold",
        };
      },
    });

    await evaluateConsensus(session.sessionId);

    expect(capturedThreshold).toBe(1);
  });
});
