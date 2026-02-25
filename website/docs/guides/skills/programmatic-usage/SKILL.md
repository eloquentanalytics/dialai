---
name: dial-programmatic-usage
description: Use DIAL programmatically in TypeScript/JavaScript. Use when integrating DIAL into your own code.
---

# Programmatic Usage

Integrate DIAL into your TypeScript or JavaScript code.

## Installation

```bash
npm install dialai
```

## Quick Start

```typescript
import { runSession } from 'dialai';
import type { MachineDefinition } from 'dialai';

const machine: MachineDefinition = {
  machineName: "simple-task",
  initialState: "pending",
  goalState: "done",
  states: {
    pending: {
      prompt: "Should we complete this task?",
      transitions: { complete: "done" },
    },
    done: {},
  },
};

const session = await runSession(machine);
console.log('Final state:', session.currentState); // "done"
```

## Core Functions

| Function | Purpose |
|----------|---------|
| `createSession` | Start a new decision process |
| `getSession` | Check session state |
| `getSessions` | List all sessions |
| `registerProposer` | Register a proposer specialist |
| `registerArbiter` | Register an arbiter specialist |
| `submitProposal` | Submit a transition proposal |
| `submitArbitration` | Evaluate consensus and execute transition |
| `evaluateConsensus` | Check consensus (read-only) |
| `executeTransition` | Apply a transition directly |
| `runSession` | Run a machine to its goal state |

## Full Example

```typescript
import {
  createSession,
  getSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  submitArbitration,
} from 'dialai';
import type { MachineDefinition } from 'dialai';

async function runMachine(machine: MachineDefinition) {
  // 1. Create a session
  const session = await createSession(machine);
  console.log('Session created:', session.sessionId);

  // 2. Register specialists
  await registerProposer({
    specialistId: "ai-proposer",
    machineName: machine.machineName,
    strategyFnName: "firstAvailable",
  });

  await registerArbiter({
    specialistId: "arbiter",
    machineName: machine.machineName,
    strategyFnName: "alignmentMargin",
  });

  // 3. Run decision cycles until goal
  let current = await getSession(session.sessionId);

  while (current.currentState !== current.machine.goalState) {
    // Submit proposal (strategy invocation - omit transitionName)
    await submitProposal({
      sessionId: current.sessionId,
      specialistId: "ai-proposer",
    });

    // Submit arbitration - evaluates and executes if consensus
    const result = await submitArbitration({
      sessionId: current.sessionId,
    });

    if (result.executed) {
      console.log('Transitioned to:', result.toState);
    } else {
      console.log('No consensus:', result.guardReason);
      break; // Needs human input
    }

    current = await getSession(session.sessionId);
  }

  return current;
}
```

## Inspecting Sessions

```typescript
import { getSession } from 'dialai';

const session = await getSession(sessionId);

// Session structure
// {
//   sessionId: string;
//   machineName: string;
//   currentState: string;
//   currentRoundId: string;
//   machine: MachineDefinition;
//   history: TransitionRecord[];
//   createdAt: Date;
//   metaJson?: Record<string, unknown>;
// }
```

## Accessing History

```typescript
const session = await getSession(sessionId);

for (const record of session.history) {
  console.log(`Transition: ${record.transitionName}`);
  console.log(`  Reasoning: ${record.reasoning}`);
  console.log(`  Timestamp: ${record.executionTimestamp}`);
}
```

## Custom Strategies

```typescript
import { registerProposer } from 'dialai';

await registerProposer({
  specialistId: "custom-proposer",
  machineName: "my-task",
  strategyFn: async (ctx) => {
    // ctx has: sessionId, currentState, prompt, transitions, history, metaJson
    const transitionName = Object.keys(ctx.transitions)[0];
    return {
      transitionName,
      toState: ctx.transitions[transitionName],
      reasoning: "Custom reasoning...",
    };
  },
});
```

## Error Handling

```typescript
import { createSession } from 'dialai';

try {
  const session = await createSession(machineDefinition);
} catch (error) {
  if (error instanceof Error) {
    console.error('Error:', error.message);
  }
}
```

## TypeScript Types

```typescript
import type {
  MachineDefinition,
  Session,
  Proposal,
  TransitionRecord,
  ArbitrationResult,
  ConsensusResult,
  ProposerContext,
  ArbiterContext,
} from 'dialai';
```
