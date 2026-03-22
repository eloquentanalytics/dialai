/**
 * Integration: LLM Model Compatibility
 *
 * Verifies executeProposerLlm works across models with different tool-calling
 * capabilities, hitting a live LiteLLM proxy. Covers tool-call success,
 * NoToolCallError → DIAL JSON fallback, callLlm text fallback, [tools=no],
 * and plain (unenriched) transitions.
 *
 * Estimated cost per run: <$0.01
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import { executeProposerLlm } from "../../src/dialai/llm.js";
import { clear } from "../../src/dialai/store.js";
import type { ProposerContext, TransitionDefinition } from "../../src/dialai/types.js";

// ---------------------------------------------------------------------------
// Env setup
// ---------------------------------------------------------------------------

const LITELLM_PROXY_URL = "https://litellm-proxy-c6hx.onrender.com/v1";

let savedBaseUrl: string | undefined;
let savedApiToken: string | undefined;

// ---------------------------------------------------------------------------
// Model matrix
// ---------------------------------------------------------------------------

interface ModelEntry {
  bucket: string;
  modelId: string;
  /** If true, we expect the model to pick match_existing (easy-match context). */
  expectSemantic: boolean;
}

const MODEL_MATRIX: ModelEntry[] = [
  {
    bucket: "native_tools",
    modelId: "gpt-4.1-nano",
    expectSemantic: true,
  },
  {
    bucket: "tools_via_wildcard",
    modelId: "openrouter/deepseek/deepseek-chat",
    expectSemantic: true,
  },
  {
    bucket: "small_no_tools",
    modelId: "openrouter/meta-llama/llama-3.2-3b-instruct[tools=no]",
    expectSemantic: false, // structural only — may pick wrong transition
  },
  {
    bucket: "explicit_text_path",
    modelId: "gpt-4.1-nano[tools=no]",
    expectSemantic: true,
  },
];

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ENRICHED_TRANSITIONS: Record<string, TransitionDefinition> = {
  match_existing: {
    target: "matched",
    description: "Match the incoming record to an existing record in the database.",
    parameters: {
      type: "object",
      properties: {
        confidence: {
          type: "number",
          description: "Confidence score 0-1",
        },
        reason: {
          type: "string",
          description: "Why this is a match",
        },
      },
      required: ["confidence", "reason"],
    },
  },
  create_new: {
    target: "created",
    description: "Create a brand-new record because no existing record matches.",
    parameters: {
      type: "object",
      properties: {
        reason: {
          type: "string",
          description: "Why no match was found",
        },
      },
      required: ["reason"],
    },
  },
};

const PLAIN_TRANSITIONS: Record<string, TransitionDefinition> = {
  match_existing: { target: "matched" },
  create_new: { target: "created" },
};

function makeCtx(
  transitions: Record<string, TransitionDefinition>,
): ProposerContext {
  return {
    sessionId: "test-session-compat",
    currentState: "decide_identity",
    prompt:
      "Decide whether the incoming record matches an existing record or should be created as new.",
    transitions,
    history: [],
  };
}

/** Deterministic "easy match" context — should reliably produce match_existing. */
async function contextFn(_ctx: ProposerContext): Promise<string> {
  return [
    "Incoming record:",
    '  Name: "Alice Johnson"',
    '  Email: "alice.johnson@example.com"',
    '  Phone: "+1-555-0100"',
    "",
    "Existing records:",
    '  1. Name: "Alice Johnson", Email: "alice.johnson@example.com", Phone: "+1-555-0100"',
    '  2. Name: "Bob Smith", Email: "bob.smith@example.com", Phone: "+1-555-0200"',
    "",
    "The incoming record is an exact match on name, email, and phone to record #1.",
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Integration: LLM Model Compatibility", () => {
  beforeAll(() => {
    savedBaseUrl = process.env.DIALAI_LLM_BASE_URL;
    savedApiToken = process.env.OPENROUTER_API_TOKEN;
    process.env.DIALAI_LLM_BASE_URL = LITELLM_PROXY_URL;
    // Use LITELLM_API_KEY for the proxy; fall back to OPENROUTER_API_TOKEN.
    const proxyKey = process.env.LITELLM_API_KEY ?? process.env.OPENROUTER_API_TOKEN;
    if (!proxyKey) {
      throw new Error(
        "Set LITELLM_API_KEY or OPENROUTER_API_TOKEN to run LLM compatibility tests",
      );
    }
    process.env.OPENROUTER_API_TOKEN = proxyKey;
  });

  afterAll(() => {
    if (savedBaseUrl === undefined) delete process.env.DIALAI_LLM_BASE_URL;
    else process.env.DIALAI_LLM_BASE_URL = savedBaseUrl;
    if (savedApiToken === undefined) delete process.env.OPENROUTER_API_TOKEN;
    else process.env.OPENROUTER_API_TOKEN = savedApiToken;
  });

  beforeEach(async () => {
    await clear();
  });

  it(
    "all enriched-transition models return valid results (parallel)",
    async () => {
      const results = await Promise.allSettled(
        MODEL_MATRIX.map((entry) =>
          executeProposerLlm(contextFn, entry.modelId, makeCtx(ENRICHED_TRANSITIONS)),
        ),
      );

      for (let i = 0; i < MODEL_MATRIX.length; i++) {
        const entry = MODEL_MATRIX[i];
        const result = results[i];

        if (result.status === "rejected") {
          throw new Error(
            `[${entry.bucket}] ${entry.modelId} rejected: ${result.reason}`,
          );
        }

        const v = result.value;

        // Structural assertions
        expect(
          ["match_existing", "create_new"],
          `[${entry.bucket}] transitionName`,
        ).toContain(v.transitionName);

        const expectedTarget =
          v.transitionName === "match_existing" ? "matched" : "created";
        expect(v.toState, `[${entry.bucket}] toState`).toBe(expectedTarget);
        expect(
          typeof v.reasoning,
          `[${entry.bucket}] reasoning is string`,
        ).toBe("string");
        expect(v.latencyMsec, `[${entry.bucket}] latencyMsec`).toBeGreaterThan(0);

        // Semantic assertion (only for models expected to get it right)
        if (entry.expectSemantic) {
          expect(
            v.transitionName,
            `[${entry.bucket}] semantic: should pick match_existing`,
          ).toBe("match_existing");
        }
      }
    },
    120_000,
  );

  it(
    "plain transitions (no enrichment) returns valid result via text path",
    async () => {
      const result = await executeProposerLlm(
        contextFn,
        "gpt-4.1-nano",
        makeCtx(PLAIN_TRANSITIONS),
      );

      // Structural
      expect(["match_existing", "create_new"]).toContain(result.transitionName);
      const expectedTarget =
        result.transitionName === "match_existing" ? "matched" : "created";
      expect(result.toState).toBe(expectedTarget);
      expect(typeof result.reasoning).toBe("string");
      expect(result.latencyMsec).toBeGreaterThan(0);

      // Semantic — easy match, should still get it right via text path
      expect(result.transitionName).toBe("match_existing");
    },
    60_000,
  );
});
