/**
 * Integration Tests - Decision Cycle
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  submitArbitration,
  getSession,
  runSession,
  updateAlignment,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("Integration: Decision Cycle", () => {
  beforeEach(() => {
    clear();
  });

  it("completes a full decision cycle with alignment-weighted consensus", async () => {
    const machine: MachineDefinition = {
      machineName: "consensus-test",
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
      machineName: "consensus-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "consensus-test",
      strategyFnName: "lastAvailable",
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "consensus-test",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Seed alignment: p1 has high alignment, p2 has low
    for (let i = 0; i < 9; i++) updateAlignment("p1", "consensus-test", true);
    updateAlignment("p1", "consensus-test", false);
    for (let i = 0; i < 2; i++) updateAlignment("p2", "consensus-test", true);
    for (let i = 0; i < 8; i++) updateAlignment("p2", "consensus-test", false);

    // Submit proposals
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

    expect(propA.transitionName).toBe("approve");
    expect(propB.transitionName).toBe("reject");

    // Arbitrate - p1's "approve" should win due to higher alignment
    const result = await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
    });

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
    const result = await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
      specialistId: "human",
      transitionName: "approve",
      reasoning: "Human decided to approve",
    });

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
    const proposal = await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
      roundId: session.currentRoundId,
      reasoning: "Auto proposal",
      metaJson: { source: "test" },
      costUSD: 0.005,
      latencyMsec: 250,
      numInputTokens: 100,
      numOutputTokens: 50,
    });

    expect(proposal.costUSD).toBe(0.005);
    expect(proposal.latencyMsec).toBe(250);
    expect(proposal.numInputTokens).toBe(100);
    expect(proposal.numOutputTokens).toBe(50);
    expect(proposal.metaJson).toEqual({ source: "test" });
  });
});
