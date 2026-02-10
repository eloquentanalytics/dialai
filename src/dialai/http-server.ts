/**
 * DIAL AI HTTP Server
 *
 * HTTP transport for MCP server with Bearer token authentication.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createMcpServer } from "./mcp.js";
import { DIALAI_API_TOKEN } from "./config.js";
import { validateMachine } from "./utils.js";
import type { VoteChoice } from "./types.js";

/** JSON-RPC request structure */
interface JsonRpcRequest {
  jsonrpc: string;
  id: number | string | null;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
}

/**
 * Simple HTTP transport that wraps the MCP server.
 * Uses JSON-RPC over HTTP POST requests.
 */
export async function startHttpServer(port: number): Promise<void> {
  const mcpServer = createMcpServer();

  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    void handleRequest(req, res, mcpServer);
  });

  httpServer.listen(port, () => {
    console.error(`DIAL AI HTTP server listening on port ${port}`);
  });

  // Keep the process running
  await new Promise(() => {});
}

async function handleRequest(
  req: IncomingMessage,
  res: ServerResponse,
  mcpServer: ReturnType<typeof createMcpServer>
): Promise<void> {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  // Only accept POST requests
  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  // Check authentication if token is configured
  if (DIALAI_API_TOKEN) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing or invalid Authorization header" }));
      return;
    }

    const token = authHeader.slice(7);
    if (token !== DIALAI_API_TOKEN) {
      res.writeHead(403, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid API token" }));
      return;
    }
  }

  // Read request body
  let body = "";
  for await (const chunk of req) {
    body += chunk;
  }

  try {
    const request = JSON.parse(body) as JsonRpcRequest;

    // Route based on JSON-RPC method
    if (request.method === "tools/list") {
      // Get tools list by triggering the handler
      const tools = await listTools(mcpServer);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: tools,
        })
      );
    } else if (request.method === "tools/call") {
      // Call a tool
      const result = await callTool(
        mcpServer,
        request.params?.name ?? "",
        request.params?.arguments ?? {}
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result,
        })
      );
    } else {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          error: { code: -32601, message: "Method not found" },
        })
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        jsonrpc: "2.0",
        id: null,
        error: { code: -32603, message },
      })
    );
  }
}

/**
 * Helper to get tools list from MCP server.
 */
async function listTools(
  _server: ReturnType<typeof createMcpServer>
): Promise<{ tools: unknown[] }> {
  // Import and call the API directly to get tool definitions
  // This is a simplified version - in production would use proper MCP transport
  return {
    tools: [
      { name: "create_session", description: "Create a new session" },
      { name: "get_session", description: "Get a session by ID" },
      { name: "get_sessions", description: "List all sessions" },
      { name: "register_proposer", description: "Register a proposer" },
      { name: "register_voter", description: "Register a voter" },
      { name: "register_arbiter", description: "Register an arbiter" },
      { name: "submit_proposal", description: "Submit a proposal" },
      { name: "submit_vote", description: "Submit a vote" },
      { name: "evaluate_consensus", description: "Evaluate consensus" },
      { name: "submit_arbitration", description: "Submit arbitration" },
      { name: "execute_transition", description: "Execute a transition" },
      { name: "run_session", description: "Run a session to completion" },
    ],
  };
}

/**
 * Helper to call a tool on the MCP server.
 */
async function callTool(
  _server: ReturnType<typeof createMcpServer>,
  name: string,
  args: Record<string, unknown>
): Promise<{ content: Array<{ type: string; text: string }> }> {
  // Import API functions and call directly
  const {
    createSession,
    getSession,
    getSessions,
    registerProposer,
    registerVoter,
    registerArbiter,
    submitProposal,
    submitVote,
    evaluateConsensus,
    submitArbitration,
    executeTransition,
  } = await import("./api.js");
  const { runSession } = await import("./engine.js");

  let result: unknown;

  switch (name) {
    case "create_session": {
      const machine = args.machine;
      validateMachine(machine);
      result = await createSession(machine);
      break;
    }
    case "get_session":
      result = await getSession(args.sessionId as string);
      break;
    case "get_sessions":
      result = await getSessions();
      break;
    case "register_proposer":
      result = await registerProposer({
        specialistId: args.specialistId as string,
        machineName: args.machineName as string,
        isHuman: args.isHuman as boolean | undefined,
        strategyFnName: args.strategyFnName as string | undefined,
        threshold: args.threshold as number | undefined,
      });
      break;
    case "register_voter":
      result = await registerVoter({
        specialistId: args.specialistId as string,
        machineName: args.machineName as string,
        isHuman: args.isHuman as boolean | undefined,
        strategyFnName: args.strategyFnName as string | undefined,
        threshold: args.threshold as number | undefined,
      });
      break;
    case "register_arbiter":
      result = await registerArbiter({
        specialistId: args.specialistId as string,
        machineName: args.machineName as string,
        strategyFnName: args.strategyFnName as string | undefined,
        threshold: args.threshold as number | undefined,
      });
      break;
    case "submit_proposal":
      result = await submitProposal(
        args.sessionId as string,
        args.specialistId as string,
        args.roundId as string | undefined,
        args.transitionName as string | undefined,
        args.reasoning as string | undefined,
        args.metaJson as Record<string, unknown> | undefined,
        args.costUSD as number | undefined,
        args.latencyMsec as number | undefined,
        args.numInputTokens as number | undefined,
        args.numOutputTokens as number | undefined
      );
      break;
    case "submit_vote":
      result = await submitVote(
        args.sessionId as string,
        args.specialistId as string,
        args.roundId as string | undefined,
        args.proposalIdA as string,
        args.proposalIdB as string,
        args.voteFor as VoteChoice | undefined,
        args.reasoning as string | undefined,
        args.metaJson as Record<string, unknown> | undefined,
        args.costUSD as number | undefined,
        args.latencyMsec as number | undefined,
        args.numInputTokens as number | undefined,
        args.numOutputTokens as number | undefined
      );
      break;
    case "evaluate_consensus":
      result = await evaluateConsensus(args.sessionId as string);
      break;
    case "submit_arbitration":
      result = await submitArbitration(
        args.sessionId as string,
        args.roundId as string | undefined,
        args.specialistId as string | undefined,
        args.transitionName as string | undefined,
        args.reasoning as string | undefined,
        args.metaJson as Record<string, unknown> | undefined,
        args.costUSD as number | undefined,
        args.latencyMsec as number | undefined,
        args.numInputTokens as number | undefined,
        args.numOutputTokens as number | undefined
      );
      break;
    case "execute_transition":
      result = await executeTransition(
        args.sessionId as string,
        args.transitionName as string,
        args.toState as string,
        args.reasoning as string | undefined
      );
      break;
    case "run_session": {
      const machine = args.machine;
      validateMachine(machine);
      result = await runSession(machine);
      break;
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }

  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(result, null, 2),
      },
    ],
  };
}
