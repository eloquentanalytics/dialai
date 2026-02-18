/**
 * E2E Tests - Multi-Machine Isolation
 * DIAL_378–DIAL_382
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  getSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  submitArbitration,
  getProposers,
  getAlignmentScore,
  updateAlignment,
  getAllAlignmentRecords,
  createExemplar,
  getExemplars,
  getProposalsForRound,
  runSession,
} from "../../src/dialai/index.js";
import type {
  MachineDefinition,
  ProposerContext,
} from "../../src/dialai/types.js";

describe("E2E: Multi-Machine Isolation", () => {
  beforeEach(() => {
    clear();
  });

  const machineA: MachineDefinition = {
    machineName: "machine-a",
    initialState: "start",
    goalState: "end",
    states: {
      start: {
        prompt: "Go to end",
        transitions: { finish: "end" },
      },
      end: {},
    },
  };

  const machineB: MachineDefinition = {
    machineName: "machine-b",
    initialState: "start",
    goalState: "end",
    states: {
      start: {
        prompt: "Go to end",
        transitions: { finish: "end" },
      },
      end: {},
    },
  };

  it("DIAL_378: specialists scoped to their machineName", async () => {
    await registerProposer({
      specialistId: "p-a",
      machineName: "machine-a",
      strategyFnName: "firstAvailable",
    });

    const proposersA = getProposers("machine-a");
    const proposersB = getProposers("machine-b");

    expect(proposersA).toHaveLength(1);
    expect(proposersA[0].specialistId).toBe("p-a");
    expect(proposersB).toHaveLength(0);
  });

  it("DIAL_379: alignment tracked per machine", async () => {
    // Register proposer for machine A
    await registerProposer({
      specialistId: "shared-p-a",
      machineName: "machine-a",
      strategyFnName: "firstAvailable",
    });

    // Register a different proposer with a different ID for machine B
    await registerProposer({
      specialistId: "shared-p-b",
      machineName: "machine-b",
      strategyFnName: "firstAvailable",
    });

    // Seed alignment for shared-p-a on machine-a
    updateAlignment("shared-p-a", "machine-a", true);
    updateAlignment("shared-p-a", "machine-a", true);

    // Seed alignment for shared-p-b on machine-b
    updateAlignment("shared-p-b", "machine-b", false);

    // Verify independent alignment records
    expect(getAlignmentScore("shared-p-a", "machine-a")).toBe(1.0);
    expect(getAlignmentScore("shared-p-b", "machine-b")).toBe(0);

    // Cross-machine queries return 0 (no record)
    expect(getAlignmentScore("shared-p-a", "machine-b")).toBe(0);
    expect(getAlignmentScore("shared-p-b", "machine-a")).toBe(0);

    const recordsA = getAllAlignmentRecords("machine-a");
    const recordsB = getAllAlignmentRecords("machine-b");

    expect(recordsA).toHaveLength(1);
    expect(recordsA[0].specialistId).toBe("shared-p-a");
    expect(recordsB).toHaveLength(1);
    expect(recordsB[0].specialistId).toBe("shared-p-b");
  });

  it("DIAL_380: exemplars scoped per machine", async () => {
    const sessionA = await createSession(machineA);

    // Create an exemplar for machine A
    const ctx: ProposerContext = {
      sessionId: sessionA.sessionId,
      currentState: "start",
      prompt: "Go to end",
      transitions: { finish: "end" },
      history: [],
    };

    createExemplar("machine-a", "start", ctx, "finish", "end", []);

    const exemplarsA = getExemplars("machine-a");
    const exemplarsB = getExemplars("machine-b");

    expect(exemplarsA).toHaveLength(1);
    expect(exemplarsA[0].humanTransitionName).toBe("finish");
    expect(exemplarsB).toHaveLength(0);
  });

  it("DIAL_381: concurrent sessions on different machines run independently", async () => {
    const sessionA = await runSession(machineA);
    const sessionB = await runSession(machineB);

    // Both should reach their goal states independently
    expect(sessionA.currentState).toBe("end");
    expect(sessionA.machineName).toBe("machine-a");
    expect(sessionA.history).toHaveLength(1);

    expect(sessionB.currentState).toBe("end");
    expect(sessionB.machineName).toBe("machine-b");
    expect(sessionB.history).toHaveLength(1);

    // Sessions are distinct
    expect(sessionA.sessionId).not.toBe(sessionB.sessionId);
  });

  it("DIAL_382: concurrent sessions on same machine share specialists but have independent proposals", async () => {
    // Register shared specialists
    await registerProposer({
      specialistId: "shared-proposer",
      machineName: "machine-a",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "shared-arbiter",
      machineName: "machine-a",
      strategyFnName: "firstProposal",
    });

    // Create two sessions on the same machine
    const session1 = await createSession(machineA);
    const session2 = await createSession(machineA);

    // Submit proposals to session 1
    await submitProposal({
      sessionId: session1.sessionId,
      specialistId: "shared-proposer",
      roundId: session1.currentRoundId,
    });

    // Check proposals are isolated
    const proposals1 = getProposalsForRound(session1.sessionId, session1.currentRoundId);
    const proposals2 = getProposalsForRound(session2.sessionId, session2.currentRoundId);

    expect(proposals1).toHaveLength(1);
    expect(proposals2).toHaveLength(0);

    // Submit to session 2 separately
    await submitProposal({
      sessionId: session2.sessionId,
      specialistId: "shared-proposer",
      roundId: session2.currentRoundId,
    });

    const proposals2After = getProposalsForRound(session2.sessionId, session2.currentRoundId);
    expect(proposals2After).toHaveLength(1);

    // Arbitrate session 1
    const result1 = await submitArbitration({
      sessionId: session1.sessionId,
      roundId: session1.currentRoundId,
    });
    expect(result1.executed).toBe(true);

    // Session 2 remains untouched
    const s2 = await getSession(session2.sessionId);
    expect(s2.currentState).toBe("start");
  });
});
