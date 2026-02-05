import { describe, it, expect, beforeEach } from "vitest";
import * as store from "./store.js";
import { runSession } from "./engine.js";
import type { MachineDefinition } from "./types.js";

describe("runSession", () => {
  beforeEach(() => store.clear());

  it("simple 2-state machine -> reaches done in 1 cycle", async () => {
    const machine: MachineDefinition = {
      machineName: "two-state",
      initialState: "pending",
      defaultState: "done",
      states: {
        pending: { transitions: { complete: "done" } },
        done: {},
      },
    };
    const session = await runSession(machine);
    expect(session.currentState).toBe("done");
  });

  it("3-state machine -> reaches done in 2 cycles", async () => {
    const machine: MachineDefinition = {
      machineName: "three-state",
      initialState: "pending",
      defaultState: "done",
      states: {
        pending: { transitions: { start: "active" } },
        active: { transitions: { finish: "done" } },
        done: {},
      },
    };
    const session = await runSession(machine);
    expect(session.currentState).toBe("done");
  });

  it("already at goal -> returns immediately", async () => {
    const machine: MachineDefinition = {
      machineName: "already-done",
      initialState: "done",
      defaultState: "done",
      states: {
        done: {},
      },
    };
    const session = await runSession(machine);
    expect(session.currentState).toBe("done");
  });

  it("no transitions from current state -> throws", async () => {
    const machine: MachineDefinition = {
      machineName: "stuck",
      initialState: "stuck",
      defaultState: "done",
      states: {
        stuck: {},
        done: {},
      },
    };
    await expect(runSession(machine)).rejects.toThrow(
      "No transitions available from current state"
    );
  });
});
