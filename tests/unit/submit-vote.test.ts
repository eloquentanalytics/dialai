import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerVoter,
  submitProposal,
  submitVote,
} from "../../src/dialai/index.js";
import type { MachineDefinition, VoteChoice } from "../../src/dialai/types.js";

function twoOptionMachine(): MachineDefinition {
  return {
    machineName: "vote-test",
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

async function setupWithProposals() {
  const session = await createSession(twoOptionMachine());
  await registerProposer({
    specialistId: "p1",
    machineName: "vote-test",
    strategyFnName: "firstAvailable",
  });
  await registerProposer({
    specialistId: "p2",
    machineName: "vote-test",
    strategyFnName: "lastAvailable",
  });

  const propA = await submitProposal(session.sessionId, "p1", session.currentRoundId);
  const propB = await submitProposal(session.sessionId, "p2", session.currentRoundId);

  return { session, propA, propB };
}

describe("DIAL_072–DIAL_088: Vote Submission", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_072: submits vote via strategyFn invocation", async () => {
    const { session, propA, propB } = await setupWithProposals();
    await registerVoter({
      specialistId: "v1",
      machineName: "vote-test",
      strategyFnName: "preferA",
    });

    const vote = await submitVote(
      session.sessionId,
      "v1",
      session.currentRoundId,
      propA.proposalId,
      propB.proposalId
    );

    expect(vote.voteFor).toBe("A");
    expect(vote.reasoning).toBeDefined();
  });

  test("DIAL_073: submits direct vote with voteFor", async () => {
    const { session, propA, propB } = await setupWithProposals();
    await registerVoter({
      specialistId: "v1",
      machineName: "vote-test",
      strategyFnName: "preferA",
    });

    const vote = await submitVote(
      session.sessionId,
      "v1",
      session.currentRoundId,
      propA.proposalId,
      propB.proposalId,
      "A",
      "I prefer proposal A"
    );

    expect(vote.voteFor).toBe("A");
    expect(vote.reasoning).toBe("I prefer proposal A");
  });

  test("DIAL_074: accepts all valid voteFor values", async () => {
    const validChoices: VoteChoice[] = ["A", "B", "BOTH", "NEITHER"];

    for (let i = 0; i < validChoices.length; i++) {
      clear();
      const { session, propA, propB } = await setupWithProposals();
      await registerVoter({
        specialistId: "v1",
        machineName: "vote-test",
        strategyFnName: "preferA",
      });

      const vote = await submitVote(
        session.sessionId,
        "v1",
        session.currentRoundId,
        propA.proposalId,
        propB.proposalId,
        validChoices[i]
      );

      expect(vote.voteFor).toBe(validChoices[i]);
    }
  });

  test("DIAL_078: vote gets unique voteId", async () => {
    const { session, propA, propB } = await setupWithProposals();
    await registerVoter({
      specialistId: "v1",
      machineName: "vote-test",
      strategyFnName: "preferA",
    });
    await registerVoter({
      specialistId: "v2",
      machineName: "vote-test",
      strategyFnName: "preferB",
    });

    const voteA = await submitVote(
      session.sessionId, "v1", session.currentRoundId,
      propA.proposalId, propB.proposalId
    );
    const voteB = await submitVote(
      session.sessionId, "v2", session.currentRoundId,
      propA.proposalId, propB.proposalId
    );

    expect(voteA.voteId).not.toBe(voteB.voteId);
  });

  test("DIAL_079: vote stores proposalIdA and proposalIdB", async () => {
    const { session, propA, propB } = await setupWithProposals();
    await registerVoter({
      specialistId: "v1",
      machineName: "vote-test",
      strategyFnName: "preferA",
    });

    const vote = await submitVote(
      session.sessionId, "v1", session.currentRoundId,
      propA.proposalId, propB.proposalId
    );

    expect(vote.proposalIdA).toBe(propA.proposalId);
    expect(vote.proposalIdB).toBe(propB.proposalId);
  });

  test("DIAL_083: vote stores cost tracking fields", async () => {
    const { session, propA, propB } = await setupWithProposals();
    await registerVoter({
      specialistId: "v1",
      machineName: "vote-test",
      strategyFnName: "preferA",
    });

    const vote = await submitVote(
      session.sessionId, "v1", session.currentRoundId,
      propA.proposalId, propB.proposalId,
      "A", "test",
      undefined,
      0.003, 150, 80, 30
    );

    expect(vote.costUSD).toBe(0.003);
    expect(vote.latencyMsec).toBe(150);
    expect(vote.numInputTokens).toBe(80);
    expect(vote.numOutputTokens).toBe(30);
  });

  test("DIAL_084: strategyFn receives correct VoterContext", async () => {
    const { session, propA, propB } = await setupWithProposals();
    let receivedCtx: unknown;

    await registerVoter({
      specialistId: "v1",
      machineName: "vote-test",
      strategyFn: async (ctx) => {
        receivedCtx = ctx;
        return { voteFor: "A" as const, reasoning: "test" };
      },
    });

    await submitVote(
      session.sessionId, "v1", session.currentRoundId,
      propA.proposalId, propB.proposalId
    );

    const ctx = receivedCtx as Record<string, unknown>;
    expect(ctx.sessionId).toBe(session.sessionId);
    expect(ctx.currentState).toBe("pending");
    expect(ctx.prompt).toBe("Approve or reject?");
    expect(ctx.proposalA).toBeDefined();
    expect(ctx.proposalB).toBeDefined();
    expect(ctx.history).toBeDefined();
  });

  test("DIAL_087: rejects vote from non-voter specialist", async () => {
    const { session, propA, propB } = await setupWithProposals();

    await expect(
      submitVote(
        session.sessionId, "p1", session.currentRoundId,
        propA.proposalId, propB.proposalId
      )
    ).rejects.toThrow("is not a voter");
  });

  test("DIAL_088: rejects vote with missing proposalIdA or proposalIdB", async () => {
    const session = await createSession(twoOptionMachine());
    await registerVoter({
      specialistId: "v1",
      machineName: "vote-test",
      strategyFnName: "preferA",
    });

    await expect(
      submitVote(session.sessionId, "v1", session.currentRoundId)
    ).rejects.toThrow("Both proposalIdA and proposalIdB are required");
  });
});
