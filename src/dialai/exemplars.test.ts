/**
 * Exemplar System Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { clear } from "./store.js";
import { createExemplar, getExemplars } from "./exemplars.js";
import type { ProposerContext, Proposal } from "./types.js";

const mockContext: ProposerContext = {
  sessionId: "s1",
  currentState: "a",
  prompt: "Choose",
  transitions: { to_b: "b", to_c: "c" },
  history: [],
};

const mockProposals: Proposal[] = [
  {
    proposalId: "p1",
    sessionId: "s1",
    roundId: "r1",
    specialistId: "ai-1",
    isHuman: false,
    transitionName: "to_b",
    toState: "b",
    reasoning: "Go to B",
    createdAt: new Date(),
  },
];

describe("Exemplar System", () => {
  beforeEach(() => {
    clear();
  });

  describe("createExemplar", () => {
    it("creates an exemplar with all fields", () => {
      const exemplar = createExemplar(
        "test-machine",
        "a",
        mockContext,
        "to_b",
        "b",
        mockProposals,
        [],
        []
      );

      expect(exemplar.exemplarId).toBeDefined();
      expect(exemplar.machineName).toBe("test-machine");
      expect(exemplar.state).toBe("a");
      expect(exemplar.humanTransitionName).toBe("to_b");
      expect(exemplar.humanToState).toBe("b");
      expect(exemplar.proposals).toHaveLength(1);
      expect(exemplar.votes).toHaveLength(0);
      expect(exemplar.selectionVotes).toHaveLength(0);
      expect(exemplar.createdAt).toBeInstanceOf(Date);
    });

    it("stores a deep copy of proposals", () => {
      const exemplar = createExemplar(
        "test-machine",
        "a",
        mockContext,
        "to_b",
        "b",
        mockProposals,
        [],
        []
      );

      // Modifying original should not affect exemplar
      expect(exemplar.proposals).not.toBe(mockProposals);
    });
  });

  describe("getExemplars", () => {
    it("returns exemplars for a machine", () => {
      createExemplar("test-machine", "a", mockContext, "to_b", "b", mockProposals, [], []);
      createExemplar("test-machine", "b", mockContext, "to_c", "c", mockProposals, [], []);
      createExemplar("other-machine", "a", mockContext, "to_b", "b", mockProposals, [], []);

      const exemplars = getExemplars("test-machine");
      expect(exemplars).toHaveLength(2);
    });

    it("filters by state", () => {
      createExemplar("test-machine", "a", mockContext, "to_b", "b", mockProposals, [], []);
      createExemplar("test-machine", "b", mockContext, "to_c", "c", mockProposals, [], []);

      const exemplars = getExemplars("test-machine", "a");
      expect(exemplars).toHaveLength(1);
      expect(exemplars[0].state).toBe("a");
    });

    it("returns empty for unknown machine", () => {
      expect(getExemplars("unknown")).toHaveLength(0);
    });
  });
});
