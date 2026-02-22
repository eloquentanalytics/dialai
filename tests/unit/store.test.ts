import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  getStore,
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
  beforeEach(async () => {
    await clear();
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
    expect((await getStore().getAllSessions()).length).toBeGreaterThan(0);
    expect((await getStore().getSpecialistsByMachineAndRole("store-test")).length).toBeGreaterThan(0);

    // Clear
    await clear();

    // All 5 maps empty
    expect((await getStore().getAllSessions()).length).toBe(0);
    expect((await getStore().getSpecialistsByMachineAndRole("store-test")).length).toBe(0);
    expect((await getStore().getProposalsByRound("any", "any")).length).toBe(0);
    expect((await getStore().getAlignmentRecordsByMachine("any")).length).toBe(0);
    expect((await getStore().getExemplarsByMachine("any")).length).toBe(0);
  });

  test("DIAL_274: alignmentRecords map keyed by specialistId:machineName", async () => {
    // Directly set an alignment record to verify key format
    await getStore().setAlignmentRecord("spec1:machineA", {
      specialistId: "spec1",
      machineName: "machineA",
      matchingChoices: 5,
      totalComparisons: 10,
      alignmentScore: 0.5,
      lastUpdated: new Date(),
    });

    const record = await getStore().getAlignmentRecord("spec1:machineA");
    expect(record).toBeDefined();
    expect(record!.specialistId).toBe("spec1");
    expect(record!.machineName).toBe("machineA");
  });

  test("DIAL_276: clear() allows fresh test isolation", async () => {
    // Create data in first "test"
    await createSession(simpleMachine());
    expect((await getStore().getAllSessions()).length).toBe(1);

    // Clear simulates fresh start
    await clear();

    // All operations work as if fresh
    expect((await getStore().getAllSessions()).length).toBe(0);
    const session = await createSession(simpleMachine());
    expect(session.sessionId).toBeDefined();
    expect((await getStore().getAllSessions()).length).toBe(1);
  });
});
