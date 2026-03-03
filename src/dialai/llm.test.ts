/**
 * LLM & Webhook Execution Tests
 *
 * Tests for the webhook and LLM execution modules.
 * Note: actual HTTP calls are not tested here — only the assembly and parsing logic.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { clear, getStore } from "./store.js";
import type { ProposerContext } from "./types.js";

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
      const responseBody = JSON.stringify({
        choices: [{ message: { content: "test response" } }],
        usage: { prompt_tokens: 10, completion_tokens: 5 },
      });
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => responseBody,
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

  describe("executeProposerLlm", () => {
    it("returns metrics from LLM call", async () => {
      const { executeProposerLlm } = await import("./llm.js");

      const originalFetch = globalThis.fetch;
      const responseBody = JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                transitionName: "approve",
                toState: "approved",
                reasoning: "looks good",
              }),
            },
          },
        ],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      });
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => responseBody,
      }) as unknown as typeof fetch;

      process.env.OPENROUTER_API_TOKEN = "test-token";

      try {
        const result = await executeProposerLlm(
          async () => "some context",
          "test-model",
          {
            sessionId: "s1",
            currentState: "pending",
            prompt: "Decide",
            transitions: { approve: { target: "approved" }, reject: { target: "rejected" } },
            history: [],
          }
        );

        expect(result.transitionName).toBe("approve");
        expect(result.toState).toBe("approved");
        expect(result.reasoning).toBe("looks good");
        expect(result.latencyMsec).toBeGreaterThanOrEqual(0);
        expect(result.numInputTokens).toBe(100);
        expect(result.numOutputTokens).toBe(50);
      } finally {
        globalThis.fetch = originalFetch;
        delete process.env.OPENROUTER_API_TOKEN;
      }
    });
  });
});

// ============================================================================
// Tool Calling Tests
// ============================================================================

describe("buildToolsFromTransitions", () => {
  it("returns OpenAI tool array for enriched transitions", async () => {
    const { buildToolsFromTransitions } = await import("./llm.js");
    const result = buildToolsFromTransitions({
      book: { target: "booked", description: "Book a ride", parameters: { type: "object", properties: { dest: { type: "string" } } } },
    });
    expect(result).toHaveLength(1);
    expect(result![0].type).toBe("function");
    expect(result![0].function.name).toBe("book");
    expect(result![0].function.description).toBe("Book a ride");
    expect(result![0].function.parameters).toEqual({ type: "object", properties: { dest: { type: "string" } } });
  });

  it("returns null for plain transitions (no description, no parameters)", async () => {
    const { buildToolsFromTransitions } = await import("./llm.js");
    const result = buildToolsFromTransitions({
      close: { target: "closed" },
      reopen: { target: "open" },
    });
    expect(result).toBeNull();
  });

  it("returns tools only for enriched transitions in a mixed set", async () => {
    const { buildToolsFromTransitions } = await import("./llm.js");
    const result = buildToolsFromTransitions({
      close: { target: "closed" },
      book: { target: "booked", description: "Book" },
    });
    expect(result).toHaveLength(1);
    expect(result![0].function.name).toBe("book");
  });

  it("uses transition name as description when description is omitted but parameters present", async () => {
    const { buildToolsFromTransitions } = await import("./llm.js");
    const result = buildToolsFromTransitions({
      book: { target: "booked", parameters: { type: "object", properties: {} } },
    });
    expect(result![0].function.description).toBe("book");
  });
});

describe("callLlmWithTools", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalToken: string | undefined;

  beforeEach(async () => {
    await clear();
    originalFetch = globalThis.fetch;
    originalToken = process.env.OPENROUTER_API_TOKEN;
    process.env.OPENROUTER_API_TOKEN = "test-token";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalToken !== undefined) {
      process.env.OPENROUTER_API_TOKEN = originalToken;
    } else {
      delete process.env.OPENROUTER_API_TOKEN;
    }
  });

  const sampleTools = [{ type: "function" as const, function: { name: "book", description: "Book", parameters: { type: "object", properties: {} } } }];

  it("returns ToolCallResult when model uses a tool", async () => {
    const { callLlmWithTools } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { name: "book", arguments: '{"dest":"airport"}' } }], content: "reasoning text" } }],
        usage: { prompt_tokens: 50, completion_tokens: 20 },
      }),
    }) as unknown as typeof fetch;

    const result = await callLlmWithTools("test-model", "sys", "user", sampleTools);
    expect(result.name).toBe("book");
    expect(result.arguments).toEqual({ dest: "airport" });
    expect(result.reasoning).toBe("reasoning text");
    expect(result.usage?.prompt_tokens).toBe(50);
    expect(result.usage?.completion_tokens).toBe(20);
  });

  it("throws NoToolCallError when model returns text only", async () => {
    const { callLlmWithTools, NoToolCallError } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: "I chose to close" } }],
        usage: { prompt_tokens: 30, completion_tokens: 10 },
      }),
    }) as unknown as typeof fetch;

    try {
      await callLlmWithTools("test-model", "sys", "user", sampleTools);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(NoToolCallError);
      const err = e as InstanceType<typeof NoToolCallError>;
      expect(err.content).toBe("I chose to close");
      expect(err.usage?.prompt_tokens).toBe(30);
      expect(err.usage?.completion_tokens).toBe(10);
    }
  });

  it("throws NoToolCallError when tool_calls is empty array", async () => {
    const { callLlmWithTools, NoToolCallError } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { tool_calls: [], content: "no tools" } }],
      }),
    }) as unknown as typeof fetch;

    try {
      await callLlmWithTools("test-model", "sys", "user", sampleTools);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(NoToolCallError);
      expect((e as InstanceType<typeof NoToolCallError>).content).toBe("no tools");
    }
  });

  it("throws Error (not NoToolCallError) on HTTP 500", async () => {
    const { callLlmWithTools, NoToolCallError } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    }) as unknown as typeof fetch;

    try {
      await callLlmWithTools("test-model", "sys", "user", sampleTools);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).not.toBeInstanceOf(NoToolCallError);
      expect((e as Error).message).toContain("LLM API error (500)");
    }
  });

  it("throws Error on network failure", async () => {
    const { callLlmWithTools, NoToolCallError } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch;

    try {
      await callLlmWithTools("test-model", "sys", "user", sampleTools);
      expect.fail("Should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
      expect(e).not.toBeInstanceOf(NoToolCallError);
      expect((e as Error).message).toBe("ECONNREFUSED");
    }
  });

  it("handles unparseable tool arguments gracefully", async () => {
    const { callLlmWithTools } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { name: "book", arguments: "not json" } }] } }],
      }),
    }) as unknown as typeof fetch;

    const result = await callLlmWithTools("test-model", "sys", "user", sampleTools);
    expect(result.name).toBe("book");
    expect(result.arguments).toEqual({});
  });

  it("handles null content alongside tool call", async () => {
    const { callLlmWithTools } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { name: "book", arguments: '{}' } }], content: null } }],
      }),
    }) as unknown as typeof fetch;

    const result = await callLlmWithTools("test-model", "sys", "user", sampleTools);
    expect(result.reasoning).toBe("");
  });

  it("handles missing usage field", async () => {
    const { callLlmWithTools } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { name: "book", arguments: '{}' } }] } }],
      }),
    }) as unknown as typeof fetch;

    const result = await callLlmWithTools("test-model", "sys", "user", sampleTools);
    expect(result.usage).toBeUndefined();
  });

  it("includes tools in request body", async () => {
    const { callLlmWithTools } = await import("./llm.js");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { name: "book", arguments: '{}' } }] } }],
      }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await callLlmWithTools("test-model", "sys", "user", sampleTools);
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, { body: string }])[1].body) as Record<string, unknown>;
    expect(body.tools).toEqual(sampleTools);
    expect(body.tool_choice).toBe("auto");
  });
});

describe("callLlmWithTools audit", () => {
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

  const sampleTools = [{ type: "function" as const, function: { name: "book", description: "Book", parameters: { type: "object", properties: {} } } }];

  it("writes audit entry on success", async () => {
    const { callLlmWithTools } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { name: "book", arguments: '{}' } }] } }],
      }),
    }) as unknown as typeof fetch;

    await callLlmWithTools("test-model", "sys", "user", sampleTools);
    const entries = await getStore().getLlmAuditEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].requestBody["tools"]).toBeDefined();
    expect(entries[0].error).toBeNull();
    expect(entries[0].responseStatus).toBe(200);
  });

  it("writes audit entry on NoToolCallError", async () => {
    const { callLlmWithTools, NoToolCallError } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: "no tools" } }],
      }),
    }) as unknown as typeof fetch;

    try { await callLlmWithTools("test-model", "sys", "user", sampleTools); } catch (e) {
      expect(e).toBeInstanceOf(NoToolCallError);
    }
    const entries = await getStore().getLlmAuditEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].error).toBeNull();
    expect(entries[0].responseStatus).toBe(200);
  });

  it("writes audit entry on HTTP error", async () => {
    const { callLlmWithTools } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => "Internal Server Error",
    }) as unknown as typeof fetch;

    try { await callLlmWithTools("test-model", "sys", "user", sampleTools); } catch { /* expected */ }
    const entries = await getStore().getLlmAuditEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].error).toContain("LLM API error (500)");
  });

  it("redacts Authorization header in audit", async () => {
    const { callLlmWithTools } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { name: "book", arguments: '{}' } }] } }],
      }),
    }) as unknown as typeof fetch;

    await callLlmWithTools("test-model", "sys", "user", sampleTools);
    const entries = await getStore().getLlmAuditEntries();
    expect(entries[0].requestHeaders["Authorization"]).toBe("[REDACTED]");
  });
});

