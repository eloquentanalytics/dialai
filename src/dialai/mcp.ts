#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import {
  runSession,
  createSession,
  getSession,
  getSessions,
  registerProposer,
  registerVoter,
  executeTransition,
  evaluateConsensus,
} from "./api.js";
import { loadMachineFromFile } from "./utils.js";
import { getToolDescription } from "./docs-loader.js";
import type { MachineDefinition } from "./types.js";

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

// Register tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "run_session",
        description: getToolDescription(
          "run_session",
          "Runs a complete session from a machine definition file path. The session will loop through decision cycles until it reaches the default state."
        ),
        inputSchema: {
          type: "object",
          properties: {
            machine_file: {
              type: "string",
              description: "Path to the machine definition JSON file",
            },
          },
          required: ["machine_file"],
        },
      },
      {
        name: "run_session_from_definition",
        description: getToolDescription(
          "run_session_from_definition",
          "Runs a complete session from a machine definition object. The session will loop through decision cycles until it reaches the default state."
        ),
        inputSchema: {
          type: "object",
          properties: {
            machine: {
              type: "object",
              description: "Machine definition object",
              properties: {
                machineName: { type: "string" },
                initialState: { type: "string" },
                defaultState: { type: "string" },
                states: {
                  type: "object",
                  additionalProperties: {
                    type: "object",
                    properties: {
                      prompt: { type: "string" },
                      transitions: {
                        type: "object",
                        additionalProperties: { type: "string" },
                      },
                    },
                  },
                },
              },
              required: ["machineName", "initialState", "defaultState", "states"],
            },
          },
          required: ["machine"],
        },
      },
      {
        name: "create_session",
        description: getToolDescription(
          "create_session",
          "Creates a new session from a machine definition"
        ),
        inputSchema: {
          type: "object",
          properties: {
            machine: {
              type: "object",
              description: "Machine definition object",
              properties: {
                machineName: { type: "string" },
                initialState: { type: "string" },
                defaultState: { type: "string" },
                states: {
                  type: "object",
                  additionalProperties: {
                    type: "object",
                    properties: {
                      prompt: { type: "string" },
                      transitions: {
                        type: "object",
                        additionalProperties: { type: "string" },
                      },
                    },
                  },
                },
              },
              required: ["machineName", "initialState", "defaultState", "states"],
            },
          },
          required: ["machine"],
        },
      },
      {
        name: "get_session",
        description: getToolDescription(
          "get_session",
          "Gets a session by its session ID"
        ),
        inputSchema: {
          type: "object",
          properties: {
            session_id: {
              type: "string",
              description: "The session ID to retrieve",
            },
          },
          required: ["session_id"],
        },
      },
      {
        name: "get_sessions",
        description: getToolDescription(
          "get_sessions",
          "Gets all active sessions"
        ),
        inputSchema: {
          type: "object",
          properties: {},
        },
      },
      {
        name: "register_proposer",
        description: getToolDescription(
          "register_proposer",
          "Registers a proposer specialist for a machine"
        ),
        inputSchema: {
          type: "object",
          properties: {
            specialist_id: { type: "string" },
            machine_name: { type: "string" },
          },
          required: ["specialist_id", "machine_name"],
        },
      },
      {
        name: "register_voter",
        description: getToolDescription(
          "register_voter",
          "Registers a voter specialist for a machine"
        ),
        inputSchema: {
          type: "object",
          properties: {
            specialist_id: { type: "string" },
            machine_name: { type: "string" },
          },
          required: ["specialist_id", "machine_name"],
        },
      },
      {
        name: "execute_transition",
        description: getToolDescription(
          "execute_transition",
          "Executes a transition in a session"
        ),
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
            transition_name: { type: "string" },
            to_state: { type: "string" },
            reasoning: { type: "string" },
          },
          required: ["session_id", "transition_name", "to_state"],
        },
      },
      {
        name: "evaluate_consensus",
        description: getToolDescription(
          "evaluate_consensus",
          "Evaluates consensus for proposals in a session"
        ),
        inputSchema: {
          type: "object",
          properties: {
            session_id: { type: "string" },
          },
          required: ["session_id"],
        },
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "run_session": {
        const machine = loadMachineFromFile(args.machine_file as string);
        const session = await runSession(machine);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  sessionId: session.sessionId,
                  machineName: session.machineName,
                  initialState: session.machine.initialState,
                  goalState: session.machine.defaultState,
                  finalState: session.currentState,
                  history: session.history,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "run_session_from_definition": {
        const machine = args.machine as MachineDefinition;
        const session = await runSession(machine);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  sessionId: session.sessionId,
                  machineName: session.machineName,
                  initialState: session.machine.initialState,
                  goalState: session.machine.defaultState,
                  finalState: session.currentState,
                  history: session.history,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "create_session": {
        const machine = args.machine as MachineDefinition;
        const session = await createSession(machine);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  sessionId: session.sessionId,
                  machineName: session.machineName,
                  currentState: session.currentState,
                  initialState: session.machine.initialState,
                  defaultState: session.machine.defaultState,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "get_session": {
        const session = await getSession(args.session_id as string);
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
          specialistId: args.specialist_id as string,
          machineName: args.machine_name as string,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  specialistId: proposer.specialistId,
                  role: proposer.role,
                  machineName: proposer.machineName,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "register_voter": {
        const voter = await registerVoter({
          specialistId: args.specialist_id as string,
          machineName: args.machine_name as string,
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  specialistId: voter.specialistId,
                  role: voter.role,
                  machineName: voter.machineName,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "execute_transition": {
        const session = await executeTransition(
          args.session_id as string,
          args.transition_name as string,
          args.to_state as string,
          (args.reasoning as string) || undefined
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  sessionId: session.sessionId,
                  currentState: session.currentState,
                  history: session.history,
                },
                null,
                2
              ),
            },
          ],
        };
      }

      case "evaluate_consensus": {
        const consensus = await evaluateConsensus(args.session_id as string);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(consensus, null, 2),
            },
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("DialAI MCP server running on stdio");
}

void main();
