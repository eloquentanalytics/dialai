/**
 * Integration Tests - Proposal Validation
 * DIAL_314–DIAL_315
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  getProposalsForRound,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("Integration: Proposal Validation", () => {
  beforeEach(() => {
    clear();
  });

  const machine: MachineDefinition = {
    machineName: "validation",
    initialState: "a",
    goalState: "c",
    states: {
      a: {
        prompt: "State A",
        transitions: { to_b: "b" },
      },
      b: {
        prompt: "State B",
        transitions: { to_c: "c" },
      },
      c: {},
    },
  };

  it("DIAL_314: proposal for transition from wrong state rejected", async () => {
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "p1",
      machineName: "validation",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "validation",
      strategyFnName: "firstProposal",
    });

    // Session is in state "a". "to_c" is only valid from state "b", not state "a".
    await expect(
      submitProposal({
        sessionId: session.sessionId,
        specialistId: "p1",
        roundId: session.currentRoundId,
        transitionName: "to_c",
        reasoning: "Trying to skip to C",
      })
    ).rejects.toThrow(/Invalid transition "to_c" from state "a"/);
  });

  it("DIAL_315: proposals from multiple specialists in same round", async () => {
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "p1",
      machineName: "validation",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "validation",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p3",
      machineName: "validation",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "validation",
      strategyFnName: "firstProposal",
    });

    // All three proposers submit to the same round
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
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p3",
      roundId: session.currentRoundId,
    });

    const roundProposals = getProposalsForRound(
      session.sessionId,
      session.currentRoundId
    );

    expect(roundProposals).toHaveLength(3);

    // Each proposal is unique
    const ids = new Set(roundProposals.map((p) => p.proposalId));
    expect(ids.size).toBe(3);

    // Each has the correct specialist
    const specialistIds = roundProposals.map((p) => p.specialistId).sort();
    expect(specialistIds).toEqual(["p1", "p2", "p3"]);

    // All propose the same transition (firstAvailable -> "to_b")
    for (const proposal of roundProposals) {
      expect(proposal.transitionName).toBe("to_b");
      expect(proposal.toState).toBe("b");
    }
  });
});