describe("executeProposerLlm — TOOL PATH", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalToken: string | undefined;

  const enrichedCtx: ProposerContext = {
    sessionId: "s1",
    currentState: "pending",
    prompt: "Decide",
    transitions: {
      book_ride: { target: "riding", description: "Book a ride", parameters: { type: "object", properties: { destination: { type: "string" } } } },
      cancel: { target: "cancelled", description: "Cancel the request" },
    },
    history: [],
  };

  beforeEach(async () => {
    await clear();
    originalFetch = globalThis.fetch;
    originalToken = process.env.OPENROUTER_API_TOKEN;
    process.env.OPENROUTER_API_TOKEN = "test-token";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalToken !== undefined) {
      process.env.OPENROUTER_API_TOKEN = originalToken;
    } else {
      delete process.env.OPENROUTER_API_TOKEN;
    }
  });

  it("model returns tool_call -> returns transitionName and metaJson", async () => {
    const { executeProposerLlm } = await import("./llm.js");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { name: "book_ride", arguments: '{"destination":"airport"}' } }], content: null } }],
        usage: { prompt_tokens: 100, completion_tokens: 30 },
      }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await executeProposerLlm(async () => "context", "test-model", enrichedCtx);
    expect(result.transitionName).toBe("book_ride");
    expect(result.toState).toBe("riding");
    expect(result.metaJson).toEqual({ destination: "airport" });
    expect(result.latencyMsec).toBeGreaterThanOrEqual(0);
    expect(result.numInputTokens).toBe(100);
    expect(result.numOutputTokens).toBe(30);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("model returns tool_call with empty arguments -> metaJson is undefined", async () => {
    const { executeProposerLlm } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { name: "book_ride", arguments: '{}' } }], content: null } }],
        usage: { prompt_tokens: 100, completion_tokens: 30 },
      }),
    }) as unknown as typeof fetch;

    const result = await executeProposerLlm(async () => "context", "test-model", enrichedCtx);
    expect(result.metaJson).toBeUndefined();
    expect(result.transitionName).toBe("book_ride");
  });

  it("model returns tool_call with unknown tool name -> throws", async () => {
    const { executeProposerLlm } = await import("./llm.js");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { tool_calls: [{ function: { name: "nonexistent_tool", arguments: '{}' } }], content: null } }],
      }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await expect(
      executeProposerLlm(async () => "context", "test-model", enrichedCtx)
    ).rejects.toThrow("does not match any transition");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("executeProposerLlm — NoToolCallError with parseable DIAL JSON", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalToken: string | undefined;

  const enrichedCtx: ProposerContext = {
    sessionId: "s1",
    currentState: "pending",
    prompt: "Decide",
    transitions: { book: { target: "booked", description: "Book" } },
    history: [],
  };

  beforeEach(async () => {
    await clear();
    originalFetch = globalThis.fetch;
    originalToken = process.env.OPENROUTER_API_TOKEN;
    process.env.OPENROUTER_API_TOKEN = "test-token";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalToken !== undefined) {
      process.env.OPENROUTER_API_TOKEN = originalToken;
    } else {
      delete process.env.OPENROUTER_API_TOKEN;
    }
  });

  it("valid DIAL JSON -> returns parsed result", async () => {
    const { executeProposerLlm } = await import("./llm.js");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: '{"transitionName":"book","toState":"booked","reasoning":"chose book"}' } }],
        usage: { prompt_tokens: 40, completion_tokens: 15 },
      }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await executeProposerLlm(async () => "context", "test-model", enrichedCtx);
    expect(result.transitionName).toBe("book");
    expect(result.toState).toBe("booked");
    expect(result.reasoning).toBe("chose book");
    expect(result.numInputTokens).toBe(40);
    expect(result.numOutputTokens).toBe(15);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("valid DIAL JSON with metaJson -> metaJson preserved", async () => {
    const { executeProposerLlm } = await import("./llm.js");
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: '{"transitionName":"book","toState":"booked","reasoning":"ok","metaJson":{"key":"val"}}' } }],
        usage: { prompt_tokens: 40, completion_tokens: 15 },
      }),
    }) as unknown as typeof fetch;

    const result = await executeProposerLlm(async () => "context", "test-model", enrichedCtx);
    expect(result.metaJson).toEqual({ key: "val" });
  });
});

