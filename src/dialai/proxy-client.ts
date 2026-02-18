/**
 * DIAL AI Proxy Client
 *
 * HTTP client that forwards requests to a remote DIAL server.
 * Used when DIALAI_BASE_URL is set.
 */

import { DIALAI_BASE_URL, DIALAI_API_TOKEN } from "./config.js";
import type {
  MachineDefinition,
  Session,
  Proposal,
  Vote,
  Proposer,
  Voter,
  Arbiter,
  ConsensusResult,
  ArbitrationResult,
  RegisterProposerOptions,
  RegisterVoterOptions,
  RegisterArbiterOptions,
  SubmitProposalOptions,
  SubmitVoteOptions,
  SubmitArbitrationOptions,
} from "./types.js";

/**
 * Make a JSON-RPC request to the remote server.
 */
async function rpcCall<T>(
  method: string,
  params: Record<string, unknown>
): Promise<T> {
  const response = await fetch(DIALAI_BASE_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(DIALAI_API_TOKEN && { Authorization: `Bearer ${DIALAI_API_TOKEN}` }),
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method: `tools/call`,
      params: {
        name: method,
        arguments: params,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
  }

  const json = (await response.json()) as {
    result?: { content: Array<{ text: string }> };
    error?: { message: string };
  };

  if (json.error) {
    throw new Error(json.error.message);
  }

  const text = json.result?.content?.[0]?.text;
  if (!text) {
    throw new Error("No result in response");
  }

  return JSON.parse(text) as T;
}

// ============================================================================
// Proxy API Functions
// ============================================================================

export async function createSession(machine: MachineDefinition): Promise<Session> {
  return rpcCall<Session>("create_session", { machine });
}

export async function getSession(sessionId: string): Promise<Session> {
  return rpcCall<Session>("get_session", { sessionId });
}

export async function getSessions(): Promise<Session[]> {
  return rpcCall<Session[]>("get_sessions", {});
}

export async function registerProposer(opts: RegisterProposerOptions): Promise<Proposer> {
  return rpcCall<Proposer>("register_proposer", opts as unknown as Record<string, unknown>);
}

export async function registerVoter(opts: RegisterVoterOptions): Promise<Voter> {
  return rpcCall<Voter>("register_voter", opts as unknown as Record<string, unknown>);
}

export async function registerArbiter(opts: RegisterArbiterOptions): Promise<Arbiter> {
  return rpcCall<Arbiter>("register_arbiter", opts as unknown as Record<string, unknown>);
}

export async function submitProposal(opts: SubmitProposalOptions): Promise<Proposal> {
  return rpcCall<Proposal>("submit_proposal", opts as unknown as Record<string, unknown>);
}

export async function submitVote(opts: SubmitVoteOptions): Promise<Vote> {
  return rpcCall<Vote>("submit_vote", opts as unknown as Record<string, unknown>);
}

export async function evaluateConsensus(sessionId: string): Promise<ConsensusResult> {
  return rpcCall<ConsensusResult>("evaluate_consensus", { sessionId });
}

export async function submitArbitration(opts: SubmitArbitrationOptions): Promise<ArbitrationResult> {
  return rpcCall<ArbitrationResult>("submit_arbitration", opts as unknown as Record<string, unknown>);
}

export async function executeTransition(
  sessionId: string,
  transitionName: string,
  toState: string,
  reasoning?: string
): Promise<Session> {
  return rpcCall<Session>("execute_transition", {
    sessionId,
    transitionName,
    toState,
    reasoning,
  });
}

export async function runSession(machine: MachineDefinition): Promise<Session> {
  return rpcCall<Session>("run_session", { machine });
}

/**
 * Start the proxy client in MCP mode.
 * This exposes the same MCP interface but forwards calls to the remote server.
 */
export async function startProxyClient(): Promise<void> {
  // In proxy mode, we create an MCP server that forwards calls
  const { Server } = await import("@modelcontextprotocol/sdk/server/index.js");
  const { StdioServerTransport } = await import(
    "@modelcontextprotocol/sdk/server/stdio.js"
  );
  const {
    CallToolRequestSchema,
    ListToolsRequestSchema,
  } = await import("@modelcontextprotocol/sdk/types.js");

  const server = new Server(
    {
      name: "dialai-proxy",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Forward tools/list to remote
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const response = await fetch(DIALAI_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(DIALAI_API_TOKEN && { Authorization: `Bearer ${DIALAI_API_TOKEN}` }),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/list",
        params: {},
      }),
    });

    const json = (await response.json()) as { result?: { tools: unknown[] } };
    return { tools: json.result?.tools ?? [] };
  });

  // Forward tool calls to remote
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    const response = await fetch(DIALAI_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(DIALAI_API_TOKEN && { Authorization: `Bearer ${DIALAI_API_TOKEN}` }),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Date.now(),
        method: "tools/call",
        params: {
          name,
          arguments: args,
        },
      }),
    });

    const json = (await response.json()) as {
      result?: { content: Array<{ type: string; text: string }> };
      error?: { message: string };
    };

    if (json.error) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${json.error.message}`,
          },
        ],
        isError: true,
      };
    }

    return json.result ?? { content: [] };
  });

  const transport = new StdioServerTransport();
  await server.connect(transport);
}
