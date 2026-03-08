/**
 * LLM Audit Log Instrumentation Tests
 *
 * Tests that callLlm writes audit entries to the store on
 * success, HTTP error, and network error. Also tests auth redaction.
 */

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { clear, getStore } from "./store.js";

describe("LLM Audit Instrumentation", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalToken: string | undefined;
  let originalBaseUrl: string | undefined;

  beforeEach(async () => {
    await clear();
    originalFetch = globalThis.fetch;
    originalToken = process.env.OPENROUTER_API_TOKEN;
    originalBaseUrl = process.env.DIALAI_LLM_BASE_URL;
    process.env.OPENROUTER_API_TOKEN = "secret-token-123";
    process.env.DIALAI_LLM_BASE_URL = "https://llm.example.com/v1";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalToken !== undefined) {
      process.env.OPENROUTER_API_TOKEN = originalToken;
    } else {
      delete process.env.OPENROUTER_API_TOKEN;
    }
    if (originalBaseUrl !== undefined) {
      process.env.DIALAI_LLM_BASE_URL = originalBaseUrl;
    } else {
      delete process.env.DIALAI_LLM_BASE_URL;
    }
  });

  it("writes an audit entry on successful LLM call", async () => {
    const responseJson = {
      model: "test-model-20240101",
      choices: [{ message: { content: "test response" } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify(responseJson),
    }) as unknown as typeof fetch;

    const { callLlm } = await import("./llm.js");
    await callLlm("test-model", "system prompt", "user prompt", {
      sessionId: "sess-1",
      specialistId: "spec-1",
      machineName: "machine-1",
    });

    const entries = await getStore().getLlmAuditEntries();
    expect(entries).toHaveLength(1);

    const entry = entries[0];
    expect(entry.sessionId).toBe("sess-1");
    expect(entry.specialistId).toBe("spec-1");
    expect(entry.machineName).toBe("machine-1");
    expect(entry.requestUrl).toBe("https://llm.example.com/v1/chat/completions");
    expect(entry.responseStatus).toBe(200);
    expect(entry.responseBody).toBe(JSON.stringify(responseJson));
    expect(entry.resolvedModel).toBe("test-model-20240101");
    expect(entry.durationMs).toBeGreaterThanOrEqual(0);
    expect(entry.error).toBeNull();

    // Verify request body
    expect(entry.requestBody).toEqual({
      model: "test-model",
      messages: [
        { role: "system", content: "system prompt" },
        { role: "user", content: "user prompt" },
      ],
      temperature: 0,
    });
  });

  it("writes an audit entry on HTTP error", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    }) as unknown as typeof fetch;

    const { callLlm } = await import("./llm.js");
    await expect(
      callLlm("test-model", "system", "user", {
        sessionId: "sess-2",
        specialistId: "spec-2",
        machineName: "machine-2",
      })
    ).rejects.toThrow("LLM API error (500)");

    const entries = await getStore().getLlmAuditEntries();
    expect(entries).toHaveLength(1);

    const entry = entries[0];
    expect(entry.sessionId).toBe("sess-2");
    expect(entry.responseStatus).toBe(500);
    expect(entry.responseBody).toBe("Internal Server Error");
    expect(entry.error).toContain("LLM API error (500)");
  });

  it("writes an audit entry on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(
      new Error("fetch failed: ECONNREFUSED")
    ) as unknown as typeof fetch;

    const { callLlm } = await import("./llm.js");
    await expect(
      callLlm("test-model", "system", "user", {
        sessionId: "sess-3",
      })
    ).rejects.toThrow("fetch failed: ECONNREFUSED");

    const entries = await getStore().getLlmAuditEntries();
    expect(entries).toHaveLength(1);

    const entry = entries[0];
    expect(entry.sessionId).toBe("sess-3");
    expect(entry.responseStatus).toBeNull();
    expect(entry.responseBody).toBeNull();
    expect(entry.resolvedModel).toBeNull();
    expect(entry.error).toBe("fetch failed: ECONNREFUSED");
  });

  it("redacts Authorization header in audit entry", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "ok" } }],
        }),
    }) as unknown as typeof fetch;

    const { callLlm } = await import("./llm.js");
    await callLlm("test-model", "system", "user");

    const entries = await getStore().getLlmAuditEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].requestHeaders["Authorization"]).toBe("[REDACTED]");
    expect(entries[0].requestHeaders["Content-Type"]).toBe("application/json");
  });

  it("writes audit entry with null context fields when no context provided", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          choices: [{ message: { content: "ok" } }],
        }),
    }) as unknown as typeof fetch;

    const { callLlm } = await import("./llm.js");
    await callLlm("test-model", "system", "user");

    const entries = await getStore().getLlmAuditEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].sessionId).toBeNull();
    expect(entries[0].specialistId).toBeNull();
    expect(entries[0].machineName).toBeNull();
  });

  it("writes audit entry on parse error (invalid JSON response)", async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => "not valid json at all",
    }) as unknown as typeof fetch;

    const { callLlm } = await import("./llm.js");
    await expect(
      callLlm("test-model", "system", "user")
    ).rejects.toThrow();

    const entries = await getStore().getLlmAuditEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].responseStatus).toBe(200);
    expect(entries[0].responseBody).toBe("not valid json at all");
    expect(entries[0].error).not.toBeNull();
  });
});
