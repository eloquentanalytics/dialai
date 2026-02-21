import { test, expect } from "@playwright/test";

/**
 * Plays through a full optimal Hanoi solution (7 disk moves + declare_solved)
 * by clicking whichever transition row is marked data-optimal="true", then
 * captures alignment data from the API after each step.
 *
 * Expects the dev server to be running on localhost:3000.
 */
test("solve hanoi in 7 optimal moves and capture alignment", async ({ page, request, }, testInfo) => {
  testInfo.setTimeout(180_000);
  // Start a new hanoi session
  await page.goto("/");
  await page.getByRole("link", { name: /hanoi/ }).click();
  await expect(page.locator("text=0 transitions")).toBeVisible({ timeout: 5_000 });

  // Extract session ID from URL
  const url = page.url();
  const sessionId = url.match(/session\/([^/]+)/)?.[1];
  expect(sessionId).toBeTruthy();

  const steps: { step: number; move: string; alignment: Record<string, { score: number; wins: string }> }[] = [];

  // 7 disk moves + 1 declare_solved = 8 total clicks
  for (let step = 1; step <= 8; step++) {
    // Wait for the optimal marker to appear
    const optimal = page.locator("[data-optimal='true']");
    await expect(optimal).toBeVisible({ timeout: 5_000 });

    const move = await optimal.getAttribute("data-transition") ?? "unknown";

    // Wait 10s before clicking so all specialists have time to propose
    console.log(`Step ${step}: waiting 10s for proposals...`);
    await page.waitForTimeout(10_000);

    console.log(`Step ${step}: clicking ${move}`);
    await optimal.click();

    // Wait for the transition count to update
    await expect(page.locator(`text=${step} transition`)).toBeVisible({ timeout: 5_000 });

    // Let server process alignment updates
    await page.waitForTimeout(1_000);

    // Fetch alignment data from the API
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

    steps.push({ step, move, alignment });

    const alignStr = Object.entries(alignment)
      .map(([id, a]) => `${id}=${a.score.toFixed(3)} (${a.wins})`)
      .join("  ");
    console.log(`  Alignment: ${alignStr || "(none yet)"}`);
  }

  // After all moves, verify puzzle is solved and state is terminal
  await expect(page.locator("text=Puzzle Solved!")).toBeVisible({ timeout: 5_000 });
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

  // Verify we captured meaningful alignment data
  const final = steps[steps.length - 1];
  expect(Object.keys(final.alignment).length).toBeGreaterThanOrEqual(1);

  // Verify the 7 disk moves match the known optimal sequence
  const diskMoves = steps.slice(0, 7).map((s) => s.move);
  expect(diskMoves).toEqual(["A_to_C", "A_to_B", "C_to_B", "A_to_C", "B_to_A", "B_to_C", "A_to_C"]);
  expect(steps[7].move).toBe("declare_solved");
});
