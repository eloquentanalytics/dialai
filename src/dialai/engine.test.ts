import { describe, it, expect, beforeEach } from "vitest";
import * as store from "./store.js";
import { runSession } from "./engine.js";
import type { MachineDefinition } from "./types.js";

describe("runSession", () => {
  beforeEach(() => store.clear());

  it("simple 2-state machine → reaches done in 1 cycle", () => {
    const machine: MachineDefinition = {
      sessionTypeName: "two-state",
      initialState: "pending",
      defaultState: "done",
      states: {
        pending: { transitions: { complete: "done" } },
        done: {},
      },
    };
    const session = runSession(machine);
    expect(session.currentState).toBe("done");
  });

  it("3-state machine → reaches done in 2 cycles", () => {
    const machine: MachineDefinition = {
      sessionTypeName: "three-state",
      initialState: "pending",
      defaultState: "done",
      states: {
        pending: { transitions: { start: "active" } },
        active: { transitions: { finish: "done" } },
        done: {},
      },
    };
    const session = runSession(machine);
    expect(session.currentState).toBe("done");
  });

  it("already at goal → returns immediately", () => {
    const machine: MachineDefinition = {
      sessionTypeName: "already-done",
      initialState: "done",
      defaultState: "done",
      states: {
        done: {},
      },
    };
    const session = runSession(machine);
    expect(session.currentState).toBe("done");
  });

  it("no transitions from current state → throws", () => {
    const machine: MachineDefinition = {
      sessionTypeName: "stuck",
      initialState: "stuck",
      defaultState: "done",
      states: {
        stuck: {},
        done: {},
      },
    };
    expect(() => runSession(machine)).toThrow(
      "No transitions available from current state"
    );
  });
});
