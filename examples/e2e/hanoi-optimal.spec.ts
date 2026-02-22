import { test, expect } from "@playwright/test";

/**
 * E2E test for the live Hanoi session:
 *   1. Landing page shows running sessions
 *   2. Click hanoi → session view loads via WebSocket
 *   3. Register as visitor → specialist created
 *   4. Verify visitor proposal works (appears in proposal list)
 *   5. Drive optimal solution via API arbitrate (builds alignment)
 *   6. Verify puzzle solved + alignment data captured
 *
 * Expects:
 *   HANOI_DISKS=3 TICK_INTERVAL_MS=200 npm run dev
 *   npx playwright test
 */

const OPTIMAL_MOVES = [
  "A_to_C", "A_to_B", "C_to_B", "A_to_C", "B_to_A", "B_to_C", "A_to_C", "declare_solved",
];

test("live hanoi session: register, propose, and solve with alignment", async ({ page, request }, testInfo) => {
  testInfo.setTimeout(180_000);

  // 1. Landing page → see hanoi session
  await page.goto("/");
  const hanoiLink = page.getByRole("link", { name: /hanoi/ });
  await expect(hanoiLink).toBeVisible({ timeout: 10_000 });
  await hanoiLink.click();

  // 2. Wait for session view (WebSocket snapshot delivers state)
  await expect(page.locator("text=0 transitions")).toBeVisible({ timeout: 10_000 });

  // Extract session ID from URL
  const url = page.url();
  const sessionId = url.match(/session\/([^/]+)/)?.[1];
  expect(sessionId).toBeTruthy();

  // 3. Register as visitor
  await page.getByPlaceholder("Your name").fill("E2E-Tester");
  await page.getByRole("button", { name: "Join as Specialist" }).click();
  await expect(page.getByText("Playing as:")).toBeVisible({ timeout: 5_000 });

  // Verify visitor appears in API
  const visitorsRes = await request.get("/api/visitors?machineName=hanoi");
  const visitors = await visitorsRes.json() as { handle: string }[];
  expect(visitors.some((v) => v.handle === "E2E-Tester")).toBe(true);

  // 4. Verify visitor proposal works
  const optimal = page.locator("[data-optimal='true']");
  await expect(optimal).toBeVisible({ timeout: 10_000 });
  await optimal.click();

  // Visitor's proposal appears in the proposal display
  await expect(page.locator("text=visitor-E2E-Tester").first()).toBeVisible({ timeout: 10_000 });
  console.log("Visitor proposal submitted and visible");

  // 5. Wait for specialists to propose, then drive transitions via API
  console.log("Waiting 5s for AI proposals...");
  await page.waitForTimeout(5_000);

  const steps: { step: number; move: string; alignment: Record<string, { score: number; wins: string }> }[] = [];

  for (let step = 0; step < OPTIMAL_MOVES.length; step++) {
    const move = OPTIMAL_MOVES[step];
    console.log(`Step ${step + 1}: arbitrating ${move}`);

    const arbRes = await request.post(`/api/sessions/${sessionId}/arbitrate`, {
      data: { transitionName: move, reasoning: `Optimal move ${step + 1}` },
    });
    expect(arbRes.ok()).toBe(true);

    // Wait for state to update via WebSocket
    await expect(page.locator(`text=${step + 1} transition`)).toBeVisible({ timeout: 10_000 });

    // Let server process alignment updates
    await page.waitForTimeout(500);

    // Fetch alignment data
    const metricsRes = await request.get(`/api/sessions/${sessionId}/metrics`);
    const metrics = await metricsRes.json() as {
      specialists?: { specialistId: string; alignment: number; winningProposals: number; totalProposals: number }[];
    };

    const alignment: Record<string, { score: number; wins: string }> = {};
    if (metrics.specialists) {
      for (const s of metrics.specialists) {
        alignment[s.specialistId] = {
          score: s.alignment,
          wins: `${s.winningProposals}/${s.totalProposals}`,
        };
      }
    }
    steps.push({ step: step + 1, move, alignment });

    const alignStr = Object.entries(alignment)
      .map(([id, a]) => `${id}=${a.score.toFixed(3)} (${a.wins})`)
      .join("  ");
    console.log(`  Alignment: ${alignStr || "(none yet)"}`);

    // Wait for next round's proposals before next arbitration
    if (step < OPTIMAL_MOVES.length - 1) {
      await page.waitForTimeout(3_000);
    }
  }

  // 6. Verify puzzle solved
  await expect(page.locator("text=Puzzle Solved!")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("text=Goal state reached")).toBeVisible({ timeout: 5_000 });

  // Print summary table
  console.log("\n╔══════╦═══════════════╦══════════════════════════════════════════════════════════════╗");
  console.log("║ Step ║ Move          ║ Specialist Alignment                                       ║");
  console.log("╠══════╬═══════════════╬══════════════════════════════════════════════════════════════╣");
  for (const s of steps) {
    const alignStr = Object.entries(s.alignment)
      .map(([id, a]) => `${id}=${a.score.toFixed(3)}(${a.wins})`)
      .join(" ");
    console.log(`║ ${String(s.step).padStart(4)} ║ ${s.move.padEnd(13)} ║ ${(alignStr || "-").padEnd(60)} ║`);
  }
  console.log("╚══════╩═══════════════╩══════════════════════════════════════════════════════════════╝");

  // Verify alignment data exists
  const final = steps[steps.length - 1];
  expect(Object.keys(final.alignment).length).toBeGreaterThanOrEqual(1);

  // Verify session is in solved state
  const sessionRes = await request.get(`/api/sessions/${sessionId}`);
  const session = await sessionRes.json() as { currentState: string; history: unknown[] };
  expect(session.currentState).toBe("solved");
  expect(session.history.length).toBe(8);
});
