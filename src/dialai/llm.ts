/**
 * DIAL AI LLM & Webhook Execution
 *
 * Webhook execution: POST context to URL with Basic Auth.
 * LLM execution: Call contextFn, assemble prompt, POST to OpenAI-compatible endpoint.
 * Uses Node 18+ built-in fetch (no external dependencies).
 */

import type {
  Exemplar,
  ProposerContext,
  ProposerStrategyResult,
  TransitionDefinition,
  LlmAuditContext,
} from "./types.js";
import { getStore } from "./store.js";
import { randomUUID } from "node:crypto";

/** Webhook timeout in milliseconds */
const WEBHOOK_TIMEOUT_MS = 55_000;

/**
 * Executes a webhook strategy by POSTing context to the given URL.
 * Uses Basic Auth with machineName:token from the specified environment variable.
 *
 * @param url - The webhook URL
 * @param context - The context to send
 * @param machineName - Used as username for Basic Auth
 * @param webhookTokenName - Environment variable name containing the token
 * @returns The parsed response
 */
export async function executeWebhook<T>(
  url: string,
  context: unknown,
  machineName: string,
  webhookTokenName?: string
): Promise<T> {
  const token = webhookTokenName ? process.env[webhookTokenName] ?? "" : "";
  const credentials = Buffer.from(`${machineName}:${token}`).toString("base64");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), WEBHOOK_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${credentials}`,
      },
      body: JSON.stringify(context),
      signal: controller.signal,
    });

    // Handle 202 Accepted (async processing)
    if (response.status === 202) {
      throw new Error("Webhook returned 202 Accepted — async processing not yet supported");
    }

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Webhook error (${response.status}): ${text}`);
    }

    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Executes a proposer webhook strategy.
 */
export async function executeProposerWebhook(
  url: string,
  ctx: ProposerContext,
  machineName: string,
  webhookTokenName?: string
): Promise<ProposerStrategyResult> {
  return executeWebhook<ProposerStrategyResult>(
    url,
    ctx,
    machineName,
    webhookTokenName
  );
}

/**
 * Gets the LLM base URL from environment.
 */
function getLlmBaseUrl(): string {
  return process.env.DIALAI_LLM_BASE_URL ?? "https://openrouter.ai/api/v1";
}

/**
 * Gets the LLM API token from environment.
 */
function getLlmApiToken(): string {
  return process.env.OPENROUTER_API_TOKEN ?? "";
}

/**
 * Calls an OpenAI-compatible LLM endpoint.
 * Writes an audit entry to the store for every call (success or failure).
 *
 * @param modelId - The model ID to use
 * @param systemMessage - System prompt
 * @param userMessage - User prompt with context
 * @param auditContext - Optional context for audit correlation
 * @returns The raw text response from the model
 */
