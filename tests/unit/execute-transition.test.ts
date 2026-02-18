import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  registerProposer,
  submitProposal,
  executeTransition,
  getSession,
  getProposalsForRound,
  getVotesForRound,
  getSelectionVotesForRound,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

function threeStateMachine(): MachineDefinition {
  return {
    machineName: "transition-test",
    initialState: "a",
    goalState: "c",
    states: {
      a: { prompt: "Go to B", transitions: { to_b: "b" } },
      b: { prompt: "Go to C", transitions: { to_c: "c" } },
      c: {},
    },
  };
}

function noTransitionMachine(): MachineDefinition {
  return {
    machineName: "dead-end",
    initialState: "a",
    goalState: "b",
    states: {
      a: { prompt: "Stuck", transitions: { go: "b" } },
      b: {},
    },
  };
}

describe("DIAL_104–DIAL_114: Transition Execution", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_104: executes valid transition", async () => {
    const session = await createSession(threeStateMachine());

    await executeTransition(session.sessionId, "to_b", "b");

    const updated = await getSession(session.sessionId);
    expect(updated.currentState).toBe("b");
  });

  test("DIAL_105: records transition in history", async () => {
    const session = await createSession(threeStateMachine());

    await executeTransition(session.sessionId, "to_b", "b", "Going to B");

    const updated = await getSession(session.sessionId);
    expect(updated.history).toHaveLength(1);
    expect(updated.history[0].transitionName).toBe("to_b");
    expect(updated.history[0].reasoning).toBe("Going to B");
    expect(updated.history[0].executionTimestamp).toBeInstanceOf(Date);
  });

  test("DIAL_106: generates new roundId after transition", async () => {
    const session = await createSession(threeStateMachine());
    const oldRoundId = session.currentRoundId;

    await executeTransition(session.sessionId, "to_b", "b");

    const updated = await getSession(session.sessionId);
    expect(updated.currentRoundId).not.toBe(oldRoundId);
  });

  test("DIAL_107: clears proposals after transition", async () => {
    const session = await createSession(threeStateMachine());
    await registerProposer({
      specialistId: "p1",
      machineName: "transition-test",
      strategyFnName: "firstAvailable",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "p1",
      roundId: session.currentRoundId,
    });
    expect(getProposalsForRound(session.sessionId, session.currentRoundId)).toHaveLength(1);

    await executeTransition(session.sessionId, "to_b", "b");

    // Old round's proposals gone
    expect(getProposalsForRound(session.sessionId, session.currentRoundId)).toHaveLength(0);
  });

  test("DIAL_108: clears votes after transition", async () => {
    const session = await createSession(threeStateMachine());

    await executeTransition(session.sessionId, "to_b", "b");

    const updated = await getSession(session.sessionId);
    expect(getVotesForRound(session.sessionId, updated.currentRoundId)).toHaveLength(0);
  });

  test("DIAL_109: clears selection votes after transition", async () => {
    const session = await createSession(threeStateMachine());

    await executeTransition(session.sessionId, "to_b", "b");

    const updated = await getSession(session.sessionId);
    expect(getSelectionVotesForRound(session.sessionId, updated.currentRoundId)).toHaveLength(0);
  });

  test("DIAL_110: rejects transition not in current state", async () => {
    const session = await createSession(threeStateMachine());

    // to_c is only available from state "b", not "a"
    await expect(
      executeTransition(session.sessionId, "to_c", "c")
    ).rejects.toThrow('Invalid transition "to_c" from state "a"');
  });

  test("DIAL_111: rejects when current state has no transitions", async () => {
    const session = await createSession(noTransitionMachine());

    // Move to state "b" which has no transitions
    await executeTransition(session.sessionId, "go", "b");

    await expect(
      executeTransition(session.sessionId, "anything", "somewhere")
    ).rejects.toThrow('No transitions available from state "b"');
  });

  test("DIAL_112: rejects toState mismatch", async () => {
    const session = await createSession(threeStateMachine());

    await expect(
      executeTransition(session.sessionId, "to_b", "c")
    ).rejects.toThrow('State mismatch: transition "to_b" should go to "b", not "c"');
  });

  test("DIAL_113: preserves machine definition across transitions", async () => {
    const session = await createSession(threeStateMachine());
    const originalMachine = { ...session.machine };

    await executeTransition(session.sessionId, "to_b", "b");

    const updated = await getSession(session.sessionId);
    expect(updated.machine.machineName).toBe(originalMachine.machineName);
    expect(updated.machine.initialState).toBe(originalMachine.initialState);
    expect(updated.machine.goalState).toBe(originalMachine.goalState);
  });
});
