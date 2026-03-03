/**
 * DIAL AI LLM & Webhook Execution
 *
 * Webhook execution: POST context to URL with Basic Auth.
 * LLM execution: Call contextFn, assemble prompt, POST to OpenAI-compatible endpoint.
 * Uses Node 18+ built-in fetch (no external dependencies).
 */

import type {
  ProposerContext,
  ProposerStrategyResult,
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
      choices: Array<{ message: { content: string } }>;
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };

    try {
      data = JSON.parse(responseBody) as typeof data;
    } catch {
      error = `Failed to parse LLM response as JSON: ${responseBody}`;
      throw new Error(error);
    }

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
        durationMs,
        error,
      });
    } catch {
      // Audit logging should not break LLM calls
    }
  }
}

/**
 * Assembles a proposer prompt for LLM mode.
 */
function assembleProposerPrompt(ctx: ProposerContext, context: string): string {
  const transitions = Object.entries(ctx.transitions)
    .map(([name, target]) => `  - "${name}" → "${target}"`)
    .join("\n");

  return `Current state: ${ctx.currentState}
Decision prompt: ${ctx.prompt}

Available transitions:
${transitions}

Context:
${context}

Respond with a JSON object: { "transitionName": "...", "toState": "...", "reasoning": "..." }
Choose exactly one transition from the available list.`;
}

/**
 * Executes a proposer LLM strategy.
 * Calls contextFn to get context, assembles prompt, calls LLM, parses response.
 */
export async function executeProposerLlm(
  contextFn: (ctx: ProposerContext) => Promise<string>,
  modelId: string,
  ctx: ProposerContext,
  auditContext?: LlmAuditContext
): Promise<ProposerStrategyResult> {
  const context = await contextFn(ctx);
  const systemMessage = "You are a decision-making specialist in a state machine. You must choose the best transition based on the context provided. Respond only with valid JSON.";
  const userMessage = assembleProposerPrompt(ctx, context);

  const startTime = Date.now();
  const result = await callLlm(modelId, systemMessage, userMessage, auditContext);
  const latencyMsec = Date.now() - startTime;

  try {
    const parsed = JSON.parse(result.content) as { transitionName: string; toState: string; reasoning: string };
    if (!parsed.transitionName || !parsed.toState) {
      throw new Error("Missing required fields in LLM response");
    }
    return {
      transitionName: parsed.transitionName,
      toState: parsed.toState,
      reasoning: parsed.reasoning,
      latencyMsec,
      numInputTokens: result.usage?.prompt_tokens,
      numOutputTokens: result.usage?.completion_tokens,
    };
  } catch (e) {
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
