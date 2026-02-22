import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  createSession,
  getSession,
  getSessions,
} from "../../src/dialai/index.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

function twoStateMachine(): MachineDefinition {
  return {
    machineName: "session-test",
    initialState: "draft",
    goalState: "published",
    states: {
      draft: {
        prompt: "Publish this document?",
        transitions: { publish: "published" },
      },
      published: {},
    },
  };
}

describe("DIAL_001–DIAL_010: Session Management", () => {
  beforeEach(async () => {
    await clear();
  });

  test("DIAL_001: creates session with valid machine definition", async () => {
    const machine = twoStateMachine();
    const session = await createSession(machine);

    expect(session.sessionId).toBeDefined();
    expect(session.sessionId).toBeTypeOf("string");
    expect(session.currentState).toBe("draft");
    expect(session.machineName).toBe("session-test");
    expect(session.currentRoundId).toBeDefined();
    expect(session.currentRoundId).toBeTypeOf("string");
    expect(session.history).toEqual([]);
    expect(session.machine).toEqual(machine);
    expect(session.createdAt).toBeInstanceOf(Date);
  });

  test("DIAL_005: each session gets unique ID and roundId", async () => {
    const a = await createSession(twoStateMachine());
    const b = await createSession(twoStateMachine());

    expect(a.sessionId).not.toBe(b.sessionId);
    expect(a.currentRoundId).not.toBe(b.currentRoundId);
  });

  test("DIAL_007: getSession retrieves by ID", async () => {
    const created = await createSession(twoStateMachine());
    const retrieved = await getSession(created.sessionId);

    expect(retrieved.sessionId).toBe(created.sessionId);
    expect(retrieved.currentState).toBe(created.currentState);
    expect(retrieved.machineName).toBe(created.machineName);
    expect(retrieved.currentRoundId).toBe(created.currentRoundId);
  });

  test("DIAL_008: getSession rejects unknown ID", async () => {
    await expect(getSession("nonexistent")).rejects.toThrow("Session not found");
  });

  test("DIAL_009: getSessions returns all sessions", async () => {
    await createSession(twoStateMachine());
    await createSession(twoStateMachine());
    await createSession(twoStateMachine());

    const all = await getSessions();
    expect(all).toHaveLength(3);
  });

  test("DIAL_010: getSessions returns empty array initially", async () => {
    const all = await getSessions();
    expect(all).toEqual([]);
  });
});
