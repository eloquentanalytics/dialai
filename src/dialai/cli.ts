#!/usr/bin/env node
import { runSession } from "./engine.js";
import { loadMachineFromFile } from "./utils.js";

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error("Usage: dialai <machine.json>");
    process.exit(1);
  }

  let machine;
  try {
    machine = loadMachineFromFile(args[0]);
  } catch (err) {
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
