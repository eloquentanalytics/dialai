/**
 * Integration Tests - Decision Cycle
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerVoter,
  registerArbiter,
  submitProposal,
  submitVote,
  submitArbitration,
  getSession,
  runSession,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("Integration: Decision Cycle", () => {
  beforeEach(() => {
    clear();
  });

  it("completes a full decision cycle with voting", async () => {
    const machine: MachineDefinition = {
      machineName: "voting-test",
      initialState: "pending",
      goalState: "approved",
      states: {
        pending: {
          prompt: "Approve or reject?",
          transitions: {
            approve: "approved",
            reject: "rejected",
          },
        },
        approved: {},
        rejected: {},
      },
    };

    // Setup
    const session = await createSession(machine);

    // Register specialists
    await registerProposer({
      specialistId: "p1",
      machineName: "voting-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "voting-test",
      strategyFnName: "lastAvailable",
    });
    await registerVoter({
      specialistId: "v1",
      machineName: "voting-test",
      strategyFnName: "preferA",
    });
    await registerVoter({
      specialistId: "v2",
      machineName: "voting-test",
      strategyFnName: "preferA",
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "voting-test",
      strategyFnName: "aheadByK",
      threshold: 1,
    });

    // Submit proposals
    const propA = await submitProposal(
      session.sessionId,
      "p1",
      session.currentRoundId
    );
    const propB = await submitProposal(
      session.sessionId,
      "p2",
      session.currentRoundId
    );

    expect(propA.transitionName).toBe("approve");
    expect(propB.transitionName).toBe("reject");

    // Submit votes
    await submitVote(
      session.sessionId,
      "v1",
      session.currentRoundId,
      propA.proposalId,
      propB.proposalId
    );
    await submitVote(
      session.sessionId,
      "v2",
      session.currentRoundId,
      propA.proposalId,
      propB.proposalId
    );

    // Arbitrate
    const result = await submitArbitration(
      session.sessionId,
      session.currentRoundId
    );

    expect(result.executed).toBe(true);
    expect(result.transitionName).toBe("approve");
    expect(result.toState).toBe("approved");

    // Verify session state
    const updatedSession = await getSession(session.sessionId);
    expect(updatedSession.currentState).toBe("approved");
    expect(updatedSession.history).toHaveLength(1);
  });

  it("handles multiple rounds until goal state", async () => {
    const machine: MachineDefinition = {
      machineName: "multi-round",
      initialState: "a",
      goalState: "c",
      states: {
        a: {
          prompt: "Go to B",
          transitions: { to_b: "b" },
        },
        b: {
          prompt: "Go to C",
          transitions: { to_c: "c" },
        },
        c: {},
      },
    };

    const session = await runSession(machine);

    expect(session.currentState).toBe("c");
    expect(session.history).toHaveLength(2);
  });

  it("supports human override of arbitration", async () => {
    const machine: MachineDefinition = {
      machineName: "human-override",
      initialState: "pending",
      goalState: "approved",
      states: {
        pending: {
          prompt: "Approve or reject?",
          transitions: {
            approve: "approved",
            reject: "rejected",
          },
        },
        approved: {},
        rejected: {},
      },
    };

    const session = await createSession(machine);

    // Register a human specialist
    await registerProposer({
      specialistId: "human",
      machineName: "human-override",
      strategyFnName: "firstAvailable",
      isHuman: true,
    });

    await registerArbiter({
      specialistId: "arbiter",
      machineName: "human-override",
      strategyFnName: "aheadByK",
      threshold: 100, // Very high threshold to force override
    });

    // Human forces the transition
    const result = await submitArbitration(
      session.sessionId,
      session.currentRoundId,
      "human",
      "approve",
      "Human decided to approve"
    );

    expect(result.executed).toBe(true);
    expect(result.isHuman).toBe(true);
    expect(result.transitionName).toBe("approve");

    const updatedSession = await getSession(session.sessionId);
    expect(updatedSession.currentState).toBe("approved");
  });

  it("tracks cost metadata through the cycle", async () => {
    const machine: MachineDefinition = {
      machineName: "cost-tracking",
      initialState: "pending",
      goalState: "done",
      states: {
        pending: {
          prompt: "Complete?",
          transitions: { complete: "done" },
        },
        done: {},
      },
    };

    const session = await createSession(machine);

    await registerProposer({
      specialistId: "p1",
      machineName: "cost-tracking",
      strategyFnName: "firstAvailable",
    });

    await registerArbiter({
      specialistId: "arbiter",
      machineName: "cost-tracking",
      strategyFnName: "firstProposal",
    });

    // Submit proposal with cost tracking
    const proposal = await submitProposal(
      session.sessionId,
      "p1",
      session.currentRoundId,
      undefined,
      "Auto proposal",
      { source: "test" },
      0.005,
      250,
      100,
      50
    );

    expect(proposal.costUSD).toBe(0.005);
    expect(proposal.latencyMsec).toBe(250);
    expect(proposal.numInputTokens).toBe(100);
    expect(proposal.numOutputTokens).toBe(50);
    expect(proposal.metaJson).toEqual({ source: "test" });
  });
});
