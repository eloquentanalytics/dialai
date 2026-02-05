import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as store from "../../src/dialai/store.js";
import {
  registerVoter,
  submitProposal,
  solicitVote,
  evaluateConsensus,
  executeTransition,
  createSession,
} from "../../src/dialai/api.js";
import { runSession } from "../../src/dialai/engine.js";
import type { MachineDefinition } from "../../src/dialai/types.js";

describe("integration: full cycle with 2 proposers + 1 voter", () => {
  beforeEach(() => store.clear());

  it("correct proposal wins via voter", async () => {
    const machine: MachineDefinition = {
      machineName: "int-test",
      initialState: "pending",
      defaultState: "done",
      states: {
        pending: {
          transitions: { complete: "done", restart: "pending" },
        },
        done: {},
      },
    };

    const session = createSession(machine);

    // Two proposers: one picks "complete", the other picks "restart"
    const pComplete = submitProposal(
      session.sessionId,
      "proposer-A",
      "complete",
      "done",
      "finish the task"
    );
    const pRestart = submitProposal(
      session.sessionId,
      "proposer-B",
      "restart",
      "pending",
      "start over"
    );

    // Register voter that prefers A (complete)
    registerVoter({
      specialistId: "voter-1",
      machineName: "int-test",
      strategyFn: async () => ({ voteFor: "A" as const, reasoning: "prefer A" }),
    });

    await solicitVote(
      session.sessionId,
      "voter-1",
      pComplete.proposalId,
      pRestart.proposalId
    );

    const result = evaluateConsensus(session.sessionId);
    expect(result.consensusReached).toBe(true);
    expect(result.winningProposalId).toBe(pComplete.proposalId);

    const updated = executeTransition(
      session.sessionId,
      "complete",
      "done"
    );
    expect(updated.currentState).toBe("done");
  });
});

describe("integration: load simple-machine.json and run", () => {
  beforeEach(() => store.clear());

  it("reaches final state done", async () => {
    const filePath = resolve(
      import.meta.dirname,
      "../../examples/simple-machine.json"
    );
    const raw = readFileSync(filePath, "utf-8");
    const machine = JSON.parse(raw) as MachineDefinition;

    const session = await runSession(machine);
    expect(session.currentState).toBe("done");
    expect(session.machineName).toBe("simple-task");
  });
});
