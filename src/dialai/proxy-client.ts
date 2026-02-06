/**
 * HTTP proxy client for forwarding MCP requests to a remote server
 */
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { MachineDefinition } from "./types.js";

export interface ProxyClientOptions {
  baseUrl: string;
  apiToken?: string;
}

/**
 * Create an MCP client connected to a remote server
 */
export async function createProxyClient(
  options: ProxyClientOptions
): Promise<Client> {
  const url = new URL(options.baseUrl);

  const requestInit: RequestInit = {};
  if (options.apiToken) {
    requestInit.headers = {
      Authorization: `Bearer ${options.apiToken}`,
    };
  }

  const transport = new StreamableHTTPClientTransport(url, { requestInit });

  const client = new Client(
    { name: "dialai-proxy", version: "0.1.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  return client;
}

// Type for tool call result content
interface ToolResultContent {
  type: string;
  text?: string;
  [key: string]: unknown;
}

interface ToolCallResultWithContent {
  content: ToolResultContent[];
  isError?: boolean;
}

/**
 * Run a session via proxy client
 */
export async function runSessionViaProxy(
  client: Client,
  machine: MachineDefinition
): Promise<{
  sessionId: string;
  machineName: string;
  initialState: string;
  goalState: string;
  finalState: string;
  history: unknown[];
}> {
  const result = (await client.callTool({
    name: "run_session_from_definition",
    arguments: { machine },
  })) as ToolCallResultWithContent;

  // Extract text content from the result
  const textContent = result.content.find(
    (c): c is ToolResultContent & { type: "text"; text: string } =>
      c.type === "text" && typeof c.text === "string"
  );

  if (!textContent) {
    throw new Error("No text content in response");
  }

  return JSON.parse(textContent.text) as {
    sessionId: string;
    machineName: string;
    initialState: string;
    goalState: string;
    finalState: string;
    history: unknown[];
  };
}

/**
 * Close the proxy client connection
 */
export async function closeProxyClient(client: Client): Promise<void> {
  await client.close();
}
