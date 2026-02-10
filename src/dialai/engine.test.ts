/**
 * Engine Unit Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { clear } from "./store.js";
import { runSession } from "./engine.js";
import type { MachineDefinition } from "./types.js";

describe("runSession", () => {
  beforeEach(() => {
    clear();
  });

  it("runs a simple machine to completion", async () => {
    const machine: MachineDefinition = {
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

    const session = await runSession(machine);

    expect(session.currentState).toBe("done");
    expect(session.history).toHaveLength(1);
    expect(session.history[0].transitionName).toBe("complete");
  });

  it("runs a multi-step machine to completion", async () => {
    const machine: MachineDefinition = {
      machineName: "multi-step",
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
    expect(session.history[0].transitionName).toBe("to_b");
    expect(session.history[1].transitionName).toBe("to_c");
  });

  it("uses embedded specialists from machine definition", async () => {
    const machine: MachineDefinition = {
      machineName: "with-specialists",
      initialState: "pending",
      goalState: "done",
      states: {
        pending: {
          prompt: "Complete?",
          transitions: { complete: "done" },
        },
        done: {},
      },
      specialists: [
        {
          role: "proposer",
          specialistId: "custom-proposer",
          strategyFnName: "firstAvailable",
        },
        {
          role: "arbiter",
          specialistId: "custom-arbiter",
          strategyFnName: "firstProposal",
        },
      ],
    };

    const session = await runSession(machine);

    expect(session.currentState).toBe("done");
  });

  it("handles machine with multiple transitions per state", async () => {
    const machine: MachineDefinition = {
      machineName: "branching",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Which way?",
          transitions: {
            path_a: "middle_a",
            path_b: "middle_b",
          },
        },
        middle_a: {
          prompt: "Continue?",
          transitions: { finish: "end" },
        },
        middle_b: {
          prompt: "Continue?",
          transitions: { finish: "end" },
        },
        end: {},
      },
    };

    const session = await runSession(machine);

    expect(session.currentState).toBe("end");
    expect(session.history.length).toBeGreaterThanOrEqual(2);
  });

  it("defaults to firstAvailable proposer when none specified", async () => {
    const machine: MachineDefinition = {
      machineName: "no-specialists",
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

    expect(session.currentState).toBe("b");
    expect(session.history[0].transitionName).toBe("go");
  });
});
