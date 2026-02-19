/**
 * tick-loop.ts — setInterval calling tick(), stores latest results
 */

import { tick } from "dialai";
import type { TickResult } from "dialai";

let latestResults: TickResult[] = [];
let intervalId: ReturnType<typeof setInterval> | null = null;

export function getLatestTickResults(): TickResult[] {
  return latestResults;
}

export function startTickLoop(intervalMs = 200): void {
  if (intervalId) return;

  intervalId = setInterval(() => {
    void tick().then((results) => {
      latestResults = results;
    }).catch((err: unknown) => {
      console.error("Tick error:", err instanceof Error ? err.message : err);
    });
  }, intervalMs);

  console.log(`  Tick loop started (${intervalMs}ms interval)`);
}

export function stopTickLoop(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("  Tick loop stopped");
  }
}
