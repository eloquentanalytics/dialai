/**
 * E2E Tests - Edge Cases and Error Recovery
 * DIAL_393–DIAL_406
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
  executeTransition,
  runSession,
  getProposalsForRound,
} from "../../src/dialai/index.js";
import type {
  MachineDefinition,
} from "../../src/dialai/types.js";

describe("E2E: Edge Cases and Error Recovery", () => {
  beforeEach(async () => {
    await clear();
  });

  it("DIAL_393: session already at goalState — runSession returns immediately", async () => {
    const machine: MachineDefinition = {
      machineName: "already-done",
      initialState: "done",
      goalState: "done",
      states: {
        done: {},
      },
    };

    const session = await runSession(machine);

    expect(session.currentState).toBe("done");
    expect(session.history).toHaveLength(0);
  });

  it("DIAL_394: zero specialists registered — runSession registers defaults and completes", async () => {
    const machine: MachineDefinition = {
      machineName: "auto-defaults",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Go",
          transitions: { go: "end" },
        },
        end: {},
      },
    };

    // No specialists registered — runSession should auto-register defaults
    const session = await runSession(machine);

    expect(session.currentState).toBe("end");
    expect(session.history).toHaveLength(1);
    expect(session.history[0].transitionName).toBe("go");
  });

  it("DIAL_395: specialist strategyFn throws error — submitProposal propagates error", async () => {
    const machine: MachineDefinition = {
      machineName: "error-strategy",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Go",
          transitions: { go: "end" },
        },
        end: {},
      },
    };

    const session = await createSession(machine);

    await registerProposer({
      specialistId: "broken-proposer",
      machineName: "error-strategy",
      strategyFn: async () => {
        throw new Error("Strategy exploded");
      },
    });

    await expect(
      submitProposal({
        sessionId: session.sessionId,
        specialistId: "broken-proposer",
      })
    ).rejects.toThrow("Strategy exploded");
  });

  it("DIAL_396: specialist strategyFn returns proposal for nonexistent transition — proposal stored via strategy", async () => {
    const machine: MachineDefinition = {
      machineName: "bad-proposal",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Go",
          transitions: { go: "end" },
        },
        end: {},
      },
    };

    const session = await createSession(machine);

    await registerProposer({
      specialistId: "rogue-proposer",
      machineName: "bad-proposal",
      strategyFn: async () => {
        return {
          transitionName: "nonexistent",
          toState: "nowhere",
          reasoning: "I picked something invalid",
        };
      },
    });

    // When strategy is invoked (no transitionName provided), the result is stored as-is
    // without validation of the transition name
    const proposal = await submitProposal({
      sessionId: session.sessionId,
      specialistId: "rogue-proposer",
    });

    expect(proposal.transitionName).toBe("nonexistent");
    expect(proposal.toState).toBe("nowhere");
    expect(proposal.reasoning).toBe("I picked something invalid");

    // Verify it's stored in the proposals map
    const stored = await getProposalsForRound(session.sessionId, session.currentRoundId);
    expect(stored).toHaveLength(1);
    expect(stored[0].transitionName).toBe("nonexistent");
  });

  it("DIAL_397: empty transitions on non-goal state — executeTransition throws", async () => {
    const machine: MachineDefinition = {
      machineName: "empty-transitions",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Stuck here",
          // No transitions
        },
        end: {},
      },
    };

    const session = await createSession(machine);

    await expect(
      executeTransition(session.sessionId, "anything", "end")
    ).rejects.toThrow("No transitions available");
  });

  it("DIAL_398: very large number of proposals in single round — all stored correctly", async () => {
    const machine: MachineDefinition = {
      machineName: "mass-proposals",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Choose",
          transitions: { go: "end" },
        },
        end: {},
      },
    };

    const session = await createSession(machine);

    // Register 100 proposers
    for (let i = 0; i < 100; i++) {
      await registerProposer({
        specialistId: `proposer-${i}`,
        machineName: "mass-proposals",
        strategyFnName: "firstAvailable",
      });
    }

    // Submit 100 proposals
    for (let i = 0; i < 100; i++) {
      await submitProposal({
        sessionId: session.sessionId,
        specialistId: `proposer-${i}`,
        roundId: session.currentRoundId,
      });
    }

    const allProposals = await getProposalsForRound(session.sessionId, session.currentRoundId);
    expect(allProposals).toHaveLength(100);

    // All proposals should be for "go" transition
    for (const p of allProposals) {
      expect(p.transitionName).toBe("go");
      expect(p.toState).toBe("end");
    }
  });

  it("DIAL_400: rapid sequential submitProposal calls all succeed", async () => {
    const machine: MachineDefinition = {
      machineName: "rapid-fire",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Go",
          transitions: { go: "end" },
        },
        end: {},
      },
    };

    const session = await createSession(machine);

    // Register multiple proposers
    for (let i = 0; i < 10; i++) {
      await registerProposer({
        specialistId: `rapid-${i}`,
        machineName: "rapid-fire",
        strategyFnName: "firstAvailable",
      });
    }

    // Submit all proposals in rapid succession (awaiting each sequentially)
    const results = [];
    for (let i = 0; i < 10; i++) {
      const proposal = await submitProposal({
        sessionId: session.sessionId,
        specialistId: `rapid-${i}`,
        roundId: session.currentRoundId,
      });
      results.push(proposal);
    }

    expect(results).toHaveLength(10);
    const stored = await getProposalsForRound(session.sessionId, session.currentRoundId);
    expect(stored).toHaveLength(10);

    // All proposal IDs should be unique
    const ids = new Set(results.map((r) => r.proposalId));
    expect(ids.size).toBe(10);
  });

  it("DIAL_401: submitArbitration called with no proposals — guardsPass=false", async () => {
    const machine: MachineDefinition = {
      machineName: "no-proposals",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Go",
          transitions: { go: "end" },
        },
        end: {},
      },
    };

    const session = await createSession(machine);

    await registerArbiter({
      specialistId: "arbiter",
      machineName: "no-proposals",
      strategyFnName: "firstProposal",
    });

    const result = await submitArbitration({
      sessionId: session.sessionId,
      roundId: session.currentRoundId,
    });

    expect(result.guardsPass).toBe(false);
    expect(result.executed).toBe(false);
    expect(result.guardReason).toContain("No proposals");
  });

  it("DIAL_402: submitArbitration called twice in same round — second call sees stale roundId", async () => {
    const machine: MachineDefinition = {
      machineName: "double-arb",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Go",
          transitions: { go: "end" },
        },
        end: {},
      },
    };

    const session = await createSession(machine);
    const originalRoundId = session.currentRoundId;

    await registerProposer({
      specialistId: "proposer",
      machineName: "double-arb",
      strategyFnName: "firstAvailable",
    });
    await registerArbiter({
      specialistId: "arbiter",
      machineName: "double-arb",
      strategyFnName: "firstProposal",
    });

    await submitProposal({
      sessionId: session.sessionId,
      specialistId: "proposer",
      roundId: originalRoundId,
    });

    // First arbitration succeeds
    const result1 = await submitArbitration({
      sessionId: session.sessionId,
      roundId: originalRoundId,
    });
    expect(result1.executed).toBe(true);
    expect(result1.stale).toBe(false);

    // After execution, the round ID has changed
    const updated = await getSession(session.sessionId);
    expect(updated.currentRoundId).not.toBe(originalRoundId);

    // Second arbitration with the old roundId is stale
    const result2 = await submitArbitration({
      sessionId: session.sessionId,
      roundId: originalRoundId,
    });
    expect(result2.stale).toBe(true);
    expect(result2.guardsPass).toBe(false);
    expect(result2.executed).toBe(false);
  });

  it("DIAL_403: metaJson with deeply nested objects roundtrips correctly", async () => {
    const machine: MachineDefinition = {
      machineName: "deep-meta",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Go",
          transitions: { go: "end" },
        },
        end: {},
      },
    };

    const session = await createSession(machine);

    await registerProposer({
      specialistId: "meta-proposer",
      machineName: "deep-meta",
      strategyFnName: "firstAvailable",
    });

    const deepMeta = {
      level1: {
        level2: {
          level3: {
            values: [1, 2, 3],
            nested: { flag: true, name: "test" },
          },
        },
      },
      array: [{ id: 1 }, { id: 2, sub: { x: "y" } }],
      nullValue: null,
      number: 42.5,
    };

    const proposal = await submitProposal({
      sessionId: session.sessionId,
      specialistId: "meta-proposer",
      roundId: session.currentRoundId,
      metaJson: deepMeta,
    });

    expect(proposal.metaJson).toEqual(deepMeta);
  });

  it("DIAL_404: Unicode in reasoning and prompt fields handled correctly", async () => {
    const machine: MachineDefinition = {
      machineName: "unicode-machine",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Choisissez: approuver ou rejeter? \u2603\uD83C\uDF0D \u4F60\u597D\u4E16\u754C",
          transitions: { go: "end" },
        },
        end: {},
      },
    };

    const session = await createSession(machine);

    await registerProposer({
      specialistId: "unicode-proposer",
      machineName: "unicode-machine",
      strategyFnName: "firstAvailable",
    });

    const proposal = await submitProposal({
      sessionId: session.sessionId,
      specialistId: "unicode-proposer",
      roundId: session.currentRoundId,
      reasoning: "\u00C9tude de cas: \u65E5\u672C\u8A9E\u30C6\u30B9\u30C8 \u0410\u043B\u0435\u043A\u0441\u0430\u043D\u0434\u0440 \uD83D\uDE80",
    });

    expect(proposal.reasoning).toBe("\u00C9tude de cas: \u65E5\u672C\u8A9E\u30C6\u30B9\u30C8 \u0410\u043B\u0435\u043A\u0441\u0430\u043D\u0434\u0440 \uD83D\uDE80");

    // Verify the prompt was passed through
    const currentState = session.machine.states["start"];
    expect(currentState.prompt).toContain("\u4F60\u597D\u4E16\u754C");
  });

  it("DIAL_405: extremely long reasoning strings — no truncation", async () => {
    const machine: MachineDefinition = {
      machineName: "long-reasoning",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Go",
          transitions: { go: "end" },
        },
        end: {},
      },
    };

    const session = await createSession(machine);

    await registerProposer({
      specialistId: "verbose-proposer",
      machineName: "long-reasoning",
      strategyFnName: "firstAvailable",
    });

    // Generate a very long reasoning string (50,000 characters)
    const longReasoning = "A".repeat(50_000);

    const proposal = await submitProposal({
      sessionId: session.sessionId,
      specialistId: "verbose-proposer",
      roundId: session.currentRoundId,
      reasoning: longReasoning,
    });

    expect(proposal.reasoning).toBe(longReasoning);
    expect(proposal.reasoning.length).toBe(50_000);
  });

  it("DIAL_406: proposal submitted to wrong session — only affects the correct session", async () => {
    const machineA: MachineDefinition = {
      machineName: "session-a",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Go",
          transitions: { go: "end" },
        },
        end: {},
      },
    };

    const machineB: MachineDefinition = {
      machineName: "session-b",
      initialState: "start",
      goalState: "end",
      states: {
        start: {
          prompt: "Go",
          transitions: { go: "end" },
        },
        end: {},
      },
    };

    const sessionA = await createSession(machineA);
    const sessionB = await createSession(machineB);

    await registerProposer({
      specialistId: "p-a",
      machineName: "session-a",
      strategyFnName: "firstAvailable",
    });
    await registerProposer({
      specialistId: "p-b",
      machineName: "session-b",
      strategyFnName: "firstAvailable",
    });

    // Submit proposal to session A only
    await submitProposal({
      sessionId: sessionA.sessionId,
      specialistId: "p-a",
      roundId: sessionA.currentRoundId,
    });

    // Session B should have no proposals
    const proposalsA = await getProposalsForRound(sessionA.sessionId, sessionA.currentRoundId);
    const proposalsB = await getProposalsForRound(sessionB.sessionId, sessionB.currentRoundId);

    expect(proposalsA).toHaveLength(1);
    expect(proposalsB).toHaveLength(0);

    // Session B state is unaffected
    const sB = await getSession(sessionB.sessionId);
    expect(sB.currentState).toBe("start");
    expect(sB.history).toHaveLength(0);
  });
});
