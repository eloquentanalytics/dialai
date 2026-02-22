/**
 * Tick Orchestration Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { clear } from "./store.js";
import { tick } from "./engine.js";
import {
  createSession,
  registerProposer,
  registerArbiter,
  getProposalsForRound,
} from "./api.js";
import type { MachineDefinition } from "./types.js";

// Simple two-state machine
const simpleMachine: MachineDefinition = {
  machineName: "simple",
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

// Three-step machine
const multiStepMachine: MachineDefinition = {
  machineName: "multi",
  initialState: "a",
  goalState: "c",
  states: {
    a: { prompt: "Go to B", transitions: { to_b: "b" } },
    b: { prompt: "Go to C", transitions: { to_c: "c" } },
    c: {},
  },
};

describe("tick", () => {
  beforeEach(async () => {
    await clear();
  });

  it("solicits one proposer at a time", async () => {
    const session = await createSession(simpleMachine);
    await registerProposer({
      specialistId: "p1",
      machineName: "simple",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "simple",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "simple",
      strategyFnName: "firstProposal",
    });

    // First tick: solicits p1
    const r1 = await tick();
    expect(r1).toHaveLength(1);
    expect(r1[0].status).toBe("solicited");
    expect(r1[0].specialistId).toBe("p1");
    expect(r1[0].sessionId).toBe(session.sessionId);

    // Verify only one proposal exists
    const proposals = await getProposalsForRound(
      session.sessionId,
      session.currentRoundId
    );
    expect(proposals).toHaveLength(1);
    expect(proposals[0].specialistId).toBe("p1");

    // Second tick: solicits p2
    const r2 = await tick();
    expect(r2).toHaveLength(1);
    expect(r2[0].status).toBe("solicited");
    expect(r2[0].specialistId).toBe("p2");
  });

  it("evaluates consensus after all proposers submit", async () => {
    await createSession(simpleMachine);
    await registerProposer({
      specialistId: "p1",
      machineName: "simple",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "simple",
      strategyFnName: "firstProposal",
    });

    // Tick 1: solicit
    const r1 = await tick();
    expect(r1[0].status).toBe("solicited");

    // Tick 2: all proposals in → consensus → advance
    const r2 = await tick();
    expect(r2[0].status).toBe("advanced");
    expect(r2[0].previousState).toBe("pending");
    expect(r2[0].currentState).toBe("done");
    expect(r2[0].transitionName).toBe("complete");
  });

  it("advances on consensus and sets TickResult fields", async () => {
    const session = await createSession(simpleMachine);
    await registerProposer({
      specialistId: "p1",
      machineName: "simple",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "simple",
      strategyFnName: "firstProposal",
    });

    await tick(); // solicit
    const results = await tick(); // advance

    const r = results[0];
    expect(r.sessionId).toBe(session.sessionId);
    expect(r.machineName).toBe("simple");
    expect(r.status).toBe("advanced");
    expect(r.previousState).toBe("pending");
    expect(r.currentState).toBe("done");
    expect(r.transitionName).toBe("complete");
    expect(r.reasoning).toBeDefined();
  });

  it("reports needs_human when no consensus", async () => {
    // Use aheadByK arbiter with no alignment data → cold start → no consensus
    const machine: MachineDefinition = {
      machineName: "needs-human",
      initialState: "pending",
      goalState: "done",
      states: {
        pending: {
          prompt: "Decide",
          transitions: { approve: "done", reject: "rejected" },
        },
        done: {},
        rejected: {},
      },
    };

    await createSession(machine);
    await registerProposer({
      specialistId: "p1",
      machineName: "needs-human",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "needs-human",
      strategyFnName: "lastAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "needs-human",
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Tick 1: solicit p1
    const r1 = await tick();
    expect(r1[0].status).toBe("solicited");

    // Tick 2: solicit p2
    const r2 = await tick();
    expect(r2[0].status).toBe("solicited");

    // Tick 3: all in, but no alignment data → cold start → needs_human
    const r3 = await tick();
    expect(r3[0].status).toBe("needs_human");
  });

  it("skips terminal sessions", async () => {
    await createSession(simpleMachine);
    await registerProposer({
      specialistId: "p1",
      machineName: "simple",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "simple",
      strategyFnName: "firstProposal",
    });

    // Drive to completion
    await tick(); // solicit
    await tick(); // advance to done

    // Now terminal — tick should return empty
    const results = await tick();
    expect(results).toHaveLength(0);
  });

  it("handles multiple sessions simultaneously", async () => {
    // Create two sessions with different machines
    const machineA: MachineDefinition = {
      machineName: "machine-a",
      initialState: "start",
      goalState: "end",
      states: {
        start: { prompt: "Go", transitions: { go: "end" } },
        end: {},
      },
    };
    const machineB: MachineDefinition = {
      machineName: "machine-b",
      initialState: "start",
      goalState: "end",
      states: {
        start: { prompt: "Go", transitions: { go: "end" } },
        end: {},
      },
    };

    const sA = await createSession(machineA);
    const sB = await createSession(machineB);

    await registerProposer({
      specialistId: "pA",
      machineName: "machine-a",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arbA",
      machineName: "machine-a",
      strategyFnName: "firstProposal",
    });
    await registerProposer({
      specialistId: "pB",
      machineName: "machine-b",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arbB",
      machineName: "machine-b",
      strategyFnName: "firstProposal",
    });

    // Tick 1: both sessions get solicited
    const r1 = await tick();
    expect(r1).toHaveLength(2);

    const resultA = r1.find((r) => r.sessionId === sA.sessionId);
    const resultB = r1.find((r) => r.sessionId === sB.sessionId);
    expect(resultA?.status).toBe("solicited");
    expect(resultA?.machineName).toBe("machine-a");
    expect(resultB?.status).toBe("solicited");
    expect(resultB?.machineName).toBe("machine-b");

    // Tick 2: both advance
    const r2 = await tick();
    expect(r2).toHaveLength(2);
    expect(r2.every((r) => r.status === "advanced")).toBe(true);

    // Tick 3: both terminal → empty
    const r3 = await tick();
    expect(r3).toHaveLength(0);
  });

  it("progresses a multi-step machine through ticks", async () => {
    await createSession(multiStepMachine);
    await registerProposer({
      specialistId: "p1",
      machineName: "multi",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName: "multi",
      strategyFnName: "firstProposal",
    });

    // Step 1: a → b
    const r1 = await tick(); // solicit
    expect(r1[0].status).toBe("solicited");
    expect(r1[0].currentState).toBe("a");

    const r2 = await tick(); // advance
    expect(r2[0].status).toBe("advanced");
    expect(r2[0].previousState).toBe("a");
    expect(r2[0].currentState).toBe("b");

    // Step 2: b → c
    const r3 = await tick(); // solicit
    expect(r3[0].status).toBe("solicited");
    expect(r3[0].currentState).toBe("b");

    const r4 = await tick(); // advance
    expect(r4[0].status).toBe("advanced");
    expect(r4[0].previousState).toBe("b");
    expect(r4[0].currentState).toBe("c");

    // Terminal
    const r5 = await tick();
    expect(r5).toHaveLength(0);
  });

  it("returns empty array when no sessions exist", async () => {
    const results = await tick();
    expect(results).toHaveLength(0);
  });

  it("interleaves sessions with different proposer counts", async () => {
    // Machine A: 1 proposer (fast)
    // Machine B: 2 proposers (slower)
    const machineA: MachineDefinition = {
      machineName: "fast-machine",
      initialState: "start",
      goalState: "end",
      states: {
        start: { prompt: "Go", transitions: { go: "end" } },
        end: {},
      },
    };
    const machineB: MachineDefinition = {
      machineName: "slow-machine",
      initialState: "start",
      goalState: "end",
      states: {
        start: { prompt: "Go", transitions: { go: "end" } },
        end: {},
      },
    };

    const sA = await createSession(machineA);
    const sB = await createSession(machineB);

    await registerProposer({
      specialistId: "pA",
      machineName: "fast-machine",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arbA",
      machineName: "fast-machine",
      strategyFnName: "firstProposal",
    });

    await registerProposer({
      specialistId: "pB1",
      machineName: "slow-machine",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "pB2",
      machineName: "slow-machine",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arbB",
      machineName: "slow-machine",
      strategyFnName: "firstProposal",
    });

    // Tick 1: A solicits pA, B solicits pB1
    const r1 = await tick();
    expect(r1).toHaveLength(2);

    // Tick 2: A advances (all proposals in), B solicits pB2
    const r2 = await tick();
    const a2 = r2.find((r) => r.sessionId === sA.sessionId);
    const b2 = r2.find((r) => r.sessionId === sB.sessionId);
    expect(a2?.status).toBe("advanced");
    expect(b2?.status).toBe("solicited");
    expect(b2?.specialistId).toBe("pB2");

    // Tick 3: A is terminal (omitted), B advances
    const r3 = await tick();
    expect(r3).toHaveLength(1);
    expect(r3[0].sessionId).toBe(sB.sessionId);
    expect(r3[0].status).toBe("advanced");
  });
});
