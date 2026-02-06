/**
 * HTTP server for exposing MCP over HTTP
 */
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { Server as HttpServer } from "node:http";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { randomUUID } from "node:crypto";

export interface HttpServerOptions {
  port: number;
  apiToken?: string;
  mcpServer: Server;
}

/**
 * Validate Bearer token from Authorization header
 */
function validateToken(
  req: IncomingMessage,
  expectedToken: string | undefined
): boolean {
  if (!expectedToken) {
    return true; // No token required
  }

  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return false;
  }

  const [scheme, token] = authHeader.split(" ");
  return scheme === "Bearer" && token === expectedToken;
}

/**
 * Start an HTTP server that exposes the MCP server
 */
export async function startHttpServer(
  options: HttpServerOptions
): Promise<HttpServer> {
  const { port, apiToken, mcpServer } = options;

  // Create transport with session ID generator for stateful mode
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: () => randomUUID(),
  });

  // Connect the MCP server to the transport
  await mcpServer.connect(transport);

  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    // Validate token for all requests
    if (!validateToken(req, apiToken)) {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }

    // Handle MCP requests
    transport.handleRequest(req, res).catch((error: unknown) => {
      if (!res.headersSent) {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            error: error instanceof Error ? error.message : "Internal server error",
          })
        );
      }
    });
  });

  return new Promise((resolve, reject) => {
    httpServer.on("error", reject);
    httpServer.listen(port, () => {
      console.error(`DialAI MCP HTTP server running on port ${port}`);
      resolve(httpServer);
    });
  });
}
