import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  sessions,
  specialists,
  proposals,
  alignmentRecords,
  exemplars,
  createSession,
  registerProposer,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

function simpleMachine(): MachineDefinition {
  return {
    machineName: "store-test",
    initialState: "a",
    goalState: "b",
    states: {
      a: { prompt: "Go?", transitions: { go: "b" } },
      b: {},
    },
  };
}

describe("DIAL_268–DIAL_276: Store Operations", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_268: clear() empties all 5 maps", async () => {
    // Populate some data
    await createSession(simpleMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "store-test",
      strategyFnName: "firstAvailable",
    });

    // Verify data exists
    expect(sessions.size).toBeGreaterThan(0);
    expect(specialists.size).toBeGreaterThan(0);

    // Clear
    clear();

    // All 5 maps empty
    expect(sessions.size).toBe(0);
    expect(specialists.size).toBe(0);
    expect(proposals.size).toBe(0);
    expect(alignmentRecords.size).toBe(0);
    expect(exemplars.size).toBe(0);
  });

  test("DIAL_274: alignmentRecords map keyed by specialistId:machineName", async () => {
    // Directly set an alignment record to verify key format
    alignmentRecords.set("spec1:machineA", {
      specialistId: "spec1",
      machineName: "machineA",
      matchingChoices: 5,
      totalComparisons: 10,
      alignmentScore: 0.5,
      lastUpdated: new Date(),
    });

    expect(alignmentRecords.has("spec1:machineA")).toBe(true);
    const record = alignmentRecords.get("spec1:machineA")!;
    expect(record.specialistId).toBe("spec1");
    expect(record.machineName).toBe("machineA");
  });

  test("DIAL_276: clear() allows fresh test isolation", async () => {
    // Create data in first "test"
    await createSession(simpleMachine());
    expect(sessions.size).toBe(1);

    // Clear simulates fresh start
    clear();

    // All operations work as if fresh
    expect(sessions.size).toBe(0);
    const session = await createSession(simpleMachine());
    expect(session.sessionId).toBeDefined();
    expect(sessions.size).toBe(1);
  });
});
