---
sidebar_position: 1
---

# Examples

This section contains example implementations demonstrating DialAI usage.

## Simple Machine

The repository includes a minimal example at `examples/simple-machine.json`:

```json
{
  "machineName": "simple-task",
  "initialState": "pending",
  "defaultState": "done",
  "states": {
    "pending": {
      "prompt": "Should we complete this task?",
      "transitions": { "complete": "done" }
    },
    "done": {}
  }
}
```

Run it with the CLI:

```bash
node dist/dialai/cli.js examples/simple-machine.json
```

Output:
```
Session type:  simple-task
Initial state: pending
Goal state:    done
Final state:   done
Session ID:    a1b2c3d4-...
```

## Programmatic Usage

```typescript
import { runSession } from "dialai";
import type { MachineDefinition } from "dialai";

const machine: MachineDefinition = {
  machineName: "simple-task",
  initialState: "pending",
  defaultState: "done",
  states: {
    pending: {
      prompt: "Should we complete this task?",
      transitions: { complete: "done" },
    },
    done: {},
  },
};

const session = runSession(machine);
console.log(session.currentState); // "done"
```

## Multi-Step Machine

A 3-state machine that requires 2 cycles to reach the goal:

```typescript
const pipeline: MachineDefinition = {
  machineName: "pipeline",
  initialState: "queued",
  defaultState: "complete",
  states: {
    queued: {
      prompt: "Start processing?",
      transitions: { start: "processing" },
    },
    processing: {
      prompt: "Processing complete. Finalize?",
      transitions: { finalize: "complete" },
    },
    complete: {},
  },
};

const session = runSession(pipeline);
// queued → processing → complete
```

## Custom Specialists Example

```typescript
import {
  createSession,
  registerSpecialist,
  solicitProposal,
  solicitVote,
  evaluateConsensus,
  executeTransition,
  clear,
} from "dialai";
import type { MachineDefinition } from "dialai";

clear(); // Reset state

const machine: MachineDefinition = {
  machineName: "review",
  initialState: "pending",
  defaultState: "approved",
  states: {
    pending: {
      transitions: {
        approve: "approved",
        reject: "rejected",
        revise: "pending",
      },
    },
    approved: {},
    rejected: {},
  },
};

// Two proposers that disagree
registerSpecialist({
  specialistId: "optimist",
  machineName: "review",
  role: "proposer",
  strategy: () => ({
    transitionName: "approve",
    toState: "approved",
    reasoning: "Looks good to me",
  }),
});

registerSpecialist({
  specialistId: "pessimist",
  machineName: "review",
  role: "proposer",
  strategy: () => ({
    transitionName: "reject",
    toState: "rejected",
    reasoning: "Needs more work",
  }),
});

// A voter that prefers approval
registerSpecialist({
  specialistId: "tiebreaker",
  machineName: "review",
  role: "voter",
  strategy: (proposalA, proposalB) => {
    if (proposalA.toState === "approved") return { voteFor: "A", reasoning: "Approve" };
    if (proposalB.toState === "approved") return { voteFor: "B", reasoning: "Approve" };
    return { voteFor: "NEITHER", reasoning: "Neither approves" };
  },
});

const session = createSession(machine);

// Solicit from both proposers
const p1 = solicitProposal(session.sessionId, "optimist");
const p2 = solicitProposal(session.sessionId, "pessimist");

// Solicit vote
solicitVote(session.sessionId, "tiebreaker", p1.proposalId, p2.proposalId);

// Evaluate and execute
const result = evaluateConsensus(session.sessionId);
if (result.consensusReached && result.winningProposalId) {
  const winner = [p1, p2].find((p) => p.proposalId === result.winningProposalId)!;
  executeTransition(session.sessionId, winner.transitionName, winner.toState, result.reasoning);
}

console.log(session.currentState); // "approved"
```