describe("executeProposerLlm — NoToolCallError with unparseable text -> full fallback", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalToken: string | undefined;

  const enrichedCtx: ProposerContext = {
    sessionId: "s1",
    currentState: "pending",
    prompt: "Decide",
    transitions: { book: { target: "booked", description: "Book" } },
    history: [],
  };

  beforeEach(async () => {
    await clear();
    originalFetch = globalThis.fetch;
    originalToken = process.env.OPENROUTER_API_TOKEN;
    process.env.OPENROUTER_API_TOKEN = "test-token";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalToken !== undefined) {
      process.env.OPENROUTER_API_TOKEN = originalToken;
    } else {
      delete process.env.OPENROUTER_API_TOKEN;
    }
  });

  it("unparseable text -> falls back to callLlm", async () => {
    const { executeProposerLlm } = await import("./llm.js");
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true, status: 200,
          text: async () => JSON.stringify({
            choices: [{ message: { content: "I think you should book" } }],
          }),
        };
      }
      return {
        ok: true, status: 200,
        text: async () => JSON.stringify({
          choices: [{ message: { content: '{"transitionName":"book","toState":"booked","reasoning":"fallback"}' } }],
        }),
      };
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await executeProposerLlm(async () => "context", "test-model", enrichedCtx);
    expect(result.transitionName).toBe("book");
    expect(result.toState).toBe("booked");
    expect(result.reasoning).toBe("fallback");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("partial DIAL JSON (missing toState) -> falls back to callLlm", async () => {
    const { executeProposerLlm } = await import("./llm.js");
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          ok: true, status: 200,
          text: async () => JSON.stringify({
            choices: [{ message: { content: '{"transitionName":"book"}' } }],
          }),
        };
      }
      return {
        ok: true, status: 200,
        text: async () => JSON.stringify({
          choices: [{ message: { content: '{"transitionName":"book","toState":"booked","reasoning":"ok"}' } }],
        }),
      };
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await executeProposerLlm(async () => "context", "test-model", enrichedCtx);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    expect(result.toState).toBe("booked");
  });
});

