/**
 * LLM & Webhook Execution Tests
 *
 * Tests for the webhook and LLM execution modules.
 * Note: actual HTTP calls are not tested here — only the assembly and parsing logic.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { clear } from "./store.js";

describe("LLM Module", () => {
  beforeEach(async () => {
    await clear();
  });

  describe("executeWebhook", () => {
    it("throws when fetch fails", async () => {
      const { executeWebhook } = await import("./llm.js");

      // Mock fetch to return error
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => "Internal Server Error",
      }) as unknown as typeof fetch;

      try {
        await expect(
          executeWebhook("https://example.com/webhook", { test: true }, "test-machine")
        ).rejects.toThrow("Webhook error (500)");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("throws on 202 Accepted", async () => {
      const { executeWebhook } = await import("./llm.js");

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 202,
        json: async () => ({}),
      }) as unknown as typeof fetch;

      try {
        await expect(
          executeWebhook("https://example.com/webhook", { test: true }, "test-machine")
        ).rejects.toThrow("202 Accepted");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("returns parsed JSON on success", async () => {
      const { executeWebhook } = await import("./llm.js");

      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ transitionName: "go", toState: "done", reasoning: "test" }),
      }) as unknown as typeof fetch;

      try {
        const result = await executeWebhook<{ transitionName: string }>(
          "https://example.com/webhook",
          { test: true },
          "test-machine"
        );
        expect(result.transitionName).toBe("go");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("sends Basic Auth header with machineName and token", async () => {
      const { executeWebhook } = await import("./llm.js");

      const originalFetch = globalThis.fetch;
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({}),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      // Set env var for token
      process.env.TEST_TOKEN = "secret123";

      try {
        await executeWebhook(
          "https://example.com/webhook",
          {},
          "my-machine",
          "TEST_TOKEN"
        );

        const callArgs = mockFetch.mock.calls[0] as [string, { headers: Record<string, string> }];
        const headers = callArgs[1].headers;
        const expectedAuth = Buffer.from("my-machine:secret123").toString("base64");
        expect(headers.Authorization).toBe(`Basic ${expectedAuth}`);
      } finally {
        globalThis.fetch = originalFetch;
        delete process.env.TEST_TOKEN;
      }
    });
  });

  describe("callLlm", () => {
    it("throws when no API token configured", async () => {
      const { callLlm } = await import("./llm.js");

      const originalToken = process.env.OPENROUTER_API_TOKEN;
      delete process.env.OPENROUTER_API_TOKEN;

      try {
        await expect(
          callLlm("test-model", "system", "user")
        ).rejects.toThrow("No LLM API token");
      } finally {
        if (originalToken !== undefined) {
          process.env.OPENROUTER_API_TOKEN = originalToken;
        }
      }
    });

    it("calls the correct endpoint with Bearer auth", async () => {
      const { callLlm } = await import("./llm.js");

      const originalFetch = globalThis.fetch;
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          choices: [{ message: { content: "test response" } }],
          usage: { prompt_tokens: 10, completion_tokens: 5 },
        }),
      });
      globalThis.fetch = mockFetch as unknown as typeof fetch;

      process.env.OPENROUTER_API_TOKEN = "test-token";

      try {
        const result = await callLlm("test-model", "system prompt", "user prompt");

        expect(result.content).toBe("test response");
        expect(result.usage?.prompt_tokens).toBe(10);

        const callArgs = mockFetch.mock.calls[0] as [string, { headers: Record<string, string>; body: string }];
        expect(callArgs[1].headers.Authorization).toBe("Bearer test-token");

        const body = JSON.parse(callArgs[1].body) as { model: string; messages: unknown[] };
        expect(body.model).toBe("test-model");
        expect(body.messages).toHaveLength(2);
      } finally {
        globalThis.fetch = originalFetch;
        delete process.env.OPENROUTER_API_TOKEN;
      }
    });
  });
});
