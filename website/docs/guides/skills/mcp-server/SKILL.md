---
name: dial-mcp-server
description: Run DIAL as an MCP server for AI assistants. Use when integrating with Claude Desktop or other MCP clients.
---

# MCP Server Mode

Expose DIAL as tools via the Model Context Protocol (MCP).

## Start the Server

```bash
npx dialai --mcp
```

## Configure Claude Desktop

Add to `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dialai": {
      "command": "npx",
      "args": ["dialai", "--mcp"]
    }
  }
}
```

### Config File Location

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| Linux | `~/.config/Claude/claude_desktop_config.json` |

## Available Tools

Once connected, Claude has access to these tools:

| Tool | Description |
|------|-------------|
| `create_session` | Start a new decision process from a machine definition |
| `get_session` | Get current state and history of a session |
| `get_sessions` | List all sessions |
| `register_proposer` | Register a proposer specialist for a machine |
| `register_arbiter` | Register an arbiter specialist for a machine |
| `submit_proposal` | Submit a transition proposal |
| `evaluate_consensus` | Check if consensus has been reached (read-only) |
| `submit_arbitration` | Evaluate consensus and optionally execute the winning transition |
| `execute_transition` | Apply a transition directly |
| `run_session` | Run a machine to completion |
| `get_collapse_metrics` | Get progressive collapse metrics |
| `get_decision_log` | Get decision log records |

## Example Conversation

**User**: Create a code review session for my PR.

**Claude** (using tools):
```
1. create_session({ machine: { machineName: "code-review", ... } })
2. register_proposer({ specialistId: "ai-reviewer", machineName: "code-review", strategyFnName: "firstAvailable" })
3. register_arbiter({ specialistId: "arbiter", machineName: "code-review", strategyFnName: "alignmentMargin" })
4. submit_proposal({ sessionId: "...", specialistId: "ai-reviewer" })
5. submit_arbitration({ sessionId: "..." })
```

## Tool Schemas

### create_session

```json
{
  "machine": {
    "machineName": "code-review",
    "initialState": "pending",
    "goalState": "approved",
    "states": { ... }
  }
}
```

### submit_proposal

```json
{
  "sessionId": "session-uuid",
  "specialistId": "proposer-id",
  "transitionName": "approve",
  "reasoning": "Why this transition"
}
```

## Server Options

```bash
# Stdio transport (default for MCP)
npx dialai --mcp
```

## Debugging

Check server logs:
```bash
npx dialai --mcp --verbose
```

Test with MCP Inspector:
```bash
npx @modelcontextprotocol/inspector npx dialai --mcp
```
