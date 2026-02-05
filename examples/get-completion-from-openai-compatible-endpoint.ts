const DEFAULT_BASE_URL = "https://openrouter.ai/api/v1";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export async function getCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<string> {
  const baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_TOKEN;

  if (!apiKey) {
    throw new Error(
      "API key required. Set OPENROUTER_API_TOKEN environment variable or pass apiKey in options."
    );
  }

  const response = await fetch(
    `${baseUrl.replace(/\/$/, "")}/chat/completions`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options.model ?? "openai/gpt-4o-mini",
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 512,
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API request failed (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("No content in API response");
  }

  return content;
}
