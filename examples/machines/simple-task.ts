/**
 * simple-task.ts — Simple task machine module
 *
 * Minimal machine: pending -> done. No custom strategies needed —
 * uses built-in firstAvailable proposer and firstProposal arbiter.
 */

import type { MachineDefinition } from "dialai";
import type { MachineModule } from "./types.js";

const definition: MachineDefinition = {
  machineName: "simple-task",
  initialState: "pending",
  goalState: "done",
  states: {
    pending: {
      prompt: "Should we complete this task?",
      transitions: { complete: "done" },
      specialists: [
        { role: "proposer", specialistId: "simple-auto", strategyFnName: "firstAvailable" },
        { role: "arbiter", specialistId: "simple-arbiter", strategyFnName: "firstProposal" },
      ],
    },
    done: {},
  },
};

const simpleTask: MachineModule = {
  definition,
};

export default simpleTask;
