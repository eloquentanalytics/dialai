#!/usr/bin/env node
/**
 * DIAL AI MCP Server
 *
 * Model Context Protocol server exposing DIAL API as tools.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import {
  createSession,
  getSession,
  getSessions,
  registerProposer,
  registerArbiter,
  submitProposal,
  evaluateConsensus,
  submitArbitration,
  executeTransition,
} from "./api.js";
import { runSession } from "./engine.js";
import { validateMachine } from "./utils.js";
import { getStore } from "./store.js";
import { getCollapseMetrics } from "./index.js";
import type { MachineDefinition } from "./types.js";

/**
 * Create the MCP server with all DIAL tools.
 */
export function createMcpServer(): Server {
  const server = new Server(
    {
      name: "dialai",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List available tools
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: "create_session",
          description: "Create a new session instance from a machine definition",
          inputSchema: {
            type: "object",
            properties: {
              machine: {
                type: "object",
                description: "The machine definition",
                properties: {
                  machineName: { type: "string" },
                  initialState: { type: "string" },
                  goalState: { type: "string" },
                  states: { type: "object" },
                },
                required: ["machineName", "initialState", "goalState", "states"],
              },
            },
            required: ["machine"],
          },
        },
        {
          name: "get_session",
          description: "Retrieve a session by its ID",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string", description: "The session ID" },
            },
            required: ["sessionId"],
          },
        },
        {
          name: "get_sessions",
          description: "List all sessions",
          inputSchema: {
            type: "object",
            properties: {},
          },
        },
        {
          name: "register_proposer",
          description: "Register a proposer specialist for a machine",
          inputSchema: {
            type: "object",
            properties: {
              specialistId: { type: "string", description: "Unique identifier" },
              machineName: { type: "string", description: "Machine to participate in" },
              isHuman: { type: "boolean", description: "If true, can force arbitration" },
              strategyFnName: {
                type: "string",
                description: "Built-in strategy: firstAvailable, lastAvailable, random",
              },
              threshold: { type: "number", description: "Strategy-specific threshold" },
            },
            required: ["specialistId", "machineName"],
          },
        },
        {
          name: "register_arbiter",
          description: "Register an arbiter specialist for a machine",
          inputSchema: {
            type: "object",
            properties: {
              specialistId: { type: "string", description: "Unique identifier" },
              machineName: { type: "string", description: "Machine to participate in" },
              strategyFnName: {
                type: "string",
                description:
                  "Built-in strategy: firstProposal, alignmentMargin",
              },
              threshold: { type: "number", description: "Strategy-specific threshold" },
            },
            required: ["specialistId", "machineName"],
          },
        },
        {
          name: "submit_proposal",
          description: "Submit a state transition proposal",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string", description: "Session identifier" },
              specialistId: { type: "string", description: "Who is submitting" },
              roundId: { type: "string", description: "Round ID (optional, uses current)" },
              transitionName: {
                type: "string",
                description: "Transition to propose (optional, invokes strategy)",
              },
              reasoning: { type: "string", description: "Explanation" },
              metaJson: { type: "object", description: "Arbitrary metadata" },
              costUSD: { type: "number", description: "Cost in USD" },
              latencyMsec: { type: "number", description: "Time in milliseconds" },
              numInputTokens: { type: "number", description: "Input tokens" },
              numOutputTokens: { type: "number", description: "Output tokens" },
            },
            required: ["sessionId", "specialistId"],
          },
        },
        {
          name: "evaluate_consensus",
          description: "Check if consensus has been reached (read-only)",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string", description: "Session identifier" },
            },
            required: ["sessionId"],
          },
        },
        {
          name: "submit_arbitration",
          description: "Evaluate consensus and optionally execute the winning transition",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string", description: "Session identifier" },
              roundId: { type: "string", description: "Round ID (optional)" },
              specialistId: { type: "string", description: "Who is calling" },
              transitionName: {
                type: "string",
                description: "Force this transition (human only)",
              },
              reasoning: { type: "string", description: "Explanation" },
              metaJson: { type: "object", description: "Arbitrary metadata" },
              costUSD: { type: "number", description: "Cost in USD" },
              latencyMsec: { type: "number", description: "Time in milliseconds" },
              numInputTokens: { type: "number", description: "Input tokens" },
              numOutputTokens: { type: "number", description: "Output tokens" },
            },
            required: ["sessionId"],
          },
        },
        {
          name: "execute_transition",
          description: "Execute a state transition",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string", description: "Session identifier" },
              transitionName: { type: "string", description: "Transition name" },
              toState: { type: "string", description: "Target state" },
              reasoning: { type: "string", description: "Explanation" },
            },
            required: ["sessionId", "transitionName", "toState"],
          },
        },
        {
          name: "run_session",
          description: "Run a machine to completion",
          inputSchema: {
            type: "object",
            properties: {
              machine: {
                type: "object",
                description: "The machine definition",
                properties: {
                  machineName: { type: "string" },
                  initialState: { type: "string" },
                  goalState: { type: "string" },
                  states: { type: "object" },
                  specialists: { type: "array" },
                },
                required: ["machineName", "initialState", "goalState", "states"],
              },
            },
            required: ["machine"],
          },
        },
        {
          name: "get_collapse_metrics",
          description: "Get progressive collapse metrics for a machine",
          inputSchema: {
            type: "object",
            properties: {
              machineName: { type: "string", description: "Machine name" },
            },
            required: ["machineName"],
          },
        },
        {
          name: "get_decision_log",
          description: "Get decision log records for a machine",
          inputSchema: {
            type: "object",
            properties: {
              machineName: { type: "string", description: "Machine name" },
              limit: { type: "number", description: "Max records to return (default 100)" },
            },
            required: ["machineName"],
          },
        },
      ],
    };
  });

  // Handle tool calls
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case "create_session": {
          const machine = args?.machine as MachineDefinition;
          validateMachine(machine);
          const metaJson = args?.metaJson as Record<string, unknown> | undefined;
          const session = await createSession(machine, metaJson);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(session, null, 2),
              },
            ],
          };
        }

        case "get_session": {
          const sessionId = args?.sessionId as string;
          const session = await getSession(sessionId);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(session, null, 2),
              },
            ],
          };
        }

        case "get_sessions": {
          const sessions = await getSessions();
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(sessions, null, 2),
              },
            ],
          };
        }

        case "register_proposer": {
          const proposer = await registerProposer({
            specialistId: args?.specialistId as string,
            machineName: args?.machineName as string,
            isHuman: args?.isHuman as boolean | undefined,
            strategyFnName: args?.strategyFnName as string | undefined,
            threshold: args?.threshold as number | undefined,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(proposer, null, 2),
              },
            ],
          };
        }

        case "register_arbiter": {
          const arbiter = await registerArbiter({
            specialistId: args?.specialistId as string,
            machineName: args?.machineName as string,
            strategyFnName: args?.strategyFnName as string | undefined,
            threshold: args?.threshold as number | undefined,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(arbiter, null, 2),
              },
            ],
          };
        }

        case "submit_proposal": {
          const proposal = await submitProposal({
            sessionId: args?.sessionId as string,
            specialistId: args?.specialistId as string,
            roundId: args?.roundId as string | undefined,
            transitionName: args?.transitionName as string | undefined,
            reasoning: args?.reasoning as string | undefined,
            metaJson: args?.metaJson as Record<string, unknown> | undefined,
            costUSD: args?.costUSD as number | undefined,
            latencyMsec: args?.latencyMsec as number | undefined,
            numInputTokens: args?.numInputTokens as number | undefined,
            numOutputTokens: args?.numOutputTokens as number | undefined,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(proposal, null, 2),
              },
            ],
          };
        }

        case "evaluate_consensus": {
          const result = await evaluateConsensus(args?.sessionId as string);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "submit_arbitration": {
          const result = await submitArbitration({
            sessionId: args?.sessionId as string,
            roundId: args?.roundId as string | undefined,
            specialistId: args?.specialistId as string | undefined,
            transitionName: args?.transitionName as string | undefined,
            reasoning: args?.reasoning as string | undefined,
            metaJson: args?.metaJson as Record<string, unknown> | undefined,
            costUSD: args?.costUSD as number | undefined,
            latencyMsec: args?.latencyMsec as number | undefined,
            numInputTokens: args?.numInputTokens as number | undefined,
            numOutputTokens: args?.numOutputTokens as number | undefined,
          });
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case "execute_transition": {
          const session = await executeTransition(
            args?.sessionId as string,
            args?.transitionName as string,
            args?.toState as string,
            args?.reasoning as string | undefined
          );
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(session, null, 2),
              },
            ],
          };
        }

        case "run_session": {
          const machine = args?.machine as MachineDefinition;
          validateMachine(machine);
          const session = await runSession(machine);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(session, null, 2),
              },
            ],
          };
        }

        case "get_collapse_metrics": {
          const metrics = await getCollapseMetrics(args?.machineName as string);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(metrics, null, 2),
              },
            ],
          };
        }

        case "get_decision_log": {
          const machineName = args?.machineName as string;
          const limit = (args?.limit as number) ?? 100;
          const records = await getStore().getDecisionRecordsByMachine(machineName, limit);
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(records, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${message}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start the MCP server using stdio transport.
 */
export async function startMcpServer(): Promise<void> {
  const server = createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

// Allow running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMcpServer().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });
}
