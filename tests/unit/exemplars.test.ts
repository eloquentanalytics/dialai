import { describe, test, expect, beforeEach } from "vitest";
import {
  clear,
  createExemplar,
  getExemplars,
  exemplars,
} from "../../src/dialai/index.js";
import type { ProposerContext, Proposal } from "../../src/dialai/types.js";

function makeContext(overrides?: Partial<ProposerContext>): ProposerContext {
  return {
    sessionId: overrides?.sessionId ?? "s1",
    currentState: overrides?.currentState ?? "pending",
    prompt: overrides?.prompt ?? "Approve or reject?",
    transitions: overrides?.transitions ?? { approve: "approved", reject: "rejected" },
    history: overrides?.history ?? [],
  };
}

function makeProposal(overrides?: Partial<Proposal>): Proposal {
  return {
    proposalId: overrides?.proposalId ?? "p-" + Math.random().toString(36).slice(2),
    sessionId: overrides?.sessionId ?? "s1",
    roundId: overrides?.roundId ?? "r1",
    specialistId: overrides?.specialistId ?? "spec1",
    isHuman: overrides?.isHuman ?? false,
    transitionName: overrides?.transitionName ?? "approve",
    toState: overrides?.toState ?? "approved",
    reasoning: overrides?.reasoning ?? "test reasoning",
    createdAt: overrides?.createdAt ?? new Date(),
  };
}

describe("DIAL_212–DIAL_222: Exemplar System", () => {
  beforeEach(() => {
    clear();
  });

  test("DIAL_212: createExemplar stores exemplar in store", () => {
    const ctx = makeContext();
    const proposals = [makeProposal()];

    expect(exemplars.size).toBe(0);

    createExemplar("test-machine", "pending", ctx, "approve", "approved", proposals);

    expect(exemplars.size).toBe(1);
  });

  test("DIAL_213: exemplar has unique exemplarId", () => {
    const ctx = makeContext();
    const proposals = [makeProposal()];

    const ex1 = createExemplar("test-machine", "pending", ctx, "approve", "approved", proposals);
    const ex2 = createExemplar("test-machine", "pending", ctx, "approve", "approved", proposals);

    expect(ex1.exemplarId).toBeDefined();
    expect(ex2.exemplarId).toBeDefined();
    expect(ex1.exemplarId).not.toBe(ex2.exemplarId);
  });

  test("DIAL_214: exemplar stores machineName and state", () => {
    const ctx = makeContext();
    const proposals = [makeProposal()];

    const ex = createExemplar("my-machine", "review", ctx, "approve", "approved", proposals);

    expect(ex.machineName).toBe("my-machine");
    expect(ex.state).toBe("review");
  });

  test("DIAL_215: exemplar stores context (ProposerContext)", () => {
    const ctx = makeContext({
      sessionId: "sess-42",
      currentState: "review",
      prompt: "Should we approve this?",
      transitions: { approve: "done", reject: "failed" },
    });
    const proposals = [makeProposal()];

    const ex = createExemplar("test-machine", "review", ctx, "approve", "done", proposals);

    expect(ex.context.sessionId).toBe("sess-42");
    expect(ex.context.currentState).toBe("review");
    expect(ex.context.prompt).toBe("Should we approve this?");
    expect(ex.context.transitions).toEqual({ approve: "done", reject: "failed" });
    expect(ex.context.history).toEqual([]);
  });

  test("DIAL_216: exemplar stores humanTransitionName and humanToState", () => {
    const ctx = makeContext();
    const proposals = [makeProposal()];

    const ex = createExemplar("test-machine", "pending", ctx, "reject", "rejected", proposals);

    expect(ex.humanTransitionName).toBe("reject");
    expect(ex.humanToState).toBe("rejected");
  });

  test("DIAL_217: exemplar stores copies of proposals - mutating original does not affect stored", () => {
    const ctx = makeContext();
    const originalProposals = [makeProposal({ proposalId: "p-original" })];

    const ex = createExemplar("test-machine", "pending", ctx, "approve", "approved", originalProposals);

    // Mutate the original array
    originalProposals.push(makeProposal({ proposalId: "p-added" }));

    // Stored exemplar should be unaffected
    expect(ex.proposals).toHaveLength(1);
    expect(ex.proposals[0].proposalId).toBe("p-original");
  });

  test("DIAL_220: exemplar stores createdAt timestamp", () => {
    const ctx = makeContext();
    const proposals = [makeProposal()];

    const ex = createExemplar("test-machine", "pending", ctx, "approve", "approved", proposals);

    expect(ex.createdAt).toBeInstanceOf(Date);
  });

  test("DIAL_221: getExemplars returns all exemplars for a machine", () => {
    const ctx = makeContext();
    const proposals = [makeProposal()];

    createExemplar("machineA", "pending", ctx, "approve", "approved", proposals);
    createExemplar("machineA", "review", ctx, "reject", "rejected", proposals);
    createExemplar("machineB", "pending", ctx, "approve", "approved", proposals);

    const result = getExemplars("machineA");

    expect(result).toHaveLength(2);
    expect(result.every((e) => e.machineName === "machineA")).toBe(true);
  });

  test("DIAL_222: getExemplars filters by state when provided", () => {
    const ctx = makeContext();
    const proposals = [makeProposal()];

    createExemplar("machineA", "pending", ctx, "approve", "approved", proposals);
    createExemplar("machineA", "review", ctx, "reject", "rejected", proposals);
    createExemplar("machineA", "pending", ctx, "reject", "rejected", proposals);

    const result = getExemplars("machineA", "pending");

    expect(result).toHaveLength(2);
    expect(result.every((e) => e.state === "pending")).toBe(true);
  });
});
