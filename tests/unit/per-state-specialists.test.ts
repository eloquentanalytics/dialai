import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerArbiter,
  getProposersForState,
  getEnabledProposersForState,
  getArbiterForState,
  getAlignmentScore,
  updateAlignment,
  getAllAlignmentRecords,
  getSpecialist,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

// Machine with per-state specialists on "active" state
function perStateMachine(): MachineDefinition {
  return {
    machineName: "per-state-test",
    initialState: "active",
    goalState: "done",
    states: {
      active: {
        prompt: "Choose next step",
        transitions: { go: "done" },
        specialists: [
          { role: "proposer", specialistId: "state-p1" },
          { role: "proposer", specialistId: "state-p2", disabled: true },
          { role: "arbiter", specialistId: "state-arbiter", strategyFnName: "firstProposal" },
        ],
      },
      done: {},
    },
  };
}

// Machine with NO per-state specialists (uses machine-level fallback)
function machineLevelMachine(): MachineDefinition {
  return {
    machineName: "machine-level-test",
    initialState: "start",
    goalState: "end",
    states: {
      start: {
        prompt: "Begin",
        transitions: { next: "end" },
      },
      end: {},
    },
  };
}

// Machine with specialists on different states
function multiStateMachine(): MachineDefinition {
  return {
    machineName: "multi-state-test",
    initialState: "review",
    goalState: "done",
    states: {
      review: {
        prompt: "Review",
        transitions: { approve: "build", reject: "done" },
        specialists: [
          { role: "proposer", specialistId: "legal-reviewer" },
          { role: "arbiter", specialistId: "review-arbiter", strategyFnName: "firstProposal" },
        ],
      },
      build: {
        prompt: "Build",
        transitions: { ship: "done" },
        specialists: [
          { role: "proposer", specialistId: "engineer" },
          { role: "arbiter", specialistId: "build-arbiter", strategyFnName: "firstProposal" },
        ],
      },
      done: {},
    },
  };
}

describe("Per-state specialist lookup", () => {
  beforeEach(async () => {
    await clear();
  });

  test("getProposersForState returns state-level proposers when declared", async () => {
    await registerProposer({
      specialistId: "state-p1",
      machineName: "per-state-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "state-p2",
      machineName: "per-state-test",
      strategyFnName: "firstAvailable",
    });

    const session = await createSession(perStateMachine());
    const proposers = await getProposersForState(session);

    expect(proposers).toHaveLength(2);
    expect(proposers.map((p) => p.specialistId)).toEqual(["state-p1", "state-p2"]);
  });

  test("getProposersForState falls back to machine-level when state has no specialists", async () => {
    await registerProposer({
      specialistId: "machine-p1",
      machineName: "machine-level-test",
      strategyFnName: "firstAvailable",
    });

    const session = await createSession(machineLevelMachine());
    const proposers = await getProposersForState(session);

    expect(proposers).toHaveLength(1);
    expect(proposers[0].specialistId).toBe("machine-p1");
  });

  test("getEnabledProposersForState filters out state-level disabled specialists", async () => {
    await registerProposer({
      specialistId: "state-p1",
      machineName: "per-state-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "state-p2",
      machineName: "per-state-test",
      strategyFnName: "firstAvailable",
    });

    const session = await createSession(perStateMachine());
    const enabled = await getEnabledProposersForState(session);

    expect(enabled).toHaveLength(1);
    expect(enabled[0].specialistId).toBe("state-p1");
  });

  test("getArbiterForState returns state-level arbiter when declared", async () => {
    // state-arbiter auto-registered by createSession (strategyFnName: "firstProposal")
    const session = await createSession(perStateMachine());
    // Also register state-p1 and state-p2 manually
    await registerProposer({
      specialistId: "state-p1",
      machineName: "per-state-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "state-p2",
      machineName: "per-state-test",
      strategyFnName: "firstAvailable",
    });

    const arbiter = await getArbiterForState(session);
    expect(arbiter).toBeDefined();
    expect(arbiter!.specialistId).toBe("state-arbiter");
  });

  test("getArbiterForState falls back to machine-level when state has no specialists", async () => {
    await registerArbiter({
      specialistId: "machine-arb",
      machineName: "machine-level-test",
      strategyFnName: "firstProposal",
    });

    const session = await createSession(machineLevelMachine());
    const arbiter = await getArbiterForState(session);

    expect(arbiter).toBeDefined();
    expect(arbiter!.specialistId).toBe("machine-arb");
  });

  test("createSession auto-registers per-state specialists with strategyFnName", async () => {
    await createSession(perStateMachine());

    // state-arbiter should have been auto-registered
    const arbiter = await getSpecialist("state-arbiter");
    expect(arbiter).toBeDefined();
    expect(arbiter!.role).toBe("arbiter");

    // state-p1 and state-p2 have no strategyFnName, so NOT auto-registered
    expect(await getSpecialist("state-p1")).toBeUndefined();
    expect(await getSpecialist("state-p2")).toBeUndefined();
  });

  test("createSession does not duplicate auto-registration of existing specialists", async () => {
    // Pre-register the arbiter
    await registerArbiter({
      specialistId: "state-arbiter",
      machineName: "per-state-test",
      strategyFnName: "firstProposal",
    });

    // This should NOT throw (specialist already exists)
    const session = await createSession(perStateMachine());
    expect(session).toBeDefined();
  });
});

