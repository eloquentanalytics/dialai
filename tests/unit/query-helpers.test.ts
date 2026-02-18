import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  getSpecialist,
  getProposers,
  getArbiter,
  getProposalsForRound,
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

  test("DIAL_259: round query helpers return empty arrays for unknown round", () => {
    expect(getProposalsForRound("unknown", "unknown")).toEqual([]);
  });
});
