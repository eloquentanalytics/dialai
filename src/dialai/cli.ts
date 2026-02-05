#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { runSession } from "./engine.js";
import type { MachineDefinition } from "./types.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Usage: dialai <machine.json>");
    process.exit(1);
  }

  const filePath = resolve(args[0]);
  let machine: MachineDefinition;
  try {
    const raw = readFileSync(filePath, "utf-8");
    machine = JSON.parse(raw) as MachineDefinition;
  } catch (err) {
    console.error(`Failed to read machine file: ${filePath}`);
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }

  try {
    const session = await runSession(machine);
    console.log(`Machine:       ${session.machineName}`);
    console.log(`Initial state: ${session.machine.initialState}`);
    console.log(`Goal state:    ${session.machine.defaultState}`);
    console.log(`Final state:   ${session.currentState}`);
    console.log(`Session ID:    ${session.sessionId}`);
  } catch (err) {
    console.error("Session failed:");
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

void main();