export async function callLlm(
  modelId: string,
  systemMessage: string,
  userMessage: string,
  auditContext?: LlmAuditContext
): Promise<{ content: string; usage?: { prompt_tokens?: number; completion_tokens?: number } }> {
  const baseUrl = getLlmBaseUrl();
  const apiToken = getLlmApiToken();

  if (!apiToken) {
    throw new Error("No LLM API token configured. Set OPENROUTER_API_TOKEN environment variable.");
  }

  const requestUrl = `${baseUrl}/chat/completions`;
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiToken}`,
  };
  const requestBody = {
    model: modelId,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    temperature: 0,
  };

  const startTime = Date.now();
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let resolvedModel: string | null = null;
  let error: string | null = null;

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    responseStatus = response.status;
    responseBody = await response.text();

    if (!response.ok) {
      error = `LLM API error (${response.status}): ${responseBody}`;
      throw new Error(error);
    }

    let data: {
      model?: string;
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    try {
      data = JSON.parse(responseBody) as typeof data;
    } catch {
      error = `Failed to parse LLM response as JSON: ${responseBody}`;
      throw new Error(error);
    }

    resolvedModel = data.model ?? null;

    if (!data.choices || data.choices.length === 0) {
      error = "LLM returned no choices";
      throw new Error(error);
    }

    return {
      content: data.choices[0].message.content,
      usage: data.usage,
    };
  } catch (e) {
    if (!error) {
      error = e instanceof Error ? e.message : String(e);
    }
    throw e;
  } finally {
    const durationMs = Date.now() - startTime;

    // Redact Authorization header for audit
    const redactedHeaders: Record<string, string> = { ...requestHeaders };
    if ("Authorization" in redactedHeaders) {
      redactedHeaders["Authorization"] = "[REDACTED]";
    }

    try {
      await getStore().appendLlmAuditEntry({
        auditEntryId: randomUUID(),
        sessionId: auditContext?.sessionId ?? null,
        specialistId: auditContext?.specialistId ?? null,
        machineName: auditContext?.machineName ?? null,
        timestamp: new Date(),
        requestUrl,
        requestHeaders: redactedHeaders,
        requestBody,
        responseStatus,
        responseBody,
        resolvedModel,
        durationMs,
        error,
      });
    } catch {
      // Audit logging should not break LLM calls
    }
  }
}

// ============================================================================
// Tool Calling Support
// ============================================================================

interface OpenAIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Builds OpenAI-compatible tool definitions from enriched transitions.
 * Returns null if no transitions have descriptions or parameters.
 */
export function buildToolsFromTransitions(
  transitions: Record<string, TransitionDefinition>,
): OpenAIToolDefinition[] | null {
  const tools: OpenAIToolDefinition[] = [];

  for (const [name, def] of Object.entries(transitions)) {
    if (def.description || def.parameters) {
      tools.push({
        type: "function",
        function: {
          name,
          description: def.description ?? name,
          parameters: def.parameters ?? { type: "object", properties: {} },
        },
      });
    }
  }

  return tools.length > 0 ? tools : null;
}

/** Result from a successful tool-calling LLM request. */
export interface ToolCallResult {
  /** The function the model chose to call */
  name: string;
  /** Parsed arguments object */
  arguments: Record<string, unknown>;
  /** Text content from the model alongside the tool call, if any */
  reasoning: string;
  /** Token usage */
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}

/** Thrown when callLlmWithTools gets a response without tool_calls. */
export class NoToolCallError extends Error {
  /** The text content the model returned instead */
  content: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };

  constructor(
    content: string,
    usage?: { prompt_tokens?: number; completion_tokens?: number },
  ) {
    super("Model did not return a tool call");
    this.name = "NoToolCallError";
    this.content = content;
    this.usage = usage;
  }
}

/**
 * Calls an OpenAI-compatible LLM endpoint with tools.
 * Writes an audit entry to the store for every call (success or failure).
 * Returns ToolCallResult on success, throws NoToolCallError if model returns text instead.
 * Throws Error (not NoToolCallError) on HTTP/network errors.
 */
export async function callLlmWithTools(
  modelId: string,
  systemMessage: string,
  userMessage: string,
  tools: OpenAIToolDefinition[],
  auditContext?: LlmAuditContext,
): Promise<ToolCallResult> {
  const baseUrl = getLlmBaseUrl();
  const apiToken = getLlmApiToken();

  if (!apiToken) {
    throw new Error("No LLM API token configured. Set OPENROUTER_API_TOKEN environment variable.");
  }

  const requestUrl = `${baseUrl}/chat/completions`;
  const requestHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiToken}`,
  };
  const requestBody: Record<string, unknown> = {
    model: modelId,
    messages: [
      { role: "system", content: systemMessage },
      { role: "user", content: userMessage },
    ],
    temperature: 0,
    tools,
    tool_choice: "auto",
  };

  const startTime = Date.now();
  let responseStatus: number | null = null;
  let responseBody: string | null = null;
  let resolvedModel: string | null = null;
  let error: string | null = null;

  try {
    const response = await fetch(requestUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestBody),
    });

    responseStatus = response.status;
    responseBody = await response.text();

    if (!response.ok) {
      error = `LLM API error (${response.status}): ${responseBody}`;
      throw new Error(error);
    }

    let data: {
      model?: string;
      choices: Array<{
        message: {
          content: string | null;
          tool_calls?: Array<{
            function: { name: string; arguments: string };
          }>;
        };
      }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    try {
      data = JSON.parse(responseBody) as typeof data;
    } catch {
      error = `Failed to parse LLM response as JSON: ${responseBody}`;
      throw new Error(error);
    }

    resolvedModel = data.model ?? null;

    if (!data.choices || data.choices.length === 0) {
      error = "LLM returned no choices";
      throw new Error(error);
    }

    const message = data.choices[0].message;
    const toolCalls = message.tool_calls;

    if (!toolCalls || toolCalls.length === 0) {
      throw new NoToolCallError(
        message.content ?? "",
        data.usage,
      );
    }

    // Use the first tool call
    const toolCall = toolCalls[0];
    let parsedArgs: Record<string, unknown>;
    try {
      parsedArgs = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
    } catch {
      parsedArgs = {};
    }

    return {
      name: toolCall.function.name,
      arguments: parsedArgs,
      reasoning: message.content ?? "",
      usage: data.usage,
    };
  } catch (e) {
    if (!error && !(e instanceof NoToolCallError)) {
      error = e instanceof Error ? e.message : String(e);
    }
    throw e;
  } finally {
    const durationMs = Date.now() - startTime;

    // Redact Authorization header for audit
    const redactedHeaders: Record<string, string> = { ...requestHeaders };
    if ("Authorization" in redactedHeaders) {
      redactedHeaders["Authorization"] = "[REDACTED]";
    }

    try {
      await getStore().appendLlmAuditEntry({
        auditEntryId: randomUUID(),
        sessionId: auditContext?.sessionId ?? null,
        specialistId: auditContext?.specialistId ?? null,
        machineName: auditContext?.machineName ?? null,
        timestamp: new Date(),
        requestUrl,
        requestHeaders: redactedHeaders,
        requestBody,
        responseStatus,
        responseBody,
        resolvedModel,
        durationMs,
        error,
      });
    } catch {
      // Audit logging should not break LLM calls
    }
  }
}

