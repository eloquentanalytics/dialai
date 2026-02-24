/**
 * End-to-End Tests - Full Session Lifecycle via runSession
 * DIAL_345–DIAL_352
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  clear,
  runSession,
  getSpecialist,
  registerProposer,
  registerArbiter,
  getAlignmentScore,
  getProposers,
  getArbiter,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("E2E: Full Session Lifecycle via runSession", () => {
  beforeEach(async () => {
    await clear();
  });

  it("DIAL_345: runSession drives 2-state machine to goalState", async () => {
    const machine: MachineDefinition = {
      machineName: "two-state",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Proceed?",
          transitions: { proceed: "end" },
        },
        end: {},
      },
    };

    const session = await runSession(machine);

    expect(session.currentState).toBe("end");
    expect(session.history).toHaveLength(1);
    expect(session.history[0].transitionName).toBe("proceed");
  });

  it("DIAL_346: runSession drives multi-state machine to goalState", async () => {
    const machine: MachineDefinition = {
      machineName: "four-state",
      initialState: "A",
      goalState: "D",
      states: {
        A: {
          prompt: "Go to B",
          transitions: { to_b: "B" },
        },
        B: {
          prompt: "Go to C",
          transitions: { to_c: "C" },
        },
        C: {
          prompt: "Go to D",
          transitions: { to_d: "D" },
        },
        D: {},
      },
    };

    const session = await runSession(machine);

    expect(session.currentState).toBe("D");
    expect(session.history).toHaveLength(3);
    expect(session.history[0].transitionName).toBe("to_b");
    expect(session.history[1].transitionName).toBe("to_c");
    expect(session.history[2].transitionName).toBe("to_d");
  });

  it("DIAL_347: runSession terminates when goalState reached", async () => {
    const machine: MachineDefinition = {
      machineName: "terminate-test",
      initialState: "open",
      goalState: "closed",
      states: {
        open: {
          prompt: "Close?",
          transitions: { close: "closed" },
        },
        closed: {},
      },
    };

    const session = await runSession(machine);

    expect(session.currentState).toBe(machine.goalState);
  });

  it("DIAL_348: runSession history records all transitions", async () => {
    const machine: MachineDefinition = {
      machineName: "audit-trail",
      initialState: "s1",
      goalState: "s4",
      states: {
        s1: {
          prompt: "Step 1",
          transitions: { next: "s2" },
        },
        s2: {
          prompt: "Step 2",
          transitions: { next: "s3" },
        },
        s3: {
          prompt: "Step 3",
          transitions: { next: "s4" },
        },
        s4: {},
      },
    };

    const session = await runSession(machine);

    expect(session.history).toHaveLength(3);
    for (const record of session.history) {
      expect(record.transitionName).toBe("next");
      expect(record.executionTimestamp).toBeInstanceOf(Date);
      expect(typeof record.reasoning).toBe("string");
    }
  });

  it("DIAL_349: runSession registers default firstAvailable proposer when none specified", async () => {
    const machine: MachineDefinition = {
      machineName: "default-proposer",
      initialState: "a",
      goalState: "b",
      states: {
        a: {
          prompt: "Go?",
          transitions: { go: "b" },
        },
        b: {},
      },
    };

    const session = await runSession(machine);

    // Check that a default proposer was registered with the __default_proposer_ prefix
    const proposers = await getProposers("default-proposer");
    const defaultProposer = proposers.find((p) =>
      p.specialistId.startsWith("__default_proposer_")
    );
    expect(defaultProposer).toBeDefined();
    expect(defaultProposer!.role).toBe("proposer");
    expect(session.currentState).toBe("b");
  });

  it("DIAL_350: runSession registers default firstProposal arbiter when none specified", async () => {
    const machine: MachineDefinition = {
      machineName: "default-arbiter",
      initialState: "a",
      goalState: "b",
      states: {
        a: {
          prompt: "Go?",
          transitions: { go: "b" },
        },
        b: {},
      },
    };

    const session = await runSession(machine);

    // Check that a default arbiter was registered with the __default_arbiter_ prefix
    const arbiter = await getArbiter("default-arbiter");
    expect(arbiter).toBeDefined();
    expect(arbiter!.specialistId.startsWith("__default_arbiter_")).toBe(true);
    expect(arbiter!.role).toBe("arbiter");
    expect(session.currentState).toBe("b");
  });

  it("DIAL_351: runSession registers specialists from machine.specialists array", async () => {
    const machine: MachineDefinition = {
      machineName: "embedded-specialists",
      initialState: "a",
      goalState: "b",
      states: {
        a: {
          prompt: "Go?",
          transitions: { go: "b" },
        },
        b: {},
      },
      specialists: [
        {
          specialistId: "p1",
          role: "proposer",
          strategyFnName: "firstAvailable",
        },
        {
          specialistId: "a1",
          role: "arbiter",
          strategyFnName: "firstProposal",
        },
      ],
    };

    const session = await runSession(machine);

    // Check that p1 was registered from the machine definition
    const p1 = await getSpecialist("p1");
    expect(p1).toBeDefined();
    expect(p1!.role).toBe("proposer");

    const a1 = await getSpecialist("a1");
    expect(a1).toBeDefined();
    expect(a1!.role).toBe("arbiter");

    // No default specialists should have been created
    const proposers = await getProposers("embedded-specialists");
    const defaultProposers = proposers.filter((p) =>
      p.specialistId.startsWith("__default_proposer_")
    );
    expect(defaultProposers).toHaveLength(0);

    const arbiter = await getArbiter("embedded-specialists");
    const isDefault = arbiter?.specialistId.startsWith("__default_arbiter_") ?? false;
    expect(isDefault).toBe(false);

    expect(session.currentState).toBe("b");
  });

  it("DIAL_352: runSession returns session when exhausted (no consensus)", async () => {
    const machine: MachineDefinition = {
      machineName: "exhausted",
      initialState: "pending",
      goalState: "done",
      states: {
        pending: {
          prompt: "Approve or reject?",
          transitions: {
            approve: "done",
            reject: "failed",
          },
        },
        done: {},
        failed: {},
      },
    };

    // Register 2 proposers with opposing strategies BEFORE calling runSession
    // so that runSession finds them and does not create defaults
    await registerProposer({
      specialistId: "p-first",
      machineName: "exhausted",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p-last",
      machineName: "exhausted",
      strategyFnName: "lastAvailable",
    });
    // alignmentMargin arbiter with high threshold
    await registerArbiter({
      specialistId: "arb-exhausted",
      machineName: "exhausted",
      strategyFnName: "alignmentMargin",
      threshold: 0.5,
    });

    // Both proposers have 0 alignment at cold start
    expect(await getAlignmentScore("p-first", "exhausted")).toBe(0);
    expect(await getAlignmentScore("p-last", "exhausted")).toBe(0);

    const session = await runSession(machine);

    // Since alignment is 0 for both, alignmentMargin returns "Cold start" -> no consensus
    // runSession should return the session stuck at initial state
    expect(session.currentState).toBe("pending");
    expect(session.currentState).not.toBe(machine.goalState);
  });
});