describe("executeProposerLlm — TOOL PATH: HTTP error -> re-throw", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalToken: string | undefined;

  const enrichedCtx: ProposerContext = {
    sessionId: "s1",
    currentState: "pending",
    prompt: "Decide",
    transitions: { book: { target: "booked", description: "Book" } },
    history: [],
  };

  beforeEach(async () => {
    await clear();
    originalFetch = globalThis.fetch;
    originalToken = process.env.OPENROUTER_API_TOKEN;
    process.env.OPENROUTER_API_TOKEN = "test-token";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalToken !== undefined) {
      process.env.OPENROUTER_API_TOKEN = originalToken;
    } else {
      delete process.env.OPENROUTER_API_TOKEN;
    }
  });

  it("HTTP 500 from callLlmWithTools -> re-throws, does not fall back", async () => {
    const { executeProposerLlm } = await import("./llm.js");
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false, status: 500,
      text: async () => "Internal Server Error",
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await expect(
      executeProposerLlm(async () => "context", "test-model", enrichedCtx)
    ).rejects.toThrow("LLM API error (500)");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it("network error from callLlmWithTools -> re-throws, does not fall back", async () => {
    const { executeProposerLlm } = await import("./llm.js");
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    await expect(
      executeProposerLlm(async () => "context", "test-model", enrichedCtx)
    ).rejects.toThrow("ECONNREFUSED");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("executeProposerLlm — TEXT PATH: [tools=no] opt-out", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalToken: string | undefined;

  beforeEach(async () => {
    await clear();
    originalFetch = globalThis.fetch;
    originalToken = process.env.OPENROUTER_API_TOKEN;
    process.env.OPENROUTER_API_TOKEN = "test-token";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalToken !== undefined) {
      process.env.OPENROUTER_API_TOKEN = originalToken;
    } else {
      delete process.env.OPENROUTER_API_TOKEN;
    }
  });

  it("modelId [tools=no] + enriched transitions -> skips tool path, uses callLlm", async () => {
    const { executeProposerLlm } = await import("./llm.js");
    const enrichedCtx: ProposerContext = {
      sessionId: "s1",
      currentState: "pending",
      prompt: "Decide",
      transitions: { book: { target: "booked", description: "Book" } },
      history: [],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: '{"transitionName":"book","toState":"booked","reasoning":"text path"}' } }],
      }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await executeProposerLlm(
      async () => "context",
      "test-model[tools=no]",
      enrichedCtx,
    );

    expect(result.transitionName).toBe("book");
    expect(result.reasoning).toBe("text path");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, { body: string }])[1].body) as Record<string, unknown>;
    expect(body.tools).toBeUndefined();
    expect(body.model).toBe("test-model");
  });
});

