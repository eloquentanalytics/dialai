/**
 * tick-loop.ts — setInterval calling tick(), stores latest results, broadcasts after tick
 */

import { tick } from "dialai";
import type { TickResult } from "dialai";

let latestResults: TickResult[] = [];
let intervalId: ReturnType<typeof setInterval> | null = null;
let tickInFlight = false;

let lastTickAt = 0;
let configuredIntervalMs = 60_000;
let onTickComplete: (() => Promise<void>) | null = null;

export function getLatestTickResults(): TickResult[] {
  return latestResults;
}

export interface TickMeta {
  lastTickAt: number;
  intervalMs: number;
  nextTickAt: number;
}

export function getTickMeta(): TickMeta {
  return {
    lastTickAt,
    intervalMs: configuredIntervalMs,
    nextTickAt: lastTickAt > 0 ? lastTickAt + configuredIntervalMs : Date.now() + configuredIntervalMs,
  };
}

export function setOnTickComplete(cb: () => Promise<void>): void {
  onTickComplete = cb;
}

export function startTickLoop(intervalMs = 60_000): void {
  if (intervalId) return;
  configuredIntervalMs = intervalMs;

  intervalId = setInterval(() => {
    if (tickInFlight) return;
    tickInFlight = true;
    void tick().then(async (results) => {
      latestResults = results;
      lastTickAt = Date.now();
      // Broadcast after tick completes
      if (onTickComplete) {
        await onTickComplete();
      }
    }).catch((err: unknown) => {
      console.error("Tick error:", err instanceof Error ? err.message : err);
    }).finally(() => {
      tickInFlight = false;
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
