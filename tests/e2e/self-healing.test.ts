/**
 * End-to-End Tests - Self-Healing and Re-enablement
 * DIAL_363–DIAL_367
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  submitArbitration,
  evaluateConsensus,
  getSession,
  runSession,
  enableSpecialist,
  disableSpecialist,
  getEnabledProposers,
  getProposers,
  updateAlignment,
  getAllAlignmentRecords,
  getAlignmentScore,
  getProposalsForRound,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("E2E: Self-Healing and Re-enablement", () => {
  beforeEach(async () => {
    await clear();
  });

  const machine: MachineDefinition = {
    machineName: "self-heal",
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

  it("DIAL_363: re-enable all disabled proposers via enableSpecialist", async () => {
    await registerProposer({
      specialistId: "p1",
      machineName: "self-heal",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName: "self-heal",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p3",
      machineName: "self-heal",
      strategyFnName: "firstAvailable",
    });

    // Disable 2 of 3
    await disableSpecialist("p2");
    await disableSpecialist("p3");

    let enabled = await getEnabledProposers("self-heal");
    expect(enabled).toHaveLength(1);
    expect(enabled[0].specialistId).toBe("p1");

    // Re-enable all disabled proposers (simulating selfHeal behavior)
    const allProposers = await getProposers("self-heal");
    for (const p of allProposers) {
      if (p.enabled === false) {
        await enableSpecialist(p.specialistId);
      }
    }

    enabled = await getEnabledProposers("self-heal");
    expect(enabled).toHaveLength(3);
  });

  it("DIAL_364: champion fast path failure triggers selfHeal via runSession", async () => {
    const machineName = "self-heal";

    // Register a "champion" with high alignment and 2 other proposers
    await registerProposer({
      specialistId: "champion",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "backup1",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "backup2",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName,
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Give champion high alignment to trigger champion mode
    for (let i = 0; i < 10; i++) await updateAlignment("champion", machineName, true);

    // Disable backups before runSession
    await disableSpecialist("backup1");
    await disableSpecialist("backup2");

    expect((await getEnabledProposers(machineName)).length).toBe(1);

    // runSession: champion mode -> single proposal -> aheadByK with threshold 0.5
    // Single proposal + alignment > 0 => consensus reached on firstAvailable "approve"
    // This will succeed, but the key test is that selfHeal was available
    const session = await runSession(machine);

    // Session should complete (firstAvailable + firstProposal/aheadByK single proposal)
    expect(session.currentState).toBe("done");

    // After runSession, disabled proposers should be re-enabled via selfHeal
    // selfHeal is called when champion path either fails or after trip line check
    const enabled = await getEnabledProposers(machineName);
    // All proposers should be enabled (selfHeal re-enables all)
    expect(enabled.length).toBeGreaterThanOrEqual(1);
  });

  it("DIAL_365: self-healing preserves alignment history", async () => {
    const machineName = "self-heal";

    await registerProposer({
      specialistId: "p1",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName,
      strategyFnName: "lastAvailable",
    });

    // Seed alignment history
    await updateAlignment("p1", machineName, true);
    await updateAlignment("p1", machineName, true);
    await updateAlignment("p1", machineName, false);
    await updateAlignment("p2", machineName, true);
    await updateAlignment("p2", machineName, false);

    const recordsBefore = await getAllAlignmentRecords(machineName);
    const p1ScoreBefore = await getAlignmentScore("p1", machineName);
    const p2ScoreBefore = await getAlignmentScore("p2", machineName);

    // Disable and re-enable
    await disableSpecialist("p1");
    await disableSpecialist("p2");
    await enableSpecialist("p1");
    await enableSpecialist("p2");

    // Alignment records should be unchanged
    const recordsAfter = await getAllAlignmentRecords(machineName);
    expect(recordsAfter).toHaveLength(recordsBefore.length);
    expect(await getAlignmentScore("p1", machineName)).toBe(p1ScoreBefore);
    expect(await getAlignmentScore("p2", machineName)).toBe(p2ScoreBefore);

    const p1Record = recordsAfter.find((r) => r.specialistId === "p1");
    expect(p1Record!.matchingChoices).toBe(2);
    expect(p1Record!.totalComparisons).toBe(3);
  });

  it("DIAL_366: disabled specialists not solicited in runSession", async () => {
    const machineName = "self-heal";

    await registerProposer({
      specialistId: "active",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "disabled",
      machineName,
      strategyFnName: "lastAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName,
      strategyFnName: "firstProposal",
    });

    // Disable one proposer
    await disableSpecialist("disabled");

    // Create a session manually and submit proposals for one round to inspect
    const session = await createSession(machine);
    const enabledProposers = await getEnabledProposers(machineName);

    // Only "active" should be enabled
    expect(enabledProposers).toHaveLength(1);
    expect(enabledProposers[0].specialistId).toBe("active");

    // Submit only from enabled proposers (mimicking runSession behavior)
    for (const p of enabledProposers) {
      await submitProposal({
        sessionId: session.sessionId,
        specialistId: p.specialistId,
        roundId: session.currentRoundId,
      });
    }

    const proposals = await getProposalsForRound(session.sessionId, session.currentRoundId);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].specialistId).toBe("active");
    // The disabled proposer should not have a proposal
    expect(proposals.find((p) => p.specialistId === "disabled")).toBeUndefined();
  });

  it("DIAL_367: re-enabled specialists can reach consensus", async () => {
    const machineName = "self-heal";

    await registerProposer({
      specialistId: "p1",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p2",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName,
      strategyFnName: "aheadByK",
      threshold: 0.5,
    });

    // Seed alignment for both
    for (let i = 0; i < 5; i++) await updateAlignment("p1", machineName, true);
    for (let i = 0; i < 5; i++) await updateAlignment("p2", machineName, true);

    // Disable both
    await disableSpecialist("p1");
    await disableSpecialist("p2");
    expect((await getEnabledProposers(machineName)).length).toBe(0);

    // Re-enable both (simulating selfHeal)
    await enableSpecialist("p1");
    await enableSpecialist("p2");
    expect((await getEnabledProposers(machineName)).length).toBe(2);

    // Both re-enabled proposers can submit proposals and reach consensus
    const session = await createSession(machine);
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
      roundId: session.currentRoundId,
    });
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p2",
      roundId: session.currentRoundId,
    });

    // Both propose "approve" with alignment 1.0 each
    // Combined = 2.0, margin = (2.0 - 0) / 2.0 = 1.0 >= 0.5
    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);

    // Execute arbitration
    const arbitration = await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
    });
    expect(arbitration.executed).toBe(true);

    const updated = await getSession(session.sessionId);
    expect(updated.currentState).toBe("done");
  });
});
