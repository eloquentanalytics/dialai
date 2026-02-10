#!/usr/bin/env node
/**
 * DIAL AI CLI
 *
 * Command-line interface for running state machines.
 *
 * Usage:
 *   npx dialai machine.json           # Run mode
 *   npx dialai --mcp                  # MCP stdio mode
 *   DIALAI_PORT=3000 npx dialai --mcp # HTTP server mode
 *   DIALAI_BASE_URL=... npx dialai --mcp # Proxy mode
 */

import { loadMachineFromFile } from "./utils.js";
import { runSession } from "./engine.js";
import { getConfig } from "./config.js";
import { clear } from "./store.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  // Check for --mcp flag
  if (args.includes("--mcp")) {
    const config = getConfig();

    if (config.isProxyMode) {
      // Proxy mode - forward to remote server
      console.error("Starting in proxy mode...");
      console.error(`Forwarding to: ${config.baseUrl}`);
      const { startProxyClient } = await import("./proxy-client.js");
      await startProxyClient();
    } else if (config.isHttpMode) {
      // HTTP server mode
      console.error(`Starting HTTP server on port ${config.port}...`);
      const { startHttpServer } = await import("./http-server.js");
      await startHttpServer(config.port!);
    } else {
      // stdio MCP mode
      console.error("Starting MCP server (stdio)...");
      const { startMcpServer } = await import("./mcp.js");
      await startMcpServer();
    }
    return;
  }

  // Run mode - need a machine file
  if (args.length === 0) {
    console.error("Usage: dialai <machine.json>");
    console.error("       dialai --mcp");
    process.exit(1);
  }

  const filePath = args[0];

  try {
    // Load and validate machine
    const machine = await loadMachineFromFile(filePath);

    // Clear any existing state
    clear();

    // Run the session
    const session = await runSession(machine);

    // Output results
    console.log(`Machine:       ${machine.machineName}`);
    console.log(`Initial state: ${machine.initialState}`);
    console.log(`Goal state:    ${machine.goalState}`);
    console.log(`Final state:   ${session.currentState}`);
    console.log(`Session ID:    ${session.sessionId}`);

    // Show transition history if any
    if (session.history.length > 0) {
      console.log(`\nTransition history:`);
      for (const record of session.history) {
        console.log(`  - ${record.transitionName}: ${record.reasoning}`);
      }
    }

    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Session failed:`);
    console.error(message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
