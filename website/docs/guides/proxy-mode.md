---
sidebar_position: 5
---

# Proxy Mode

DIAL supports running as an HTTP server or forwarding requests to a remote DIAL instance. This enables distributed deployments where a central DIAL server handles all state machine execution.

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `DIALAI_BASE_URL` | Forward all requests to remote MCP server at this URL |
| `DIALAI_PORT` | Port to expose HTTP endpoint (for acting as remote server) |
| `DIALAI_API_TOKEN` | Auth token (sent as Bearer token, validated on receive) |

## Running as an HTTP Server

Start the MCP server with an HTTP endpoint exposed:

```bash
DIALAI_PORT=3000 DIALAI_API_TOKEN=secret dialai-mcp
```

This starts both:
- The standard stdio MCP transport (for local MCP clients)
- An HTTP server on port 3000 (for remote clients)

The HTTP server implements the MCP Streamable HTTP transport specification, supporting both SSE streaming and direct HTTP responses.

### Authentication

When `DIALAI_API_TOKEN` is set, all HTTP requests must include a Bearer token:

```
Authorization: Bearer secret
```

Requests without a valid token receive a `401 Unauthorized` response.

## Running as a Proxy Client

Forward all tool calls to a remote DIAL server:

```bash
DIALAI_BASE_URL=http://server:3000 DIALAI_API_TOKEN=secret dialai examples/simple-machine.json
```

The CLI will connect to the remote server and execute the session there instead of locally.

### MCP Proxy Mode

The `dialai-mcp` server can also forward tool calls to a remote server:

```bash
DIALAI_BASE_URL=http://server:3000 DIALAI_API_TOKEN=secret dialai-mcp
```

In this mode, the local MCP server acts as a proxy—receiving tool calls via stdio and forwarding them to the remote HTTP server.

## Deployment Patterns

### Centralized Server

Run a single DIAL server that multiple clients connect to:

```
┌─────────────┐     HTTP      ┌─────────────┐
│  Client A   │──────────────▶│             │
└─────────────┘               │   DIAL      │
                              │   Server    │
┌─────────────┐     HTTP      │             │
│  Client B   │──────────────▶│             │
└─────────────┘               └─────────────┘
```

Server:
```bash
DIALAI_PORT=3000 DIALAI_API_TOKEN=shared-secret dialai-mcp
```

Clients:
```bash
DIALAI_BASE_URL=http://server:3000 DIALAI_API_TOKEN=shared-secret dialai machine.json
```

### MCP Gateway

Use a local MCP server as a gateway to a remote DIAL instance:

```
┌─────────────┐    stdio     ┌─────────────┐    HTTP     ┌─────────────┐
│  Claude     │─────────────▶│  Local MCP  │────────────▶│   Remote    │
│  Desktop    │              │   Proxy     │             │   Server    │
└─────────────┘              └─────────────┘             └─────────────┘
```

Remote server:
```bash
DIALAI_PORT=3000 DIALAI_API_TOKEN=secret dialai-mcp
```

Local proxy (configured in Claude Desktop):
```json
{
  "mcpServers": {
    "dialai": {
      "command": "dialai-mcp",
      "env": {
        "DIALAI_BASE_URL": "http://remote-server:3000",
        "DIALAI_API_TOKEN": "secret"
      }
    }
  }
}
```

## Security Considerations

- Always use `DIALAI_API_TOKEN` in production to prevent unauthorized access
- Use HTTPS in production (place behind a reverse proxy like nginx or Caddy)
- The token is transmitted as a Bearer token in the Authorization header
- Consider network-level security (VPN, private networks) for sensitive deployments
