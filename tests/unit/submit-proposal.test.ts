import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerVoter,
  submitProposal,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

function twoOptionMachine(): MachineDefinition {
  return {
    machineName: "proposal-test",
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

describe("DIAL_056–DIAL_071: Proposal Submission", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_056: submits proposal via strategyFn invocation", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "proposal-test",
      strategyFnName: "firstAvailable",
    });

    const proposal = await submitProposal(session.sessionId, "p1", session.currentRoundId);

    expect(proposal.transitionName).toBe("approve");
    expect(proposal.toState).toBe("approved");
    expect(proposal.reasoning).toBeDefined();
  });

  test("DIAL_057: submits direct proposal with transitionName", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "proposal-test",
      strategyFnName: "firstAvailable",
    });

    const proposal = await submitProposal(
      session.sessionId,
      "p1",
      session.currentRoundId,
      "reject",
      "I think we should reject"
    );

    expect(proposal.transitionName).toBe("reject");
    expect(proposal.toState).toBe("rejected");
    expect(proposal.reasoning).toBe("I think we should reject");
  });

  test("DIAL_058: proposal gets unique proposalId", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "proposal-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "proposal-test",
      strategyFnName: "lastAvailable",
    });

    const a = await submitProposal(session.sessionId, "p1", session.currentRoundId);
    const b = await submitProposal(session.sessionId, "p2", session.currentRoundId);

    expect(a.proposalId).not.toBe(b.proposalId);
  });

  test("DIAL_060: proposal uses session's currentRoundId when roundId omitted", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "proposal-test",
      strategyFnName: "firstAvailable",
    });

    const proposal = await submitProposal(session.sessionId, "p1");

    expect(proposal.roundId).toBe(session.currentRoundId);
  });

  test("DIAL_065: proposal stores cost tracking fields", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "proposal-test",
      strategyFnName: "firstAvailable",
    });

    const proposal = await submitProposal(
      session.sessionId,
      "p1",
      session.currentRoundId,
      undefined,
      undefined,
      undefined,
      0.005,
      250,
      100,
      50
    );

    expect(proposal.costUSD).toBe(0.005);
    expect(proposal.latencyMsec).toBe(250);
    expect(proposal.numInputTokens).toBe(100);
    expect(proposal.numOutputTokens).toBe(50);
  });

  test("DIAL_066: proposal stores toState from transition definition", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "proposal-test",
      strategyFnName: "firstAvailable",
    });

    const proposal = await submitProposal(session.sessionId, "p1", session.currentRoundId);

    // firstAvailable picks "approve" -> "approved"
    expect(proposal.toState).toBe(
      session.machine.states[session.currentState].transitions![proposal.transitionName]
    );
  });

  test("DIAL_068: rejects proposal for non-existent session", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "proposal-test",
      strategyFnName: "firstAvailable",
    });

    await expect(
      submitProposal("nonexistent", "p1")
    ).rejects.toThrow("Session not found");
  });

  test("DIAL_069: rejects proposal from non-registered specialist", async () => {
    const session = await createSession(twoOptionMachine());

    await expect(
      submitProposal(session.sessionId, "unknown")
    ).rejects.toThrow("Specialist not found");
  });

  test("DIAL_070: rejects proposal from non-proposer specialist", async () => {
    const session = await createSession(twoOptionMachine());
    await registerVoter({
      specialistId: "v1",
      machineName: "proposal-test",
      strategyFnName: "preferA",
    });

    await expect(
      submitProposal(session.sessionId, "v1")
    ).rejects.toThrow("is not a proposer");
  });

  test("DIAL_071: rejects direct proposal for invalid transition", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "proposal-test",
      strategyFnName: "firstAvailable",
    });

    await expect(
      submitProposal(session.sessionId, "p1", session.currentRoundId, "nonexistent")
    ).rejects.toThrow('Invalid transition "nonexistent"');
  });
});
