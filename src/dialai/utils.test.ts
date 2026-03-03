/**
 * Utils Unit Tests
 */

import { describe, it, expect } from "vitest";
import { generateUUID, validateMachine, normalizeMachine } from "./utils.js";
import type { MachineDefinition, TransitionDefinition } from "./types.js";

describe("generateUUID", () => {
  it("generates a valid UUID", () => {
    const uuid = generateUUID();

    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("generates unique UUIDs", () => {
    const uuids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      uuids.add(generateUUID());
    }
    expect(uuids.size).toBe(100);
  });
});

describe("validateMachine", () => {
  it("accepts a valid machine definition", () => {
    const machine = {
      machineName: "test",
      initialState: "a",
      goalState: "b",
      states: {
        a: { transitions: { go: "b" } },
        b: {},
      },
    };

    expect(() => validateMachine(machine)).not.toThrow();
  });

  it("rejects non-object machine", () => {
    expect(() => validateMachine(null)).toThrow("must be an object");
    expect(() => validateMachine("string")).toThrow("must be an object");
  });

  it("rejects missing machineName", () => {
    const machine = {
      initialState: "a",
      goalState: "b",
      states: { a: {}, b: {} },
    };

    expect(() => validateMachine(machine)).toThrow("machineName");
  });

  it("rejects missing initialState", () => {
    const machine = {
      machineName: "test",
      goalState: "b",
      states: { a: {}, b: {} },
    };

    expect(() => validateMachine(machine)).toThrow("initialState");
  });

  it("rejects missing goalState", () => {
    const machine = {
      machineName: "test",
      initialState: "a",
      states: { a: {}, b: {} },
    };

    expect(() => validateMachine(machine)).toThrow("goalState");
  });

  it("accepts defaultState as legacy goalState", () => {
    const machine = {
      machineName: "test",
      initialState: "a",
      defaultState: "b",
      states: { a: {}, b: {} },
    };

    expect(() => validateMachine(machine)).not.toThrow();
  });

  it("rejects when initialState not in states", () => {
    const machine = {
      machineName: "test",
      initialState: "nonexistent",
      goalState: "b",
      states: { a: {}, b: {} },
    };

    expect(() => validateMachine(machine)).toThrow("does not exist in states");
  });

  it("rejects when goalState not in states", () => {
    const machine = {
      machineName: "test",
      initialState: "a",
      goalState: "nonexistent",
      states: { a: {}, b: {} },
    };

    expect(() => validateMachine(machine)).toThrow("does not exist in states");
  });

  it("rejects when transition points to non-existent state", () => {
    const machine = {
      machineName: "test",
      initialState: "a",
      goalState: "b",
      states: {
        a: { transitions: { go: "nonexistent" } },
        b: {},
      },
    };

    expect(() => validateMachine(machine)).toThrow("non-existent state");
  });
});

describe("normalizeMachine", () => {
  it("copies goalState from defaultState if missing", () => {
    const machine = {
      machineName: "test",
      initialState: "a",
      defaultState: "b",
      goalState: "",
      states: { a: {}, b: {} },
    } as ReturnType<typeof normalizeMachine> & { defaultState?: string };

    const normalized = normalizeMachine(machine);

    expect(normalized.goalState).toBe("b");
  });

  it("preserves goalState if present", () => {
    const machine = {
      machineName: "test",
      initialState: "a",
      goalState: "c",
      states: { a: {}, c: {} },
    };

    const normalized = normalizeMachine(machine);

    expect(normalized.goalState).toBe("c");
  });

  it("converts shorthand transitions to TransitionDefinition", () => {
    const machine: MachineDefinition = {
      machineName: "test",
      initialState: "a",
      goalState: "b",
      states: {
        a: { transitions: { close: "b" } },
        b: {},
      },
    };

    const normalized = normalizeMachine(machine);
    const transitions = normalized.states.a.transitions!;
    const closeTd = transitions["close"] as TransitionDefinition;

    expect(closeTd).toEqual({ target: "b" });
    expect(closeTd.description).toBeUndefined();
    expect(closeTd.parameters).toBeUndefined();
  });

  it("preserves enriched transitions unchanged", () => {
    const params = { type: "object", properties: { destination: { type: "string" } } };
    const machine: MachineDefinition = {
      machineName: "test",
      initialState: "a",
      goalState: "b",
      states: {
        a: {
          transitions: {
            uber_ride: { target: "b", description: "Book an Uber", parameters: params },
          },
        },
        b: {},
      },
    };

    const normalized = normalizeMachine(machine);
    const td = normalized.states.a.transitions!["uber_ride"] as TransitionDefinition;

    expect(td.target).toBe("b");
    expect(td.description).toBe("Book an Uber");
    expect(td.parameters).toEqual(params);
  });

  it("handles mixed shorthand and enriched in one state", () => {
    const machine: MachineDefinition = {
      machineName: "test",
      initialState: "a",
      goalState: "b",
      states: {
        a: {
          transitions: {
            close: "b",
            uber_ride: { target: "b", description: "Book ride" },
          },
        },
        b: {},
      },
    };

    const normalized = normalizeMachine(machine);
    const transitions = normalized.states.a.transitions!;

    expect(transitions["close"]).toEqual({ target: "b" });
    expect(transitions["uber_ride"]).toEqual({ target: "b", description: "Book ride" });
  });

  it("handles states with no transitions", () => {
    const machine: MachineDefinition = {
      machineName: "test",
      initialState: "a",
      goalState: "a",
      states: {
        a: {},
      },
    };

    expect(() => normalizeMachine(machine)).not.toThrow();
    const normalized = normalizeMachine(machine);
    expect(normalized.states.a.transitions).toBeUndefined();
  });
});

describe("validateMachine with enriched transitions", () => {
  it("accepts enriched transition pointing to valid state", () => {
    const machine = {
      machineName: "test",
      initialState: "a",
      goalState: "b",
      states: {
        a: { transitions: { go: { target: "b" } } },
        b: {},
      },
    };

    expect(() => validateMachine(machine)).not.toThrow();
  });

  it("rejects enriched transition pointing to nonexistent state", () => {
    const machine = {
      machineName: "test",
      initialState: "a",
      goalState: "b",
      states: {
        a: { transitions: { go: { target: "nonexistent" } } },
        b: {},
      },
    };

    expect(() => validateMachine(machine)).toThrow("non-existent state");
  });
});
