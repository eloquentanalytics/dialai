import { describe, it, expect, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import * as store from "../../src/dialai/store.js";
import {
  registerSpecialist,
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

  it("correct proposal wins via voter", () => {
    const machine: MachineDefinition = {
      sessionTypeName: "int-test",
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
    registerSpecialist({
      specialistId: "voter-1",
      sessionTypeName: "int-test",
      role: "voter",
      strategy: () => ({ voteFor: "A" as const, reasoning: "prefer A" }),
    });

    solicitVote(
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

  it("reaches final state done", () => {
    const filePath = resolve(
      import.meta.dirname,
      "../../examples/simple-machine.json"
    );
    const raw = readFileSync(filePath, "utf-8");
    const machine = JSON.parse(raw) as MachineDefinition;

    const session = runSession(machine);
    expect(session.currentState).toBe("done");
    expect(session.sessionTypeName).toBe("simple-task");
  });
});