/**
 * Parses a model ID, extracting flags like [tools=no].
 */
export function parseModelId(raw: string): { modelId: string; useTools: boolean } {
  const match = raw.match(/^(.+?)(?:\[(.+)\])?$/);
  const modelId = match?.[1] ?? raw;
  const flags = match?.[2] ?? "";
  const useTools = !flags.includes("tools=no");
  return { modelId, useTools };
}

/**
 * Formats exemplars as few-shot input/output pairs for LLM prompts.
 * Returns empty string when no exemplars are available.
 */
export function formatExemplarsForPrompt(exemplars: Exemplar[]): string {
  if (exemplars.length === 0) return "";

  const examples = exemplars.map((ex, i) => {
    const transitions = Object.entries(ex.context.transitions)
      .map(([name, def]) => `  - "${name}" → "${def.target}"`)
      .join("\n");

    const humanProposal = ex.proposals.find(
      (p) => p.transitionName === ex.humanTransitionName && p.isHuman,
    );
    const reasoning = humanProposal?.reasoning ?? "";

    const output = JSON.stringify({
      transitionName: ex.humanTransitionName,
      toState: ex.humanToState,
      reasoning,
    });

    return `Example ${i + 1}:
Input:
  State: ${ex.context.currentState}
  Prompt: ${ex.context.prompt}
  Transitions:
${transitions}
Output:
${output}`;
  });

  return `\nHuman ground truth examples:\n${examples.join("\n\n")}\n`;
}

/**
 * Assembles a proposer prompt for LLM mode.
 */
function assembleProposerPrompt(ctx: ProposerContext, context: string): string {
  const transitions = Object.entries(ctx.transitions)
    .map(([name, def]) => `  - "${name}" → "${def.target}"`)
    .join("\n");

  const exemplarSection = formatExemplarsForPrompt(ctx.exemplars ?? []);

  return `Current state: ${ctx.currentState}
Decision prompt: ${ctx.prompt}

Available transitions:
${transitions}
${exemplarSection}
Context:
${context}

Respond with a JSON object: { "transitionName": "...", "toState": "...", "reasoning": "..." }
Choose exactly one transition from the available list.`;
}

/**
 * Executes a proposer LLM strategy.
 * Calls contextFn to get context, tries tool calling if transitions are enriched,
 * falls back to text-mode callLlm on NoToolCallError.
 */
