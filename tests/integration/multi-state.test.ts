/**
 * Integration Tests - Multi-State Machine Traversal
 * DIAL_305–DIAL_311
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
  runSession,
} from "../../src/dialai/index.js";
import type {
  MachineDefinition,
  ProposerContext,
  ProposerStrategyResult,
} from "../../src/dialai/types.js";

describe("Integration: Multi-State Machine Traversal", () => {
  beforeEach(() => {
    clear();
  });

  it("DIAL_305: session traverses 2-state machine", async () => {
    const machine: MachineDefinition = {
      machineName: "two-state",
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

    const session = await runSession(machine);

    expect(session.currentState).toBe("end");
    expect(session.history).toHaveLength(1);
    expect(session.history[0].transitionName).toBe("finish");
  });

  it("DIAL_306: session traverses 3-state linear machine", async () => {
    const machine: MachineDefinition = {
      machineName: "three-state",
      initialState: "a",
      goalState: "c",
      states: {
        a: {
          prompt: "Go to B",
          transitions: { to_b: "b" },
        },
        b: {
          prompt: "Go to C",
          transitions: { to_c: "c" },
        },
        c: {},
      },
    };

    const session = await runSession(machine);

    expect(session.currentState).toBe("c");
    expect(session.history).toHaveLength(2);
    expect(session.history[0].transitionName).toBe("to_b");
    expect(session.history[1].transitionName).toBe("to_c");
  });

  it("DIAL_307: session traverses branching machine", async () => {
    const machine: MachineDefinition = {
      machineName: "branching",
      initialState: "start",
      goalState: "done",
      states: {
        start: {
          prompt: "Choose a branch",
          transitions: {
            left: "left_node",
            right: "right_node",
          },
        },
        left_node: {
          prompt: "Continue to done",
          transitions: { finish: "done" },
        },
        right_node: {
          prompt: "Continue to done",
          transitions: { finish: "done" },
        },
        done: {},
      },
    };

    // runSession uses default firstAvailable proposer + firstProposal arbiter
    const session = await runSession(machine);

    expect(session.currentState).toBe("done");
    expect(session.history).toHaveLength(2);
    // firstAvailable picks "left" (first key)
    expect(session.history[0].transitionName).toBe("left");
  });

  it("DIAL_308: history records all transitions in order", async () => {
    const machine: MachineDefinition = {
      machineName: "history-check",
      initialState: "s1",
      goalState: "s4",
      states: {
        s1: {
          prompt: "Step 1",
          transitions: { step1: "s2" },
        },
        s2: {
          prompt: "Step 2",
          transitions: { step2: "s3" },
        },
        s3: {
          prompt: "Step 3",
          transitions: { step3: "s4" },
        },
        s4: {},
      },
    };

    const session = await runSession(machine);

    expect(session.history).toHaveLength(3);
    expect(session.history[0].transitionName).toBe("step1");
    expect(session.history[1].transitionName).toBe("step2");
    expect(session.history[2].transitionName).toBe("step3");

    // Each record has a timestamp
    for (const record of session.history) {
      expect(record.executionTimestamp).toBeInstanceOf(Date);
    }
  });

  it("DIAL_309: roundId regenerated at each state transition", async () => {
    const machine: MachineDefinition = {
      machineName: "round-regen",
      initialState: "a",
      goalState: "c",
      states: {
        a: {
          prompt: "Go to B",
          transitions: { to_b: "b" },
        },
        b: {
          prompt: "Go to C",
          transitions: { to_c: "c" },
        },
        c: {},
      },
    };

    const session = await createSession(machine);
    const roundId1 = session.currentRoundId;

    await registerProposer({
      specialistId: "p1",
      machineName: "round-regen",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "round-regen",
      strategyFnName: "firstProposal",
    });

    // First transition
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
      roundId: roundId1,
    });
    await submitArbitration({
      sessionId: session.sessionId,
      roundId: roundId1,
    });

    const afterFirst = await getSession(session.sessionId);
    const roundId2 = afterFirst.currentRoundId;

    expect(roundId2).not.toBe(roundId1);

    // Second transition
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
      roundId: roundId2,
    });
    await submitArbitration({
      sessionId: session.sessionId,
      roundId: roundId2,
    });

    const afterSecond = await getSession(session.sessionId);
    const roundId3 = afterSecond.currentRoundId;

    expect(roundId3).not.toBe(roundId2);
    expect(roundId3).not.toBe(roundId1);
  });

  it("DIAL_310: state prompt changes per state", async () => {
    const capturedPrompts: string[] = [];

    const machine: MachineDefinition = {
      machineName: "prompt-change",
      initialState: "a",
      goalState: "c",
      states: {
        a: {
          prompt: "Prompt for state A",
          transitions: { to_b: "b" },
        },
        b: {
          prompt: "Prompt for state B",
          transitions: { to_c: "c" },
        },
        c: {},
      },
      specialists: [
        {
          role: "proposer",
          specialistId: "capture-proposer",
          strategyFn: `unused`,
        },
        {
          role: "arbiter",
          specialistId: "capture-arbiter",
          strategyFnName: "firstProposal",
        },
      ],
    };

    // Register manually to use a real strategyFn
    const session = await createSession(machine);

    await registerProposer({
      specialistId: "capture-proposer",
      machineName: "prompt-change",
      strategyFn: async (ctx: ProposerContext): Promise<ProposerStrategyResult> => {
        capturedPrompts.push(ctx.prompt);
        const transitionName = Object.keys(ctx.transitions)[0];
        return {
          transitionName,
          toState: ctx.transitions[transitionName],
          reasoning: "Captured prompt",
        };
      },
    });
    await registerArbiter({
      specialistId: "capture-arbiter",
      machineName: "prompt-change",
      strategyFnName: "firstProposal",
    });

    // Transition through A -> B -> C
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "capture-proposer",
      roundId: session.currentRoundId,
    });
    await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
    });

    const afterFirst = await getSession(session.sessionId);

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "capture-proposer",
      roundId: afterFirst.currentRoundId,
    });
    await submitArbitration({
      sessionId: session.sessionId,
      roundId: afterFirst.currentRoundId,
    });

    expect(capturedPrompts).toHaveLength(2);
    expect(capturedPrompts[0]).toBe("Prompt for state A");
    expect(capturedPrompts[1]).toBe("Prompt for state B");
  });

  it("DIAL_311: transitions available change per state", async () => {
    const capturedTransitions: Record<string, string>[] = [];

    const machine: MachineDefinition = {
      machineName: "transition-change",
      initialState: "a",
      goalState: "c",
      states: {
        a: {
          prompt: "State A",
          transitions: { to_b: "b", skip: "c" },
        },
        b: {
          prompt: "State B",
          transitions: { to_c: "c" },
        },
        c: {},
      },
    };

    const session = await createSession(machine);

    await registerProposer({
      specialistId: "capture-proposer",
      machineName: "transition-change",
      strategyFn: async (ctx: ProposerContext): Promise<ProposerStrategyResult> => {
        capturedTransitions.push({ ...ctx.transitions });
        const transitionName = Object.keys(ctx.transitions)[0];
        return {
          transitionName,
          toState: ctx.transitions[transitionName],
          reasoning: "Captured transitions",
        };
      },
    });
    await registerArbiter({
      specialistId: "capture-arbiter",
      machineName: "transition-change",
      strategyFnName: "firstProposal",
    });

    // Transition A -> B
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "capture-proposer",
      roundId: session.currentRoundId,
    });
    await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
    });

    const afterFirst = await getSession(session.sessionId);

    // Transition B -> C
    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "capture-proposer",
      roundId: afterFirst.currentRoundId,
    });
    await submitArbitration({
      sessionId: session.sessionId,
      roundId: afterFirst.currentRoundId,
    });

    expect(capturedTransitions).toHaveLength(2);
    // State A has two transitions
    expect(capturedTransitions[0]).toEqual({ to_b: "b", skip: "c" });
    // State B has one transition
    expect(capturedTransitions[1]).toEqual({ to_c: "c" });
  });
});
