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
| `dialai_create_session` | Start a new decision process from a machine definition |
| `dialai_get_session` | Get current state and history of a session |
| `dialai_get_sessions` | List all active sessions |
| `dialai_submit_proposal` | Submit a transition proposal |
| `dialai_submit_vote` | Cast a vote between proposals |
| `dialai_evaluate_consensus` | Check if consensus has been reached |
| `dialai_execute_transition` | Apply the winning proposal |

## Example Conversation

**User**: Create a code review session for my PR.

**Claude** (using tools):
```
1. dialai_create_session({ machine: "code-review", context: { pr: 123 } })
2. dialai_submit_proposal({ sessionId: "...", action: "approve", reasoning: "Tests pass, code is clean" })
3. dialai_evaluate_consensus({ sessionId: "..." })
4. dialai_execute_transition({ sessionId: "...", action: "approve" })
```

## Tool Schemas

### dialai_create_session

```json
{
  "machine": "machine-id or inline definition",
  "context": { "optional": "metadata" }
}
```

### dialai_submit_proposal

```json
{
  "sessionId": "session-uuid",
  "specialistId": "proposer-id",
  "action": "transition-name",
  "target": "target-state",
  "reasoning": "Why this transition"
}
```

### dialai_submit_vote

```json
{
  "sessionId": "session-uuid",
  "specialistId": "voter-id",
  "proposalA": "proposal-id-1",
  "proposalB": "proposal-id-2",
  "choice": "A" | "B" | "NEITHER",
  "reasoning": "Why this choice"
}
```

## Server Options

```bash
# Default port (stdio)
npx dialai --mcp

# Custom transport
npx dialai --mcp --transport sse --port 3000
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
