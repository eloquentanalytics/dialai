/**
 * E2E Tests - Semantic Isolation Verification
 * DIAL_388–DIAL_392
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
} from "../../src/dialai/index.js";
import type {
  MachineDefinition,
  ProposerContext,
} from "../../src/dialai/types.js";

describe("E2E: Semantic Isolation Verification", () => {
  beforeEach(async () => {
    await clear();
  });

  const machine: MachineDefinition = {
    machineName: "isolation-test",
    initialState: "start",
    goalState: "end",
    states: {
      start: {
        prompt: "Choose a path",
        transitions: { go: "mid" },
      },
      mid: {
        prompt: "Continue",
        transitions: { finish: "end" },
      },
      end: {},
    },
  };

  it("DIAL_388: ProposerContext does not contain consensus scores", async () => {
    let capturedCtx: ProposerContext | undefined;

    const session = await createSession(machine);

    await registerProposer({
      specialistId: "ctx-observer",
      machineName: "isolation-test",
      strategyFn: async (ctx: ProposerContext) => {
        capturedCtx = ctx;
        const first = Object.keys(ctx.transitions)[0];
        return {
          transitionName: first,
          toState: ctx.transitions[first].target,
          reasoning: "observing context",
        };
      },
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "isolation-test",
      strategyFnName: "firstProposal",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "ctx-observer",
    });

    expect(capturedCtx).toBeDefined();

    // Verify no consensus/scoring fields leak into ProposerContext
    const ctxAsAny = capturedCtx as Record<string, unknown>;
    expect(ctxAsAny["scores"]).toBeUndefined();
    expect(ctxAsAny["consensus"]).toBeUndefined();
    expect(ctxAsAny["consensusResult"]).toBeUndefined();
    expect(ctxAsAny["consensusScores"]).toBeUndefined();

    // Verify only expected keys are present
    const expectedKeys = ["sessionId", "currentState", "prompt", "transitions", "history", "metaJson"];
    const actualKeys = Object.keys(capturedCtx!);
    for (const key of actualKeys) {
      expect(expectedKeys).toContain(key);
    }
  });

  it("DIAL_389: ProposerContext does not contain alignment scores", async () => {
    let capturedCtx: ProposerContext | undefined;

    const session = await createSession(machine);

    await registerProposer({
      specialistId: "alignment-observer",
      machineName: "isolation-test",
      strategyFn: async (ctx: ProposerContext) => {
        capturedCtx = ctx;
        const first = Object.keys(ctx.transitions)[0];
        return {
          transitionName: first,
          toState: ctx.transitions[first].target,
          reasoning: "checking alignment isolation",
        };
      },
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "isolation-test",
      strategyFnName: "firstProposal",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "alignment-observer",
    });

    expect(capturedCtx).toBeDefined();

    const ctxAsAny = capturedCtx as Record<string, unknown>;
    expect(ctxAsAny["alignmentScores"]).toBeUndefined();
    expect(ctxAsAny["alignmentScore"]).toBeUndefined();
    expect(ctxAsAny["alignment"]).toBeUndefined();
  });

  it("DIAL_392: exemplars in ProposerContext history are domain-native", async () => {
    let capturedCtxRound2: ProposerContext | undefined;

    const session = await createSession(machine);

    // Round 1: execute a transition to build history
    await registerProposer({
      specialistId: "history-builder",
      machineName: "isolation-test",
      strategyFn: async (ctx: ProposerContext) => {
        const first = Object.keys(ctx.transitions)[0];
        return {
          transitionName: first,
          toState: ctx.transitions[first].target,
          reasoning: "building history",
        };
      },
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "isolation-test",
      strategyFnName: "firstProposal",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "history-builder",
    });
    await submitArbitration({
      sessionId: session.sessionId,
    });

    // Now in "mid" state. Round 2: capture context with history
    const updated = await getSession(session.sessionId);
    expect(updated.currentState).toBe("mid");

    // Re-register a new proposer for round 2 context capture
    // (reuse the same one since it's already registered)
    let round2Called = false;
    // We need a new proposer since history-builder is already registered
    // Instead, let's submit another proposal via the same proposer but capture ctx
    // Actually, we need a different approach. Let's create a second proposer.
    await registerProposer({
      specialistId: "history-checker",
      machineName: "isolation-test",
      strategyFn: async (ctx: ProposerContext) => {
        capturedCtxRound2 = ctx;
        round2Called = true;
        const first = Object.keys(ctx.transitions)[0];
        return {
          transitionName: first,
          toState: ctx.transitions[first].target,
          reasoning: "checking history fields",
        };
      },
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "history-checker",
      roundId: updated.currentRoundId,
    });

    expect(round2Called).toBe(true);
    expect(capturedCtxRound2).toBeDefined();
    expect(capturedCtxRound2!.history).toHaveLength(1);

    const historyRecord = capturedCtxRound2!.history[0];

    // History records contain domain-native fields
    expect(historyRecord.transitionName).toBe("go");
    expect(historyRecord.reasoning).toBeDefined();
    expect(historyRecord.executionTimestamp).toBeInstanceOf(Date);

    // History records do NOT contain scoring metadata
    const recordAsAny = historyRecord as Record<string, unknown>;
    expect(recordAsAny["score"]).toBeUndefined();
    expect(recordAsAny["alignmentScore"]).toBeUndefined();
    expect(recordAsAny["consensusScore"]).toBeUndefined();
    expect(recordAsAny["proposalId"]).toBeUndefined();
    expect(recordAsAny["specialistId"]).toBeUndefined();

    // Only expected keys on TransitionRecord
    const expectedHistoryKeys = ["transitionName", "reasoning", "executionTimestamp", "metaJson"];
    for (const key of Object.keys(historyRecord)) {
      expect(expectedHistoryKeys).toContain(key);
    }
  });
});
