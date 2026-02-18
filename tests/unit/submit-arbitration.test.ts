import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  submitArbitration,
  getSession,
  getExemplars,
  getAllAlignmentRecords,
} from "../../src/dialai/index.js";
import type {
  MachineDefinition,
  ArbiterContext,
  ArbiterStrategyResult,
} from "../../src/dialai/types.js";

function twoOptionMachine(): MachineDefinition {
  return {
    machineName: "arbitration-test",
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

describe("DIAL_128–DIAL_142: Submit Arbitration", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_128: evaluates consensus and executes transition when reached", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "firstProposal",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
    });

    expect(result.executed).toBe(true);
    expect(result.guardsPass).toBe(true);
    expect(result.transitionName).toBe("approve");
    expect(result.toState).toBe("approved");

    const updated = await getSession(session.sessionId);
    expect(updated.currentState).toBe("approved");
  });

  test("DIAL_129: returns executed=false when consensus not reached", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "arbitration-test",
      strategyFnName: "lastAvailable",
    });
    // Use aheadByK which requires alignment data — cold start will deny consensus
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "aheadByK",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p2",
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
    });

    expect(result.executed).toBe(false);
    expect(result.guardsPass).toBe(false);
  });

  test("DIAL_130: returns stale=true when roundId doesn't match", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "firstProposal",
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
      roundId: "stale-round-id",
    });

    expect(result.stale).toBe(true);
    expect(result.guardsPass).toBe(false);
  });

  test("DIAL_131: returns guardsPass=false when no proposals exist", async () => {
    const session = await createSession(twoOptionMachine());
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "firstProposal",
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
    });

    expect(result.guardsPass).toBe(false);
    expect(result.guardReason).toBe("No proposals in current round");
  });

  test("DIAL_132: human can force transition via transitionName", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "human1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "firstProposal",
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
      specialistId: "human1",
      transitionName: "reject",
      reasoning: "Human says reject",
    });

    expect(result.executed).toBe(true);
    expect(result.guardsPass).toBe(true);
    expect(result.transitionName).toBe("reject");
    expect(result.toState).toBe("rejected");
    expect(result.isHuman).toBe(true);
  });

  test("DIAL_133: forced transition requires isHuman specialist", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "bot1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "firstProposal",
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
      specialistId: "bot1",
      transitionName: "reject",
    });

    expect(result.guardsPass).toBe(false);
    expect(result.guardReason).toBe(
      "Only human specialists can force arbitration"
    );
  });

  test("DIAL_134: forced transition validates transition is valid", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "human1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "firstProposal",
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
      specialistId: "human1",
      transitionName: "nonexistent",
    });

    expect(result.guardsPass).toBe(false);
  });

  test("DIAL_135: forced transition creates exemplar", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "human1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "firstProposal",
    });

    await submitArbitration({
      sessionId: session.sessionId,
      specialistId: "human1",
      transitionName: "approve",
      reasoning: "Human chose approve",
    });

    const exemplarList = getExemplars("arbitration-test");
    expect(exemplarList.length).toBeGreaterThanOrEqual(1);
    expect(exemplarList[0].humanTransitionName).toBe("approve");
  });

  test("DIAL_136: forced transition updates alignment for all specialists", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "human1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerProposer({
      specialistId: "bot1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "firstProposal",
    });

    // Bot submits a proposal before the human forces
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "bot1",
    });

    await submitArbitration({
      sessionId: session.sessionId,
      specialistId: "human1",
      transitionName: "approve",
      reasoning: "Human chose approve",
    });

    const records = getAllAlignmentRecords("arbitration-test");
    expect(records.length).toBeGreaterThanOrEqual(1);
    // bot1 proposed "approve" (firstAvailable), human chose "approve" => matched
    const bot1Record = records.find((r) => r.specialistId === "bot1");
    expect(bot1Record).toBeDefined();
    expect(bot1Record!.totalComparisons).toBe(1);
  });

  test("DIAL_137: forced transition executes immediately", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "human1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "firstProposal",
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
      specialistId: "human1",
      transitionName: "reject",
    });

    expect(result.executed).toBe(true);

    const updated = await getSession(session.sessionId);
    expect(updated.currentState).toBe("rejected");
  });

  test("DIAL_138: returns isHuman=true for human-forced decisions", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "human1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "firstProposal",
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
      specialistId: "human1",
      transitionName: "approve",
    });

    expect(result.isHuman).toBe(true);
  });

  test("DIAL_139: returns all cost tracking fields", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "firstProposal",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
      costUSD: 0.01,
      latencyMsec: 500,
      numInputTokens: 200,
      numOutputTokens: 100,
    });

    expect(result.arbitrationId).toBeDefined();
    expect(result.costUSD).toBe(0.01);
    expect(result.latencyMsec).toBe(500);
    expect(result.numInputTokens).toBe(200);
    expect(result.numOutputTokens).toBe(100);
  });

  test("DIAL_140: returns guardReason explaining why guards failed", async () => {
    const session = await createSession(twoOptionMachine());
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "firstProposal",
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
    });

    expect(result.guardsPass).toBe(false);
    expect(result.guardReason).toBeDefined();
    expect(result.guardReason.length).toBeGreaterThan(0);
  });

  test("DIAL_141: winning proposal not found returns guardsPass=false", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
    });

    // Custom arbiter that returns a non-existent winningProposalId
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFn: async (_ctx: ArbiterContext): Promise<ArbiterStrategyResult> => ({
        consensusReached: true,
        winningProposalId: "non-existent-proposal-id",
        reasoning: "Fake consensus with bad proposal ID",
      }),
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
    });

    expect(result.guardsPass).toBe(false);
    expect(result.guardReason).toContain("Winning proposal not found");
  });

  test("DIAL_142: uses winning proposal's reasoning when no reasoning provided", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "arbitration-test",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "a1",
      machineName: "arbitration-test",
      strategyFnName: "firstProposal",
    });

    const proposal = await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
      reasoning: "I chose to approve because it is correct",
    });

    // Submit arbitration without reasoning — should use proposal's reasoning
    const result = await submitArbitration({
      sessionId: session.sessionId,
    });

    expect(result.executed).toBe(true);
    expect(result.reasoning).toBe(proposal.reasoning);
  });
});
