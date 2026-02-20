/**
 * Alignment System Tests
 */

import { describe, it, expect, beforeEach } from "vitest";
import { clear } from "./store.js";
import { registerProposer } from "./api.js";
import {
  isHumanSpecialist,
  getAlignmentScore,
  updateAlignment,
  updateAlignmentAfterHumanDecision,
  getAllAlignmentRecords,
} from "./alignment.js";
import type { Proposal } from "./types.js";

describe("Alignment System", () => {
  beforeEach(() => {
    clear();
  });

  describe("isHumanSpecialist", () => {
    it("returns true for human specialists", async () => {
      await registerProposer({
        specialistId: "human-1",
        machineName: "align-test",
        isHuman: true,
        strategyFnName: "firstAvailable",
      });

      expect(isHumanSpecialist("human-1")).toBe(true);
    });

    it("returns false for AI specialists", async () => {
      await registerProposer({
        specialistId: "ai-1",
        machineName: "align-test",
        strategyFnName: "firstAvailable",
      });

      expect(isHumanSpecialist("ai-1")).toBe(false);
    });

    it("returns false for unknown specialists", () => {
      expect(isHumanSpecialist("unknown")).toBe(false);
    });

    it("does not match on specialistId strings", async () => {
      await registerProposer({
        specialistId: "human",
        machineName: "align-test",
        strategyFnName: "firstAvailable",
        // isHuman not set
      });

      expect(isHumanSpecialist("human")).toBe(false);
    });
  });

  describe("getAlignmentScore", () => {
    it("returns 1.0 for human specialists", async () => {
      await registerProposer({
        specialistId: "human-1",
        machineName: "align-test",
        isHuman: true,
        strategyFnName: "firstAvailable",
      });

      expect(getAlignmentScore("human-1", "align-test")).toBe(1.0);
    });

    it("returns 0 for unknown specialists", () => {
      expect(getAlignmentScore("unknown", "align-test")).toBe(0);
    });

    it("returns 0 for AI specialists with no data", async () => {
      await registerProposer({
        specialistId: "ai-1",
        machineName: "align-test",
        strategyFnName: "firstAvailable",
      });

      expect(getAlignmentScore("ai-1", "align-test")).toBe(0);
    });
  });

  describe("updateAlignment", () => {
    it("creates a new alignment record on first update", async () => {
      await registerProposer({
        specialistId: "ai-1",
        machineName: "align-test",
        strategyFnName: "firstAvailable",
      });

      updateAlignment("ai-1", "align-test", true);

      expect(getAlignmentScore("ai-1", "align-test")).toBeCloseTo(0.2065, 3);
    });

    it("calculates correct score over multiple updates", async () => {
      await registerProposer({
        specialistId: "ai-1",
        machineName: "align-test",
        strategyFnName: "firstAvailable",
      });

      updateAlignment("ai-1", "align-test", true);
      updateAlignment("ai-1", "align-test", false);
      updateAlignment("ai-1", "align-test", true);

      expect(getAlignmentScore("ai-1", "align-test")).toBeCloseTo(0.2077, 3);
    });

    it("does not track alignment for human specialists", async () => {
      await registerProposer({
        specialistId: "human-1",
        machineName: "align-test",
        isHuman: true,
        strategyFnName: "firstAvailable",
      });

      updateAlignment("human-1", "align-test", false);

      // Human alignment is always 1.0, not tracked
      expect(getAlignmentScore("human-1", "align-test")).toBe(1.0);
    });
  });

  describe("updateAlignmentAfterHumanDecision", () => {
    it("updates alignment for proposers based on transition match", async () => {
      await registerProposer({
        specialistId: "ai-1",
        machineName: "align-test",
        strategyFnName: "firstAvailable",
      });
      await registerProposer({
        specialistId: "ai-2",
        machineName: "align-test",
        strategyFnName: "lastAvailable",
      });

      const proposals: Proposal[] = [
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
        {
          proposalId: "p2",
          sessionId: "s1",
          roundId: "r1",
          specialistId: "ai-2",
          isHuman: false,
          transitionName: "to_c",
          toState: "c",
          reasoning: "Go to C",
          createdAt: new Date(),
        },
      ];

      updateAlignmentAfterHumanDecision("align-test", "to_b", proposals);

      expect(getAlignmentScore("ai-1", "align-test")).toBeCloseTo(0.2065, 3); // matched
      expect(getAlignmentScore("ai-2", "align-test")).toBe(0); // did not match
    });
  });

  describe("getAllAlignmentRecords", () => {
    it("returns all records for a machine", async () => {
      await registerProposer({
        specialistId: "ai-1",
        machineName: "align-test",
        strategyFnName: "firstAvailable",
      });
      await registerProposer({
        specialistId: "ai-2",
        machineName: "align-test",
        strategyFnName: "lastAvailable",
      });

      updateAlignment("ai-1", "align-test", true);
      updateAlignment("ai-2", "align-test", false);

      const records = getAllAlignmentRecords("align-test");
      expect(records).toHaveLength(2);
      expect(records.find((r) => r.specialistId === "ai-1")?.alignmentScore).toBeCloseTo(0.2065, 3);
      expect(records.find((r) => r.specialistId === "ai-2")?.alignmentScore).toBe(0);
    });

    it("returns empty for unknown machine", () => {
      expect(getAllAlignmentRecords("unknown")).toHaveLength(0);
    });
  });
});
