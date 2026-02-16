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
  VoterContext,
  VoterStrategyResult,
} from "./types.js";

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
 * Executes a voter webhook strategy.
 */
export async function executeVoterWebhook(
  url: string,
  ctx: VoterContext,
  machineName: string,
  webhookTokenName?: string
): Promise<VoterStrategyResult> {
  return executeWebhook<VoterStrategyResult>(
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
 *
 * @param modelId - The model ID to use
 * @param systemMessage - System prompt
 * @param userMessage - User prompt with context
 * @returns The raw text response from the model
 */
export async function callLlm(
  modelId: string,
  systemMessage: string,
  userMessage: string
): Promise<{ content: string; usage?: { prompt_tokens?: number; completion_tokens?: number } }> {
  const baseUrl = getLlmBaseUrl();
  const apiToken = getLlmApiToken();

  if (!apiToken) {
    throw new Error("No LLM API token configured. Set OPENROUTER_API_TOKEN environment variable.");
  }

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiToken}`,
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userMessage },
      ],
      temperature: 0,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM API error (${response.status}): ${text}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  if (!data.choices || data.choices.length === 0) {
    throw new Error("LLM returned no choices");
  }

  return {
    content: data.choices[0].message.content,
    usage: data.usage,
  };
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
 * Assembles a voter prompt for LLM mode.
 */
function assembleVoterPrompt(ctx: VoterContext, context: string): string {
  return `Current state: ${ctx.currentState}
Decision prompt: ${ctx.prompt}

Proposal A: transition "${ctx.proposalA.transitionName}" → "${ctx.proposalA.toState}"
  Reasoning: ${ctx.proposalA.reasoning}

Proposal B: transition "${ctx.proposalB.transitionName}" → "${ctx.proposalB.toState}"
  Reasoning: ${ctx.proposalB.reasoning}

Context:
${context}

Respond with a JSON object: { "voteFor": "A" | "B" | "BOTH" | "NEITHER", "reasoning": "..." }
Choose which proposal is better, or BOTH if equally good, or NEITHER if both are bad.`;
}

/**
 * Executes a proposer LLM strategy.
 * Calls contextFn to get context, assembles prompt, calls LLM, parses response.
 */
export async function executeProposerLlm(
  contextFn: (ctx: ProposerContext) => Promise<string>,
  modelId: string,
  ctx: ProposerContext
): Promise<ProposerStrategyResult> {
  const context = await contextFn(ctx);
  const systemMessage = "You are a decision-making specialist in a state machine. You must choose the best transition based on the context provided. Respond only with valid JSON.";
  const userMessage = assembleProposerPrompt(ctx, context);

  const result = await callLlm(modelId, systemMessage, userMessage);

  try {
    const parsed = JSON.parse(result.content) as ProposerStrategyResult;
    if (!parsed.transitionName || !parsed.toState) {
      throw new Error("Missing required fields in LLM response");
    }
    return parsed;
  } catch (e) {
    throw new Error(`Failed to parse LLM proposer response: ${result.content}`);
  }
}

/**
 * Executes a voter LLM strategy.
 * Calls contextFn to get context, assembles prompt, calls LLM, parses response.
 */
export async function executeVoterLlm(
  contextFn: (ctx: VoterContext) => Promise<string>,
  modelId: string,
  ctx: VoterContext
): Promise<VoterStrategyResult> {
  const context = await contextFn(ctx);
  const systemMessage = "You are a voting specialist in a state machine. You must evaluate two proposals and vote for the better one. Respond only with valid JSON.";
  const userMessage = assembleVoterPrompt(ctx, context);

  const result = await callLlm(modelId, systemMessage, userMessage);

  try {
    const parsed = JSON.parse(result.content) as VoterStrategyResult;
    if (!parsed.voteFor) {
      throw new Error("Missing voteFor in LLM response");
    }
    return parsed;
  } catch (e) {
    throw new Error(`Failed to parse LLM voter response: ${result.content}`);
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
  webhookTokenName?: string
): Promise<ProposerStrategyResult> {
  const contextResult = await executeWebhook<{ context: string }>(
    contextWebhookUrl,
    ctx,
    machineName,
    webhookTokenName
  );

  const contextFn = async () => contextResult.context;
  return executeProposerLlm(contextFn, modelId, ctx);
}

/**
 * Executes a context webhook for LLM mode (voter).
 */
export async function executeContextWebhookVoter(
  contextWebhookUrl: string,
  modelId: string,
  ctx: VoterContext,
  machineName: string,
  webhookTokenName?: string
): Promise<VoterStrategyResult> {
  const contextResult = await executeWebhook<{ context: string }>(
    contextWebhookUrl,
    ctx,
    machineName,
    webhookTokenName
  );

  const contextFn = async () => contextResult.context;
  return executeVoterLlm(contextFn, modelId, ctx);
}
