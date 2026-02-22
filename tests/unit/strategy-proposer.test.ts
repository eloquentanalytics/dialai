import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  firstAvailable,
  lastAvailable,
  randomProposer,
  weightedRandom,
} from "../../src/dialai/index.js";
import type { ProposerContext } from "../../src/dialai/types.js";

function twoTransitionContext(): ProposerContext {
  return {
    sessionId: "test",
    currentState: "pending",
    prompt: "Test?",
    transitions: { approve: "approved", reject: "rejected" },
    history: [],
  };
}

function singleTransitionContext(): ProposerContext {
  return {
    sessionId: "test",
    currentState: "pending",
    prompt: "Test?",
    transitions: { go: "done" },
    history: [],
  };
}

function noTransitionContext(): ProposerContext {
  return {
    sessionId: "test",
    currentState: "terminal",
    prompt: "Stuck",
    transitions: {},
    history: [],
  };
}

describe("DIAL_143–DIAL_150: Proposer Strategies", () => {
  beforeEach(async () => {
    await clear();
  });

  test("DIAL_143: firstAvailable picks first transition by insertion order", async () => {
    const ctx = twoTransitionContext();
    const result = await firstAvailable(ctx);

    expect(result.transitionName).toBe("approve");
    expect(result.toState).toBe("approved");
  });

  test("DIAL_144: lastAvailable picks last transition by insertion order", async () => {
    const ctx = twoTransitionContext();
    const result = await lastAvailable(ctx);

    expect(result.transitionName).toBe("reject");
    expect(result.toState).toBe("rejected");
  });

  test("DIAL_145: random picks from available transitions", async () => {
    const ctx = twoTransitionContext();
    const validNames = Object.keys(ctx.transitions);

    for (let i = 0; i < 100; i++) {
      const result = await randomProposer(ctx);
      expect(validNames).toContain(result.transitionName);
      expect(result.toState).toBe(ctx.transitions[result.transitionName]);
    }
  });

  test("DIAL_146: weightedRandom picks from available transitions", async () => {
    const ctx = twoTransitionContext();
    const validNames = Object.keys(ctx.transitions);

    for (let i = 0; i < 100; i++) {
      const result = await weightedRandom(ctx);
      expect(validNames).toContain(result.transitionName);
      expect(result.toState).toBe(ctx.transitions[result.transitionName]);
    }
  });

  test("DIAL_147: firstAvailable with single transition", async () => {
    const ctx = singleTransitionContext();
    const result = await firstAvailable(ctx);

    expect(result.transitionName).toBe("go");
    expect(result.toState).toBe("done");
  });

  test("DIAL_148: random with single transition", async () => {
    const ctx = singleTransitionContext();
    const result = await randomProposer(ctx);

    expect(result.transitionName).toBe("go");
    expect(result.toState).toBe("done");
  });

  test("DIAL_149: firstAvailable throws with no transitions", async () => {
    const ctx = noTransitionContext();

    await expect(firstAvailable(ctx)).rejects.toThrow(
      "No transitions available from current state"
    );
  });

  test("DIAL_150: all proposer strategies return ProposerStrategyResult shape", async () => {
    const ctx = twoTransitionContext();
    const strategies = [firstAvailable, lastAvailable, randomProposer, weightedRandom];

    for (const strategy of strategies) {
      const result = await strategy(ctx);

      expect(result).toHaveProperty("transitionName");
      expect(result).toHaveProperty("toState");
      expect(result).toHaveProperty("reasoning");
      expect(typeof result.transitionName).toBe("string");
      expect(typeof result.toState).toBe("string");
      expect(typeof result.reasoning).toBe("string");
    }
  });
});
