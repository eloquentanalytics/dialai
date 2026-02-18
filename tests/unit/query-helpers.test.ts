import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerVoter,
  registerArbiter,
  submitProposal,
  submitVote,
  submitSelectionVote,
  getSpecialist,
  getProposers,
  getVoters,
  getArbiter,
  getProposalsForRound,
  getVotesForRound,
  getSelectionVotesForRound,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

function simpleMachine(): MachineDefinition {
  return {
    machineName: "query-test",
    initialState: "a",
    goalState: "b",
    states: {
      a: { prompt: "Go?", transitions: { go: "b" } },
      b: {},
    },
  };
}

describe("DIAL_249–DIAL_259: Query Helpers", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_249: getSpecialist returns specialist by ID", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "query-test",
      strategyFnName: "firstAvailable",
    });

    const specialist = getSpecialist("p1");
    expect(specialist).toBeDefined();
    expect(specialist!.specialistId).toBe("p1");
  });

  test("DIAL_250: getSpecialist returns undefined for unknown ID", () => {
    const specialist = getSpecialist("unknown");
    expect(specialist).toBeUndefined();
  });

  test("DIAL_251: getProposers returns all proposers for a machine", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "query-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "query-test",
      strategyFnName: "lastAvailable",
    });
    await registerProposer({
      specialistId: "p3",
      machineName: "other-machine",
      strategyFnName: "firstAvailable",
    });

    const proposers = getProposers("query-test");
    expect(proposers).toHaveLength(2);
    expect(proposers.map((p) => p.specialistId)).toContain("p1");
    expect(proposers.map((p) => p.specialistId)).toContain("p2");
  });

  test("DIAL_252: getProposers returns empty array for unknown machine", () => {
    const proposers = getProposers("nonexistent");
    expect(proposers).toEqual([]);
  });

  test("DIAL_253: getVoters returns all voters for a machine", async () => {
    await registerVoter({
      specialistId: "v1",
      machineName: "query-test",
      strategyFnName: "preferA",
    });
    await registerVoter({
      specialistId: "v2",
      machineName: "query-test",
      voterType: "selection",
      selectionStrategyFn: async (ctx) => ({
        selectedProposalId: ctx.proposals[0]?.proposalId ?? "",
        reasoning: "test",
      }),
    });

    const voters = getVoters("query-test");
    expect(voters).toHaveLength(2);
  });

  test("DIAL_254: getArbiter returns arbiter for a machine", async () => {
    await registerArbiter({
      specialistId: "a1",
      machineName: "query-test",
      strategyFnName: "firstProposal",
    });

    const arbiter = getArbiter("query-test");
    expect(arbiter).toBeDefined();
    expect(arbiter!.specialistId).toBe("a1");
  });

  test("DIAL_255: getArbiter returns undefined when no arbiter registered", () => {
    const arbiter = getArbiter("query-test");
    expect(arbiter).toBeUndefined();
  });

  test("DIAL_256: getProposalsForRound returns proposals for session+round", async () => {
    const session = await createSession(simpleMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "query-test",
      strategyFnName: "firstAvailable",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
      roundId: session.currentRoundId,
    });

    const proposals = getProposalsForRound(session.sessionId, session.currentRoundId);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].sessionId).toBe(session.sessionId);
    expect(proposals[0].roundId).toBe(session.currentRoundId);
  });

  test("DIAL_257: getVotesForRound returns votes for session+round", async () => {
    const session = await createSession(simpleMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "query-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "query-test",
      strategyFnName: "lastAvailable",
    });
    await registerVoter({
      specialistId: "v1",
      machineName: "query-test",
      strategyFnName: "preferA",
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
      specialistId: "v1",
      roundId: session.currentRoundId,
      proposalIdA: propA.proposalId,
      proposalIdB: propB.proposalId,
    });

    const votes = getVotesForRound(session.sessionId, session.currentRoundId);
    expect(votes).toHaveLength(1);
    expect(votes[0].sessionId).toBe(session.sessionId);
  });

  test("DIAL_258: getSelectionVotesForRound returns selection votes for session+round", async () => {
    const session = await createSession(simpleMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "query-test",
      strategyFnName: "firstAvailable",
    });
    await registerVoter({
      specialistId: "sv1",
      machineName: "query-test",
      voterType: "selection",
      selectionStrategyFn: async (ctx) => ({
        selectedProposalId: ctx.proposals[0].proposalId,
        reasoning: "first",
      }),
    });

    const prop = await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
      roundId: session.currentRoundId,
    });
    await submitSelectionVote({
      sessionId: session.sessionId,
      specialistId: "sv1",
      roundId: session.currentRoundId,
    });

    const selVotes = getSelectionVotesForRound(session.sessionId, session.currentRoundId);
    expect(selVotes).toHaveLength(1);
    expect(selVotes[0].selectedProposalId).toBe(prop.proposalId);
  });

  test("DIAL_259: round query helpers return empty arrays for unknown round", () => {
    expect(getProposalsForRound("unknown", "unknown")).toEqual([]);
    expect(getVotesForRound("unknown", "unknown")).toEqual([]);
    expect(getSelectionVotesForRound("unknown", "unknown")).toEqual([]);
  });
});