export async function executeProposerLlm(
  contextFn: (ctx: ProposerContext) => Promise<string>,
  modelId: string,
  ctx: ProposerContext,
  auditContext?: LlmAuditContext
): Promise<ProposerStrategyResult> {
  const { modelId: actualModelId, useTools } = parseModelId(modelId);
  const context = await contextFn(ctx);
  const start = Date.now();

  // Attempt tool calling if transitions are enriched and model not opted out
  const tools = useTools ? buildToolsFromTransitions(ctx.transitions) : null;

  if (tools) {
    const systemMessage = "You are a function-calling AI assistant. "
      + "Use the provided tools to respond to the user's request.";
    const exemplarSection = formatExemplarsForPrompt(ctx.exemplars ?? []);
    const baseMessage = ctx.prompt ? `${ctx.prompt}\n\n${context}` : context;
    const userMessage = exemplarSection ? `${baseMessage}\n${exemplarSection}` : baseMessage;

    try {
      const result = await callLlmWithTools(
        actualModelId, systemMessage, userMessage, tools, auditContext,
      );
      const latencyMsec = Date.now() - start;

      const transitionDef = ctx.transitions[result.name];
      if (!transitionDef) {
        throw new Error(
          `Tool call "${result.name}" does not match any transition from `
          + `state "${ctx.currentState}". Available: `
          + `${Object.keys(ctx.transitions).join(", ")}`,
        );
      }

      return {
        transitionName: result.name,
        toState: transitionDef.target,
        reasoning: result.reasoning,
        metaJson: Object.keys(result.arguments).length > 0 ? result.arguments : undefined,
        latencyMsec,
        numInputTokens: result.usage?.prompt_tokens,
        numOutputTokens: result.usage?.completion_tokens,
      };
    } catch (e) {
      if (e instanceof NoToolCallError) {
        // Model returned text instead of tool call.
        // Try parsing it as DIAL JSON before falling through to text path.
        try {
          const parsed = JSON.parse(e.content) as Record<string, unknown>;
          if (parsed.transitionName && parsed.toState) {
            return {
              transitionName: parsed.transitionName as string,
              toState: parsed.toState as string,
              reasoning: (parsed.reasoning as string) ?? "",
              metaJson: parsed.metaJson as Record<string, unknown> | undefined,
              latencyMsec: Date.now() - start,
              numInputTokens: e.usage?.prompt_tokens,
              numOutputTokens: e.usage?.completion_tokens,
            };
          }
        } catch { /* not parseable, fall through to text path */ }
        // Fall through to text path below
      } else {
        // HTTP errors, network errors, invalid tool name, etc.
        // Re-throw — do NOT fall through to text path for these.
        throw e;
      }
    }
  }

  // ---- TEXT PATH (existing behavior) ----
  const systemMessage = "You are a decision-making specialist in a state machine. "
    + "You must choose the best transition based on the context provided. "
    + "Respond only with valid JSON.";
  const userMessage = assembleProposerPrompt(ctx, context);

  const result = await callLlm(actualModelId, systemMessage, userMessage, auditContext);
  const latencyMsec = Date.now() - start;

  try {
    const parsed = JSON.parse(result.content) as Record<string, unknown>;
    if (!parsed.transitionName || !parsed.toState) {
      throw new Error("Missing required fields in LLM response");
    }
    return {
      transitionName: parsed.transitionName as string,
      toState: parsed.toState as string,
      reasoning: (parsed.reasoning as string) ?? "",
      metaJson: parsed.metaJson as Record<string, unknown> | undefined,
      latencyMsec,
      numInputTokens: result.usage?.prompt_tokens,
      numOutputTokens: result.usage?.completion_tokens,
    };
  } catch {
    throw new Error(`Failed to parse LLM proposer response: ${result.content}`);
  }
}

/**
 * Executes a context webhook for LLM mode.
 * Fetches context from webhook URL, then calls LLM with that context.
 */
export async function executeContextWebhookProposer(
  contextWebhookUrl: string,
  modelId: string,
  ctx: ProposerContext,
  machineName: string,
  webhookTokenName?: string,
  auditContext?: LlmAuditContext
): Promise<ProposerStrategyResult> {
  const contextResult = await executeWebhook<{ context: string }>(
    contextWebhookUrl,
    ctx,
    machineName,
    webhookTokenName
  );

  const contextFn = async () => contextResult.context;
  return executeProposerLlm(contextFn, modelId, ctx, auditContext);
}
