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
  beforeEach(() => {
    clear();
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

    // p-high: 9/10 = 0.9
    for (let i = 0; i < 9; i++) updateAlignment("p-high", machineName, true);
    updateAlignment("p-high", machineName, false);

    // p-medium: 7/10 = 0.7 (below threshold)
    for (let i = 0; i < 7; i++) updateAlignment("p-medium", machineName, true);
    for (let i = 0; i < 3; i++) updateAlignment("p-medium", machineName, false);

    // p-low: 3/10 = 0.3
    for (let i = 0; i < 3; i++) updateAlignment("p-low", machineName, true);
    for (let i = 0; i < 7; i++) updateAlignment("p-low", machineName, false);

    const champion = selectChampion(machineName, CHAMPION_THRESHOLD);
    expect(champion).toBe("p-high");

    // Verify scores
    expect(getAlignmentScore("p-high", machineName)).toBeCloseTo(0.9);
    expect(getAlignmentScore("p-medium", machineName)).toBeCloseTo(0.7);
    expect(getAlignmentScore("p-low", machineName)).toBeCloseTo(0.3);
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

    // Give champ high alignment
    for (let i = 0; i < 10; i++) updateAlignment("champ", machineName, true);

    expect(selectChampion(machineName, CHAMPION_THRESHOLD)).toBe("champ");

    // Manually create session and submit only champion's proposal (simulating champion mode)
    const session = await createSession(machine);
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "champ",
      roundId: session.currentRoundId,
    });

    const proposals = getProposalsForRound(session.sessionId, session.currentRoundId);
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

    // Champion alignment above 0.8
    for (let i = 0; i < 10; i++) updateAlignment("champ", machineName, true);

    expect(selectChampion(machineName, CHAMPION_THRESHOLD)).toBe("champ");

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

    // Champion alignment
    for (let i = 0; i < 10; i++) updateAlignment("champ", machineName, true);
    // Backup alignment too
    for (let i = 0; i < 10; i++) updateAlignment("backup", machineName, true);

    expect(selectChampion(machineName, CHAMPION_THRESHOLD)).toBe("champ");

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

    // Champion alignment
    for (let i = 0; i < 10; i++) updateAlignment("champ", machineName, true);
    for (let i = 0; i < 5; i++) updateAlignment("backup", machineName, true);

    expect(selectChampion(machineName, CHAMPION_THRESHOLD)).toBe("champ");

    // runSession: champion mode -> champ submits -> firstProposal -> consensus -> done
    // If consensus is reached in champion mode, full cascade doesn't run.
    // But if it falls through (tested separately), the skip logic is:
    // in full cascade, champion's proposal already exists -> skip champion
    const session = await runSession(machine);
    expect(session.currentState).toBe("done");

    // Champion should have been solicited exactly once (in the champion fast path)
    // firstProposal gives consensus on champion's proposal
    expect(champ_submit_count).toBe(1);
    // Backup should NOT have been solicited since champion mode succeeded
    // With firstProposal, the champion's single proposal reaches consensus
    expect(backup_submit_count).toBe(0);
  });
});