describe("executeProposerLlm — TEXT PATH: no enriched transitions", () => {
  let originalFetch: typeof globalThis.fetch;
  let originalToken: string | undefined;

  beforeEach(async () => {
    await clear();
    originalFetch = globalThis.fetch;
    originalToken = process.env.OPENROUTER_API_TOKEN;
    process.env.OPENROUTER_API_TOKEN = "test-token";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalToken !== undefined) {
      process.env.OPENROUTER_API_TOKEN = originalToken;
    } else {
      delete process.env.OPENROUTER_API_TOKEN;
    }
  });

  it("plain transitions only -> uses callLlm directly", async () => {
    const { executeProposerLlm } = await import("./llm.js");
    const plainCtx: ProposerContext = {
      sessionId: "s1",
      currentState: "pending",
      prompt: "Decide",
      transitions: { close: { target: "closed" }, reopen: { target: "open" } },
      history: [],
    };

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: '{"transitionName":"close","toState":"closed","reasoning":"done"}' } }],
      }),
    });
    globalThis.fetch = mockFetch as unknown as typeof fetch;

    const result = await executeProposerLlm(async () => "context", "test-model", plainCtx);
    expect(result.transitionName).toBe("close");
    expect(result.toState).toBe("closed");
    expect(mockFetch).toHaveBeenCalledTimes(1);
    const body = JSON.parse((mockFetch.mock.calls[0] as [string, { body: string }])[1].body) as Record<string, unknown>;
    expect(body.tools).toBeUndefined();
  });

  it("text path returns metaJson from LLM response when present", async () => {
    const { executeProposerLlm } = await import("./llm.js");
    const plainCtx: ProposerContext = {
      sessionId: "s1",
      currentState: "pending",
      prompt: "Decide",
      transitions: { close: { target: "closed" } },
      history: [],
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: '{"transitionName":"close","toState":"closed","reasoning":"done","metaJson":{"key":"val"}}' } }],
      }),
    }) as unknown as typeof fetch;

    const result = await executeProposerLlm(async () => "context", "test-model", plainCtx);
    expect(result.metaJson).toEqual({ key: "val" });
  });

  it("text path returns undefined metaJson when LLM response omits it", async () => {
    const { executeProposerLlm } = await import("./llm.js");
    const plainCtx: ProposerContext = {
      sessionId: "s1",
      currentState: "pending",
      prompt: "Decide",
      transitions: { close: { target: "closed" } },
      history: [],
    };
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true, status: 200,
      text: async () => JSON.stringify({
        choices: [{ message: { content: '{"transitionName":"close","toState":"closed","reasoning":"done"}' } }],
      }),
    }) as unknown as typeof fetch;

    const result = await executeProposerLlm(async () => "context", "test-model", plainCtx);
    expect(result.metaJson).toBeUndefined();
  });
});

describe("parseModelId", () => {
  it("parses plain model ID", async () => {
    const { parseModelId } = await import("./llm.js");
    expect(parseModelId("openai/gpt-4")).toEqual({ modelId: "openai/gpt-4", useTools: true });
  });

  it("parses model ID with [tools=no]", async () => {
    const { parseModelId } = await import("./llm.js");
    expect(parseModelId("openai/gpt-4[tools=no]")).toEqual({ modelId: "openai/gpt-4", useTools: false });
  });

  it("parses model ID with unknown flags (useTools defaults true)", async () => {
    const { parseModelId } = await import("./llm.js");
    expect(parseModelId("openai/gpt-4[streaming=yes]")).toEqual({ modelId: "openai/gpt-4", useTools: true });
  });
});
