#!/usr/bin/env npx tsx
/**
 * hanoi-sim.ts — Playwright-driven Hanoi simulation CLI
 *
 * Starts a new Hanoi session in the browser, plays optimal moves by clicking
 * the [data-optimal] transition row, and captures specialist alignment scores
 * from the API after each step.
 *
 * Usage:
 *   npx tsx examples/hanoi-sim.ts
 *   npx tsx examples/hanoi-sim.ts --wait 15        # 15s between rounds
 *   npx tsx examples/hanoi-sim.ts --disks 3        # expected disk count (default 3)
 *   npx tsx examples/hanoi-sim.ts --headed          # show browser window
 *   npx tsx examples/hanoi-sim.ts --url http://localhost:3001
 *
 * Requires the dev server to be running (npm run dev in examples/).
 */

import { chromium } from "@playwright/test";

// ============================================================================
// CLI args
// ============================================================================

function arg(name: string, fallback: string): string {
  const idx = process.argv.findIndex((a) => a === `--${name}`);
  return idx >= 0 ? (process.argv[idx + 1] ?? fallback) : fallback;
}
function flag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

const WAIT_S = parseFloat(arg("wait", "10"));
const NUM_DISKS = parseInt(arg("disks", "3"), 10);
const OPTIMAL_MOVES = 2 ** NUM_DISKS - 1;
const BASE_URL = arg("url", "http://localhost:3000");
const HEADED = flag("headed");

// ============================================================================
// Types
// ============================================================================

interface SpecialistScore {
  score: number;
  wins: string;
  winRate: number;
}

interface StepRecord {
  step: number;
  move: string;
  alignment: Record<string, SpecialistScore>;
}

// ============================================================================
// Main
// ============================================================================

async function main(): Promise<void> {
  console.log(`\n╔═══════════════════════════════════════════════════════════════╗`);
  console.log(`║  Hanoi Simulation — ${NUM_DISKS} disks, ${WAIT_S}s wait, optimal: ${OPTIMAL_MOVES} moves  `);
  console.log(`╚═══════════════════════════════════════════════════════════════╝\n`);

  const browser = await chromium.launch({ headless: !HEADED });
  const context = await browser.newContext();
  const page = await context.newPage();

  // ── Start session via API (with metaJson for disk count) ───────────
  console.log(`Connecting to ${BASE_URL}...`);
  const createRes = await page.request.post(`${BASE_URL}/api/machines/hanoi/sessions`, {
    data: { metaJson: { numDisks: NUM_DISKS } },
  });
  const { sessionId, url } = (await createRes.json()) as { sessionId: string; url: string };
  await page.goto(`${BASE_URL}${url}`);
  await page.locator("text=0 transitions").waitFor({ timeout: 5_000 });

  console.log(`Session: ${sessionId}\n`);

  const steps: StepRecord[] = [];
  const totalSteps = OPTIMAL_MOVES + 1; // disk moves + declare_solved

  // ── Play optimal moves ─────────────────────────────────────────────
  for (let step = 1; step <= totalSteps; step++) {
    // Wait for optimal marker
    const optimal = page.locator("[data-optimal='true']");
    await optimal.waitFor({ timeout: 10_000 });
    const move = (await optimal.getAttribute("data-transition")) ?? "unknown";

    // Wait for specialists to propose
    process.stdout.write(
      `  Step ${String(step).padStart(2)}/${totalSteps}: waiting ${WAIT_S}s for proposals...`
    );
    await page.waitForTimeout(WAIT_S * 1_000);

    // Click the optimal move
    await optimal.click();
    process.stdout.write(` ${move}`);

    // Wait for UI to reflect the transition
    await page.locator(`text=${step} transition`).waitFor({ timeout: 5_000 });

    // Brief pause for alignment updates to propagate
    await page.waitForTimeout(1_000);

    // Fetch alignment from API
    const metricsRes = await page.request.get(
      `${BASE_URL}/api/sessions/${sessionId}/metrics`
    );
    const metrics = (await metricsRes.json()) as {
      specialists?: {
        specialistId: string;
        alignment: number;
        winningProposals: number;
        totalProposals: number;
        winRate: number;
      }[];
    };

    const alignment: Record<string, SpecialistScore> = {};
    if (metrics.specialists) {
      for (const s of metrics.specialists) {
        alignment[s.specialistId] = {
          score: s.alignment,
          wins: `${s.winningProposals}/${s.totalProposals}`,
          winRate: s.winRate,
        };
      }
    }

    steps.push({ step, move, alignment });

    // Print inline alignment
    const scores = Object.entries(alignment)
      .map(([id, a]) => `${shortName(id)}=${a.score.toFixed(3)}`)
      .join(" ");
    console.log(`  ${scores || "(no data)"}`);
  }

  // ── Verify solved ──────────────────────────────────────────────────
  const solved = await page.locator("text=Puzzle Solved!").isVisible();
  const terminal = await page.locator("text=Goal state reached").isVisible();

  console.log(
    `\n  ${solved && terminal ? "Puzzle solved!" : "WARNING: puzzle may not be solved"}\n`
  );

  // ── Print summary table ────────────────────────────────────────────
  const specialistIds = [
    ...new Set(steps.flatMap((s) => Object.keys(s.alignment))),
  ];
  const colW = 18;
  const nameW = 15;

  const header =
    `${"Step".padEnd(6)}${"Move".padEnd(nameW)}` +
    specialistIds.map((id) => shortName(id).padEnd(colW)).join("");
  const divider = "─".repeat(header.length);

  console.log(divider);
  console.log(header);
  console.log(divider);

  for (const s of steps) {
    const cols = specialistIds
      .map((id) => {
        const a = s.alignment[id];
        return a ? `${a.score.toFixed(3)} (${a.wins})`.padEnd(colW) : "-".padEnd(colW);
      })
      .join("");
    console.log(`${String(s.step).padStart(4)}  ${s.move.padEnd(nameW)}${cols}`);
  }

  console.log(divider);

  // ── Final scores ───────────────────────────────────────────────────
  const final = steps[steps.length - 1];
  if (final) {
    console.log("\nFinal alignment:");
    for (const [id, a] of Object.entries(final.alignment)) {
      const bar = "█".repeat(Math.round(a.score * 30)) +
        "░".repeat(30 - Math.round(a.score * 30));
      console.log(`  ${shortName(id).padEnd(16)} ${bar} ${a.score.toFixed(3)} (${a.wins})`);
    }
  }

  console.log();
  await browser.close();
}

function shortName(id: string): string {
  return id.replace("llm-", "");
}

main().catch((err: unknown) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