describe("Per-state alignment tracking", () => {
  beforeEach(async () => {
    await clear();
  });

  test("alignment tracked per-state with 3-part key", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    await updateAlignment("p1", "test", true, "state-a");
    await updateAlignment("p1", "test", false, "state-b");

    expect(await getAlignmentScore("p1", "test", "state-a")).toBeCloseTo(0.2065, 3);
    expect(await getAlignmentScore("p1", "test", "state-b")).toBe(0);
  });

  test("alignment without state uses 2-part key (backward compat)", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    await updateAlignment("p1", "test", true);
    expect(await getAlignmentScore("p1", "test")).toBeCloseTo(0.2065, 3);
    // Per-state key should not exist
    expect(await getAlignmentScore("p1", "test", "some-state")).toBe(0);
  });

  test("per-state and non-state alignment are independent", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    await updateAlignment("p1", "test", true);
    await updateAlignment("p1", "test", false, "state-a");

    expect(await getAlignmentScore("p1", "test")).toBeCloseTo(0.2065, 3);
    expect(await getAlignmentScore("p1", "test", "state-a")).toBe(0);
  });

  test("getAllAlignmentRecords filters by state when provided", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "test",
      strategyFnName: "lastAvailable",
    });

    await updateAlignment("p1", "test", true, "state-a");
    await updateAlignment("p2", "test", true, "state-b");
    await updateAlignment("p1", "test", true); // no state

    const stateA = await getAllAlignmentRecords("test", "state-a");
    expect(stateA).toHaveLength(1);
    expect(stateA[0].specialistId).toBe("p1");

    const stateB = await getAllAlignmentRecords("test", "state-b");
    expect(stateB).toHaveLength(1);
    expect(stateB[0].specialistId).toBe("p2");

    // Without state filter: returns all records for the machine
    const all = await getAllAlignmentRecords("test");
    expect(all).toHaveLength(3);
  });

  test("AlignmentRecord includes state field when created with state", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    await updateAlignment("p1", "test", true, "my-state");

    const records = await getAllAlignmentRecords("test", "my-state");
    expect(records).toHaveLength(1);
    expect(records[0].state).toBe("my-state");
  });

  test("AlignmentRecord has undefined state when created without state", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "test",
      strategyFnName: "firstAvailable",
    });

    await updateAlignment("p1", "test", true);

    const records = await getAllAlignmentRecords("test");
    expect(records).toHaveLength(1);
    expect(records[0].state).toBeUndefined();
  });
});

describe("Multi-state specialist declarations", () => {
  beforeEach(async () => {
    await clear();
  });

  test("different states can declare different specialists", async () => {
    await registerProposer({
      specialistId: "legal-reviewer",
      machineName: "multi-state-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "engineer",
      machineName: "multi-state-test",
      strategyFnName: "firstAvailable",
    });

    const session = await createSession(multiStateMachine());

    // In "review" state, should get legal-reviewer
    const reviewProposers = await getProposersForState(session);
    expect(reviewProposers).toHaveLength(1);
    expect(reviewProposers[0].specialistId).toBe("legal-reviewer");

    // review-arbiter and build-arbiter auto-registered by createSession
    const reviewArbiter = await getArbiterForState(session);
    expect(reviewArbiter?.specialistId).toBe("review-arbiter");
  });
});

describe("Disabled flag", () => {
  beforeEach(async () => {
    await clear();
  });

  test("disabled specialist is in getProposersForState but not getEnabledProposersForState", async () => {
    await registerProposer({
      specialistId: "state-p1",
      machineName: "per-state-test",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "state-p2",
      machineName: "per-state-test",
      strategyFnName: "firstAvailable",
    });

    const session = await createSession(perStateMachine());

    const all = await getProposersForState(session);
    expect(all).toHaveLength(2);

    const enabled = await getEnabledProposersForState(session);
    expect(enabled).toHaveLength(1);
    expect(enabled[0].specialistId).toBe("state-p1");
  });

  test("disabled is per-state, not global — same specialist can be enabled in other states", async () => {
    await registerProposer({
      specialistId: "state-p2",
      machineName: "per-state-test",
      strategyFnName: "firstAvailable",
    });

    const session = await createSession(perStateMachine());

    // In "active" state, state-p2 is disabled
    const enabledActive = await getEnabledProposersForState(session);
    expect(enabledActive.find((p) => p.specialistId === "state-p2")).toBeUndefined();

    // But the specialist itself is globally enabled (enabled !== false)
    const specialist = await getSpecialist("state-p2");
    expect(specialist).toBeDefined();
    expect((specialist as { enabled?: boolean }).enabled).not.toBe(false);
  });
});
