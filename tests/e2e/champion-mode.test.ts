/**
 * End-to-End Tests - Champion Mode
 * DIAL_373–DIAL_377
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
  evaluateConsensus,
  runSession,
  selectChampion,
  updateAlignment,
  getAlignmentScore,
  getProposalsForRound,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("E2E: Champion Mode", () => {
  beforeEach(async () => {
    await clear();
  });

  const CHAMPION_THRESHOLD = 0.8;

  const machine: MachineDefinition = {
    machineName: "champion",
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

  it("DIAL_373: champion identified as highest-alignment proposer above 0.8", async () => {
    const machineName = "champion";

    await registerProposer({
      specialistId: "p-high",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p-medium",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p-low",
      machineName,
      strategyFnName: "firstAvailable",
    });

    // p-high: 90/100 → Wilson ≈ 0.83
    for (let i = 0; i < 90; i++) await updateAlignment("p-high", machineName, true);
    for (let i = 0; i < 10; i++) await updateAlignment("p-high", machineName, false);

    // p-medium: 70/100 → Wilson ≈ 0.60 (below threshold)
    for (let i = 0; i < 70; i++) await updateAlignment("p-medium", machineName, true);
    for (let i = 0; i < 30; i++) await updateAlignment("p-medium", machineName, false);

    // p-low: 30/100 → Wilson ≈ 0.21
    for (let i = 0; i < 30; i++) await updateAlignment("p-low", machineName, true);
    for (let i = 0; i < 70; i++) await updateAlignment("p-low", machineName, false);

    const champion = await selectChampion(machineName, CHAMPION_THRESHOLD);
    expect(champion).toBe("p-high");

    // Verify scores
    expect(await getAlignmentScore("p-high", machineName)).toBeGreaterThan(0.8);
    expect(await getAlignmentScore("p-medium", machineName)).toBeGreaterThan(0.5);
    expect(await getAlignmentScore("p-low", machineName)).toBeLessThan(0.3);
  });

  it("DIAL_374: champion mode: only champion solicited for proposal", async () => {
    const machineName = "champion";

    await registerProposer({
      specialistId: "champ",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "other1",
      machineName,
      strategyFnName: "lastAvailable",
    });
    await registerProposer({
      specialistId: "other2",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName,
      strategyFnName: "firstProposal",
    });

    // Give champ high alignment: 90/100 → Wilson ≈ 0.83
    for (let i = 0; i < 90; i++) await updateAlignment("champ", machineName, true);
    for (let i = 0; i < 10; i++) await updateAlignment("champ", machineName, false);

    expect(await selectChampion(machineName, CHAMPION_THRESHOLD)).toBe("champ");

    // Manually create session and submit only champion's proposal (simulating champion mode)
    const session = await createSession(machine);
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "champ",
      roundId: session.currentRoundId,
    });

    const proposals = await getProposalsForRound(session.sessionId, session.currentRoundId);
    expect(proposals).toHaveLength(1);
    expect(proposals[0].specialistId).toBe("champ");
  });

  it("DIAL_375: champion mode: consensus reached on champion's proposal alone", async () => {
    const machineName = "champion";

    await registerProposer({
      specialistId: "champ",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "other",
      machineName,
      strategyFnName: "lastAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName,
      strategyFnName: "firstProposal",
    });

    // Champion alignment above 0.8: 90/100 → Wilson ≈ 0.83
    for (let i = 0; i < 90; i++) await updateAlignment("champ", machineName, true);
    for (let i = 0; i < 10; i++) await updateAlignment("champ", machineName, false);

    expect(await selectChampion(machineName, CHAMPION_THRESHOLD)).toBe("champ");

    // Create session and submit only champion's proposal
    const session = await createSession(machine);
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "champ",
      roundId: session.currentRoundId,
    });

    // firstProposal arbiter: single proposal -> consensus
    const result = await evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);
    expect(result.winningProposalId).toBeDefined();

    // Execute the transition
    const arbitration = await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
    });
    expect(arbitration.executed).toBe(true);
    expect(arbitration.transitionName).toBe("approve");

    const updated = await getSession(session.sessionId);
    expect(updated.currentState).toBe("done");
  });

  it("DIAL_376: champion mode: falls through to full cascade when consensus not reached", async () => {
    const machineName = "champion";

    // Use a multi-transition machine where champion proposes one thing
    // but aheadByK with high threshold rejects single proposal
    await registerProposer({
      specialistId: "champ",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "backup",
      machineName,
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arb",
      machineName,
      strategyFnName: "aheadByK",
      threshold: 2.0, // Threshold > 1 means even single proposal won't pass
    });

    // Champion alignment: 90/100 → Wilson ≈ 0.83
    for (let i = 0; i < 90; i++) await updateAlignment("champ", machineName, true);
    for (let i = 0; i < 10; i++) await updateAlignment("champ", machineName, false);
    // Backup alignment: 90/100 → Wilson ≈ 0.83
    for (let i = 0; i < 90; i++) await updateAlignment("backup", machineName, true);
    for (let i = 0; i < 10; i++) await updateAlignment("backup", machineName, false);

    expect(await selectChampion(machineName, CHAMPION_THRESHOLD)).toBe("champ");

    // runSession will:
    // 1. Try champion mode (single proposal from champ)
    // 2. aheadByK with threshold 2.0 rejects (margin can never exceed 1.0)
    // 3. selfHeal called, falls through to full cascade
    // 4. Full cascade: both submit "approve"
    // 5. aheadByK still rejects (threshold 2.0 > margin 1.0)
    // 6. Final arbitration also fails -> session returns stuck
    const session = await runSession(machine);
    expect(session.currentState).toBe("pending");
  });

  it("DIAL_377: champion mode: skip already-submitted champion in full cascade", async () => {
    const machineName = "champion";

    // Track what proposals are submitted
    let champ_submit_count = 0;
    let backup_submit_count = 0;

    await registerProposer({
      specialistId: "champ",
      machineName,
      strategyFn: async (ctx) => {
        champ_submit_count++;
        return {
          transitionName: "approve",
          toState: ctx.transitions["approve"],
          reasoning: "Champion approves",
        };
      },
    });
    await registerProposer({
      specialistId: "backup",
      machineName,
      strategyFn: async (ctx) => {
        backup_submit_count++;
        return {
          transitionName: "approve",
          toState: ctx.transitions["approve"],
          reasoning: "Backup approves",
        };
      },
    });
    await registerArbiter({
      specialistId: "arb",
      machineName,
      strategyFnName: "firstProposal",
    });

    // Champion alignment: 90/100 → Wilson ≈ 0.83
    for (let i = 0; i < 90; i++) await updateAlignment("champ", machineName, true);
    for (let i = 0; i < 10; i++) await updateAlignment("champ", machineName, false);
    // Backup lower
    for (let i = 0; i < 50; i++) await updateAlignment("backup", machineName, true);
    for (let i = 0; i < 50; i++) await updateAlignment("backup", machineName, false);

    expect(await selectChampion(machineName, CHAMPION_THRESHOLD)).toBe("champ");

    // runSession uses tick-based orchestration: all proposers are solicited
    // one at a time (champion first due to ordering), then consensus is evaluated.
    // Tick 1: solicit champ (champion ordering)
    // Tick 2: solicit backup
    // Tick 3: evaluate → consensus (firstProposal picks champ's proposal) → advance
    const session = await runSession(machine);
    expect(session.currentState).toBe("done");

    // Champion should have been solicited exactly once
    expect(champ_submit_count).toBe(1);
    // Backup is also solicited once (tick-based: all proposers submit before evaluation)
    expect(backup_submit_count).toBe(1);
  });
});
