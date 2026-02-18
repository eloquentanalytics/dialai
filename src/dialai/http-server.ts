/**
 * DIAL AI HTTP Server
 *
 * HTTP transport for MCP server with Bearer token authentication.
 */

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createMcpServer } from "./mcp.js";
import { DIALAI_API_TOKEN } from "./config.js";
import { validateMachine } from "./utils.js";

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

  // Serve dashboard on GET /dashboard
  if (req.method === "GET" && req.url === "/dashboard") {
    res.writeHead(200, { "Content-Type": "text/html" });
    res.end(getDashboardHtml());
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
      { name: "register_arbiter", description: "Register an arbiter" },
      { name: "submit_proposal", description: "Submit a proposal" },
      { name: "evaluate_consensus", description: "Evaluate consensus" },
      { name: "submit_arbitration", description: "Submit arbitration" },
      { name: "execute_transition", description: "Execute a transition" },
      { name: "run_session", description: "Run a session to completion" },
      { name: "get_collapse_metrics", description: "Get progressive collapse metrics for a machine" },
      { name: "get_decision_log", description: "Get decision log records for a machine" },
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
    registerArbiter,
    submitProposal,
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
    case "register_arbiter":
      result = await registerArbiter({
        specialistId: args.specialistId as string,
        machineName: args.machineName as string,
        strategyFnName: args.strategyFnName as string | undefined,
        threshold: args.threshold as number | undefined,
      });
      break;
    case "submit_proposal":
      result = await submitProposal({
        sessionId: args.sessionId as string,
        specialistId: args.specialistId as string,
        roundId: args.roundId as string | undefined,
        transitionName: args.transitionName as string | undefined,
        reasoning: args.reasoning as string | undefined,
        metaJson: args.metaJson as Record<string, unknown> | undefined,
        costUSD: args.costUSD as number | undefined,
        latencyMsec: args.latencyMsec as number | undefined,
        numInputTokens: args.numInputTokens as number | undefined,
        numOutputTokens: args.numOutputTokens as number | undefined,
      });
      break;
    case "evaluate_consensus":
      result = await evaluateConsensus(args.sessionId as string);
      break;
    case "submit_arbitration":
      result = await submitArbitration({
        sessionId: args.sessionId as string,
        roundId: args.roundId as string | undefined,
        specialistId: args.specialistId as string | undefined,
        transitionName: args.transitionName as string | undefined,
        reasoning: args.reasoning as string | undefined,
        metaJson: args.metaJson as Record<string, unknown> | undefined,
        costUSD: args.costUSD as number | undefined,
        latencyMsec: args.latencyMsec as number | undefined,
        numInputTokens: args.numInputTokens as number | undefined,
        numOutputTokens: args.numOutputTokens as number | undefined,
      });
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
    case "get_collapse_metrics": {
      const { getCollapseMetrics } = await import("./index.js");
      result = getCollapseMetrics(args.machineName as string);
      break;
    }
    case "get_decision_log": {
      const { decisionLog } = await import("./store.js");
      const machineName = args.machineName as string;
      const limit = (args.limit as number) ?? 100;
      const all = [...decisionLog.values()]
        .filter((d) => d.machineName === machineName)
        .slice(-limit);
      result = all;
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

/**
 * Returns the standalone dashboard HTML page.
 */
function getDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>DIAL AI — Collapse Monitor</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0d1117; color: #c9d1d9; padding: 20px; }
  h1 { font-size: 1.4rem; color: #58a6ff; margin-bottom: 4px; }
  .subtitle { font-size: 0.85rem; color: #8b949e; margin-bottom: 20px; }
  .grid { display: grid; grid-template-columns: 280px 1fr; gap: 20px; }
  .card { background: #161b22; border: 1px solid #30363d; border-radius: 8px; padding: 16px; }
  .card h2 { font-size: 0.95rem; color: #8b949e; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  .gauge-wrap { display: flex; justify-content: center; margin-bottom: 12px; }
  .stat-row { display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid #21262d; font-size: 0.85rem; }
  .stat-row:last-child { border: none; }
  .stat-label { color: #8b949e; }
  .stat-value { color: #c9d1d9; font-weight: 600; }
  .signal-badge { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 0.8rem; margin: 2px 4px 2px 0; font-weight: 600; }
  .signal-action { background: #da363340; color: #f85149; border: 1px solid #f8514950; }
  .signal-warning { background: #d2992240; color: #d29922; border: 1px solid #d2992250; }
  .signal-info { background: #23883840; color: #3fb950; border: 1px solid #3fb95050; }
  .right-col { display: flex; flex-direction: column; gap: 20px; }
  .specialist-table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  .specialist-table th { text-align: left; color: #8b949e; padding: 6px 8px; border-bottom: 1px solid #30363d; }
  .specialist-table td { padding: 6px 8px; border-bottom: 1px solid #21262d; }
  .bar { height: 8px; border-radius: 4px; background: #21262d; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 4px; transition: width 0.5s; }
  .bar-blue { background: #58a6ff; }
  .bar-green { background: #3fb950; }
  .decision-stream { max-height: 260px; overflow-y: auto; font-size: 0.82rem; }
  .decision-item { display: flex; gap: 8px; padding: 5px 0; border-bottom: 1px solid #21262d; align-items: center; }
  .decision-item:last-child { border: none; }
  .tag { display: inline-block; padding: 1px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 600; }
  .tag-human { background: #da363340; color: #f85149; }
  .tag-ai { background: #23883840; color: #3fb950; }
  .sparkline-row { display: flex; align-items: center; gap: 10px; padding: 4px 0; font-size: 0.85rem; }
  .sparkline-label { width: 120px; color: #8b949e; flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; }
  .sparkline-svg { flex: 1; height: 30px; }
  .no-data { color: #484f58; font-style: italic; font-size: 0.85rem; padding: 12px 0; }
  .machine-input { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; }
  .machine-input label { font-size: 0.85rem; color: #8b949e; }
  .machine-input input { background: #0d1117; border: 1px solid #30363d; color: #c9d1d9; padding: 4px 8px; border-radius: 4px; font-size: 0.85rem; width: 160px; }
  .refresh-note { font-size: 0.75rem; color: #484f58; }
</style>
</head>
<body>
<h1>DIAL AI — Collapse Monitor</h1>
<div class="subtitle">
  <span class="machine-input">
    <label>Machine:</label>
    <input id="machine-name" type="text" value="hanoi" />
    <span class="refresh-note">Auto-refreshes every 2s</span>
  </span>
</div>

<div class="grid">
  <div>
    <div class="card" style="margin-bottom:20px">
      <h2>Collapse Gauge</h2>
      <div class="gauge-wrap">
        <svg id="gauge" width="200" height="120" viewBox="0 0 200 120"></svg>
      </div>
      <div id="stats"></div>
    </div>
    <div class="card">
      <h2>Signals</h2>
      <div id="signals"><span class="no-data">No data yet</span></div>
    </div>
  </div>

  <div class="right-col">
    <div class="card">
      <h2>Alignment Timeline</h2>
      <div id="sparklines"><span class="no-data">No data yet</span></div>
    </div>
    <div class="card">
      <h2>Specialists</h2>
      <div id="specialists"><span class="no-data">No data yet</span></div>
    </div>
    <div class="card">
      <h2>Decision Stream</h2>
      <div id="decisions" class="decision-stream"><span class="no-data">No data yet</span></div>
    </div>
  </div>
</div>

<script>
const BASE = window.location.origin;

function rpc(method, params) {
  return fetch(BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  }).then(r => r.json()).then(j => {
    if (j.result && j.result.content && j.result.content[0])
      return JSON.parse(j.result.content[0].text);
    return null;
  }).catch(() => null);
}

function drawGauge(ratio) {
  const svg = document.getElementById('gauge');
  const pct = Math.round(ratio * 100);
  const angle = Math.PI * ratio;
  const cx = 100, cy = 105, r = 85;
  const x1 = cx - r, y1 = cy;
  const x2 = cx + r * Math.cos(Math.PI - angle);
  const y2 = cy - r * Math.sin(angle);
  const large = ratio > 0.5 ? 1 : 0;

  // Color: red(0%) -> yellow(50%) -> green(100%)
  let color;
  if (ratio < 0.5) color = '#d29922';
  else if (ratio < 0.8) color = '#58a6ff';
  else color = '#3fb950';

  svg.innerHTML =
    '<path d="M ' + x1 + ' ' + cy + ' A ' + r + ' ' + r + ' 0 1 1 ' + (cx+r) + ' ' + cy + '" fill="none" stroke="#21262d" stroke-width="14" stroke-linecap="round"/>' +
    (ratio > 0.001 ? '<path d="M ' + x1 + ' ' + cy + ' A ' + r + ' ' + r + ' 0 ' + large + ' 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + '" fill="none" stroke="' + color + '" stroke-width="14" stroke-linecap="round"/>' : '') +
    '<text x="' + cx + '" y="' + (cy - 20) + '" text-anchor="middle" fill="' + color + '" font-size="32" font-weight="700">' + pct + '%</text>' +
    '<text x="' + cx + '" y="' + (cy - 2) + '" text-anchor="middle" fill="#8b949e" font-size="11">collapse ratio</text>';
}

function renderStats(m) {
  const el = document.getElementById('stats');
  el.innerHTML = [
    ['Total Decisions', m.totalDecisions],
    ['Human', m.humanDecisions],
    ['AI', m.aiDecisions],
    ['Recent Collapse', (m.recentCollapseRatio * 100).toFixed(0) + '%'],
    ['Avg Margin', m.averageConsensusMargin.toFixed(3)],
  ].map(([l,v]) => '<div class="stat-row"><span class="stat-label">' + l + '</span><span class="stat-value">' + v + '</span></div>').join('');
}

function renderSignals(signals) {
  const el = document.getElementById('signals');
  if (!signals || signals.length === 0) { el.innerHTML = '<span class="no-data">No active signals</span>'; return; }
  el.innerHTML = signals.map(s =>
    '<span class="signal-badge signal-' + s.level + '">' + s.code + '</span> <span style="font-size:0.82rem">' + s.message + '</span><br>'
  ).join('');
}

function renderSpecialists(specs) {
  const el = document.getElementById('specialists');
  if (!specs || specs.length === 0) { el.innerHTML = '<span class="no-data">No specialist data</span>'; return; }
  el.innerHTML = '<table class="specialist-table"><tr><th>Specialist</th><th>Alignment</th><th>Win Rate</th><th>Proposals</th></tr>' +
    specs.map(s =>
      '<tr><td>' + s.specialistId + '</td>' +
      '<td><div class="bar" style="width:80px"><div class="bar-fill bar-blue" style="width:' + (s.alignment * 100) + '%"></div></div> ' + s.alignment.toFixed(2) + '</td>' +
      '<td><div class="bar" style="width:80px"><div class="bar-fill bar-green" style="width:' + (s.winRate * 100) + '%"></div></div> ' + (s.winRate * 100).toFixed(0) + '%</td>' +
      '<td>' + s.winningProposals + '/' + s.totalProposals + '</td></tr>'
    ).join('') + '</table>';
}

let decisionHistory = [];

function renderDecisions(decisions) {
  const el = document.getElementById('decisions');
  if (!decisions || decisions.length === 0) { el.innerHTML = '<span class="no-data">No decisions yet</span>'; return; }
  const recent = decisions.slice(-30).reverse();
  el.innerHTML = recent.map(d =>
    '<div class="decision-item">' +
    '<span class="tag ' + (d.isHuman ? 'tag-human' : 'tag-ai') + '">' + (d.isHuman ? 'HUMAN' : 'AI') + '</span>' +
    '<span>' + d.fromState + ' \\u2192 ' + d.toState + '</span>' +
    '<span style="color:#8b949e">' + d.transitionName + '</span>' +
    (d.consensusMargin !== null ? '<span style="color:#484f58">margin ' + d.consensusMargin.toFixed(2) + '</span>' : '') +
    '</div>'
  ).join('');
}

// Sparkline data: track alignment over time per specialist
let sparklineData = {};

function updateSparklines(decisions) {
  sparklineData = {};
  for (const d of decisions) {
    for (const [id, score] of Object.entries(d.alignmentSnapshot)) {
      if (!sparklineData[id]) sparklineData[id] = [];
      sparklineData[id].push(score);
    }
  }

  const el = document.getElementById('sparklines');
  const ids = Object.keys(sparklineData);
  if (ids.length === 0) { el.innerHTML = '<span class="no-data">No alignment history</span>'; return; }

  el.innerHTML = ids.map(id => {
    const pts = sparklineData[id];
    const w = 200, h = 28, pad = 2;
    const n = pts.length;
    if (n < 2) return '<div class="sparkline-row"><span class="sparkline-label">' + id + '</span><span class="no-data">1 point</span></div>';
    const coords = pts.map((v, i) => {
      const x = pad + (i / (n - 1)) * (w - 2 * pad);
      const y = h - pad - v * (h - 2 * pad);
      return x.toFixed(1) + ',' + y.toFixed(1);
    }).join(' ');
    const last = pts[pts.length - 1];
    return '<div class="sparkline-row"><span class="sparkline-label">' + id + '</span>' +
      '<svg class="sparkline-svg" viewBox="0 0 ' + w + ' ' + h + '"><polyline points="' + coords + '" fill="none" stroke="#58a6ff" stroke-width="1.5"/></svg>' +
      '<span style="font-size:0.8rem;width:40px;text-align:right">' + last.toFixed(2) + '</span></div>';
  }).join('');
}

async function refresh() {
  const machine = document.getElementById('machine-name').value.trim();
  if (!machine) return;

  const [metrics, decisions] = await Promise.all([
    rpc('tools/call', { name: 'get_collapse_metrics', arguments: { machineName: machine } }),
    rpc('tools/call', { name: 'get_decision_log', arguments: { machineName: machine, limit: 200 } }),
  ]);

  if (metrics) {
    drawGauge(metrics.collapseRatio);
    renderStats(metrics);
    renderSignals(metrics.signals);
    renderSpecialists(metrics.specialists);
  } else {
    drawGauge(0);
  }

  if (decisions) {
    decisionHistory = decisions;
    renderDecisions(decisions);
    updateSparklines(decisions);
  }
}

// Initial render
drawGauge(0);
refresh();
setInterval(refresh, 2000);
</script>
</body>
</html>`;
}
