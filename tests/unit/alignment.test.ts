import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerVoter,
  submitProposal,
  submitVote,
  submitSelectionVote,
  getAlignmentScore,
  isHumanSpecialist,
  updateAlignment,
  updateAlignmentAfterHumanDecision,
  getAllAlignmentRecords,
  getProposalsForRound,
  getVotesForRound,
  getSelectionVotesForRound,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

function twoOptionMachine(): MachineDefinition {
  return {
    machineName: "align-test",
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

/** Seeds alignment by calling updateAlignment repeatedly. */
function seedAlignment(
  specialistId: string,
  machineName: string,
  matches: number,
  total: number
): void {
  for (let i = 0; i < matches; i++) updateAlignment(specialistId, machineName, true);
  for (let i = 0; i < total - matches; i++) updateAlignment(specialistId, machineName, false);
}

describe("DIAL_198–DIAL_211: Alignment Score Tracking", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_198: new AI specialist starts at alignment 0", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });

    expect(getAlignmentScore("p1", "align-test")).toBe(0);
  });

  test("DIAL_199: human specialist always returns alignment 1.0", async () => {
    await registerProposer({
      specialistId: "human1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });

    expect(getAlignmentScore("human1", "align-test")).toBe(1.0);
  });

  test("DIAL_200: isHumanSpecialist returns true for human-registered specialist", async () => {
    await registerProposer({
      specialistId: "human1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });

    expect(isHumanSpecialist("human1")).toBe(true);
  });

  test("DIAL_201: isHumanSpecialist returns false for unknown specialist", () => {
    expect(isHumanSpecialist("unknown")).toBe(false);
  });

  test("DIAL_202: updateAlignment increments matching choices", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });

    updateAlignment("p1", "align-test", true);

    const records = getAllAlignmentRecords("align-test");
    expect(records).toHaveLength(1);
    expect(records[0].matchingChoices).toBe(1);
    expect(records[0].totalComparisons).toBe(1);
  });

  test("DIAL_203: updateAlignment increments only totalComparisons on mismatch", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });

    updateAlignment("p1", "align-test", false);

    const records = getAllAlignmentRecords("align-test");
    expect(records[0].matchingChoices).toBe(0);
    expect(records[0].totalComparisons).toBe(1);
  });

  test("DIAL_204: updateAlignment creates new record for first comparison", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });

    expect(getAllAlignmentRecords("align-test")).toHaveLength(0);

    updateAlignment("p1", "align-test", true);

    const records = getAllAlignmentRecords("align-test");
    expect(records).toHaveLength(1);
    expect(records[0].specialistId).toBe("p1");
    expect(records[0].machineName).toBe("align-test");
    expect(records[0].lastUpdated).toBeInstanceOf(Date);
  });

  test("DIAL_205: updateAlignment skips human specialists", async () => {
    await registerProposer({
      specialistId: "human1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });

    updateAlignment("human1", "align-test", true);

    expect(getAllAlignmentRecords("align-test")).toHaveLength(0);
  });

  test("DIAL_206: alignment score is matchingChoices/totalComparisons", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });

    seedAlignment("p1", "align-test", 18, 20);

    expect(getAlignmentScore("p1", "align-test")).toBeCloseTo(0.9);
  });

  test("DIAL_207: updateAlignmentAfterHumanDecision checks proposers", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p-match",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p-miss",
      machineName: "align-test",
      strategyFnName: "lastAvailable",
    });

    // p-match proposes "approve", p-miss proposes "reject"
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p-match",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p-miss",
      roundId: session.currentRoundId,
    });

    const proposals = getProposalsForRound(session.sessionId, session.currentRoundId);
    const votes = getVotesForRound(session.sessionId, session.currentRoundId);
    const selVotes = getSelectionVotesForRound(session.sessionId, session.currentRoundId);

    // Human chose "approve"
    updateAlignmentAfterHumanDecision("align-test", "approve", proposals, votes, selVotes);

    expect(getAlignmentScore("p-match", "align-test")).toBe(1.0);
    expect(getAlignmentScore("p-miss", "align-test")).toBe(0);
  });

  test("DIAL_208: updateAlignmentAfterHumanDecision checks pairwise voters", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "align-test",
      strategyFnName: "lastAvailable",
    });
    await registerVoter({
      specialistId: "v-good",
      machineName: "align-test",
      strategyFnName: "preferA", // votes for proposal A (approve)
    });
    await registerVoter({
      specialistId: "v-bad",
      machineName: "align-test",
      strategyFnName: "preferB", // votes for proposal B (reject)
    });

    const propA = await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
      roundId: session.currentRoundId,
    });
    const propB = await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p2",
      roundId: session.currentRoundId,
    });
    await submitVote({
      sessionId: session.sessionId,
      specialistId: "v-good",
      roundId: session.currentRoundId,
      proposalIdA: propA.proposalId,
      proposalIdB: propB.proposalId,
    });
    await submitVote({
      sessionId: session.sessionId,
      specialistId: "v-bad",
      roundId: session.currentRoundId,
      proposalIdA: propA.proposalId,
      proposalIdB: propB.proposalId,
    });

    const proposals = getProposalsForRound(session.sessionId, session.currentRoundId);
    const votes = getVotesForRound(session.sessionId, session.currentRoundId);
    const selVotes = getSelectionVotesForRound(session.sessionId, session.currentRoundId);

    // Human chose "approve" — proposal A matches
    updateAlignmentAfterHumanDecision("align-test", "approve", proposals, votes, selVotes);

    // v-good voted A (matching proposal) → matched
    expect(getAlignmentScore("v-good", "align-test")).toBe(1.0);
    // v-bad voted B (non-matching proposal) → not matched
    expect(getAlignmentScore("v-bad", "align-test")).toBe(0);
  });

  test("DIAL_209: updateAlignmentAfterHumanDecision checks selection voters", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "align-test",
      strategyFnName: "lastAvailable",
    });
    await registerVoter({
      specialistId: "sv1",
      machineName: "align-test",
      voterType: "selection",
      selectionStrategyFn: async (ctx) => ({
        selectedProposalId: ctx.proposals[0].proposalId,
        reasoning: "first",
      }),
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p2",
      roundId: session.currentRoundId,
    });
    await submitSelectionVote({
      sessionId: session.sessionId,
      specialistId: "sv1",
      roundId: session.currentRoundId,
    });

    const proposals = getProposalsForRound(session.sessionId, session.currentRoundId);
    const votes = getVotesForRound(session.sessionId, session.currentRoundId);
    const selVotes = getSelectionVotesForRound(session.sessionId, session.currentRoundId);

    // Human chose "approve" — first proposal (from p1/firstAvailable) is "approve"
    updateAlignmentAfterHumanDecision("align-test", "approve", proposals, votes, selVotes);

    // sv1 selected the first proposal (approve) → matched
    expect(getAlignmentScore("sv1", "align-test")).toBe(1.0);
  });

  test("DIAL_210: updateAlignmentAfterHumanDecision: BOTH vote matched when either matches", async () => {
    const session = await createSession(twoOptionMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "align-test",
      strategyFnName: "lastAvailable",
    });
    await registerVoter({
      specialistId: "v-both",
      machineName: "align-test",
      strategyFnName: "both",
    });

    const propA = await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
      roundId: session.currentRoundId,
    });
    const propB = await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p2",
      roundId: session.currentRoundId,
    });
    await submitVote({
      sessionId: session.sessionId,
      specialistId: "v-both",
      roundId: session.currentRoundId,
      proposalIdA: propA.proposalId,
      proposalIdB: propB.proposalId,
    });

    const proposals = getProposalsForRound(session.sessionId, session.currentRoundId);
    const votes = getVotesForRound(session.sessionId, session.currentRoundId);
    const selVotes = getSelectionVotesForRound(session.sessionId, session.currentRoundId);

    // Human chose "approve" — propA matches, so BOTH vote counts as matched
    updateAlignmentAfterHumanDecision("align-test", "approve", proposals, votes, selVotes);

    expect(getAlignmentScore("v-both", "align-test")).toBe(1.0);
  });

  test("DIAL_211: getAllAlignmentRecords filters by machineName", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "align-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "other-machine",
      strategyFnName: "firstAvailable",
    });

    updateAlignment("p1", "align-test", true);
    updateAlignment("p2", "other-machine", true);

    const records = getAllAlignmentRecords("align-test");
    expect(records).toHaveLength(1);
    expect(records[0].specialistId).toBe("p1");
  });
});
