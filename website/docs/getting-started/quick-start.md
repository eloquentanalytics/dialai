---
sidebar_position: 2
---

# Quick Start

Build your first DIAL state machine with specialists.

## What We'll Build

A trivially simple machine that asks "Should we complete this task?" and transitions from `pending` to `done`:

```mermaid
stateDiagram-v2
    [*] --> pending
    pending --> done: complete
    done --> [*]
```

## Step 1: Define the Machine

Save this as `examples/simple-machine.json`:

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

- **`initialState`**: where the session starts (`pending`)
- **`defaultState`**: the goal state where the machine comes to rest (`done`)
- **`prompt`**: the question specialists answer when the session is in that state
- **`transitions`**: the available answers and what state each leads to

Only one transition (`complete`) leads to `done`, so the machine always resolves in one cycle.

Or define the same thing in TypeScript:

```typescript
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
```

## Step 2: Run It

The quickest way to run a machine is with `runSession`, which registers a built-in proposer that picks the first available transition:

```typescript
import { runSession } from "dialai";

const session = await runSession(machine);

console.log(session.currentState); // "done"
```

That's it. One cycle, done.

## Step 3: Add a Human Specialist

The real point of DIAL is that humans can participate. Let's walk through the full API to see how a human votes to complete the task.

```typescript
import {
  createSession,
  submitProposal,
  submitVote,
  submitArbitration,
} from "dialai";

// Create a session - starts in "pending"
const session = createSession(machine);
console.log(session.currentState);   // "pending"
console.log(session.currentRoundId); // "e5f6g7h8-..."

// Two specialists each submit a proposal
const proposalComplete = await submitProposal(
  session.sessionId,
  "ai-specialist",
  session.currentRoundId,
  "complete",
  "The task is ready to complete",
  { source: "automated-check" }
);

const proposalWait = await submitProposal(
  session.sessionId,
  "contrarian-ai",
  session.currentRoundId,
  "complete",
  "I agree, let's complete it"
);

// A human votes for proposal A (complete)
await submitVote(
  session.sessionId,
  "human-reviewer",
  session.currentRoundId,
  proposalComplete.proposalId,
  proposalWait.proposalId,
  "A",
  "Yes, let's complete this task",
  { reviewedBy: "jane@example.com" }
);

// Submit arbitration - checks for consensus
const result = await submitArbitration(session.sessionId, session.currentRoundId);
console.log(result.executed);    // true (human vote created consensus)
console.log(result.toState);     // "done"

console.log(session.currentState); // "done"
console.log(session.history);      // [{ fromState: "pending", toState: "done", ... }]
```

Human votes count like any other vote during consensus evaluation. **Human primacy** means that when AI cannot reach consensus, only a human can force a decision by calling `submitArbitration` with an explicit transition.

## Step 4: Use the CLI

Run a machine definition from the command line:

```bash
node dist/dialai/cli.js examples/simple-machine.json
```

Output:
```
Machine:       simple-task
Initial state: pending
Goal state:    done
Final state:   done
Session ID:    a1b2c3d4-...
```

## What's Happening Under the Hood

1. **Session created** in `initialState` (`pending`) with a fresh `currentRoundId`
2. **Proposers solicited**: each returns a proposed transition (`complete`)
3. **Votes solicited** (if 2+ proposals): pairwise comparisons
4. **Arbitration submitted**: guards checked, ahead-by-k consensus evaluated
5. **Transition executed**: `currentState` moves to `done`, `currentRoundId` regenerated
6. **Cycle repeats** until `currentState === defaultState` (already there, done)

## Next Steps

- **[State Machines](../guides/state-machines.md)**: Design more complex workflows
- **[Registering Specialists](../guides/registering-specialists.md)**: Configure specialists with strategies
- **[Implementing Strategies](../guides/implementing-strategies.md)**: Customize strategy functions
- **[Concepts](../concepts/intro.md)**: Deep dive into DIAL's architecture
