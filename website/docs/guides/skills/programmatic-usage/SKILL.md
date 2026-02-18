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
import machineDefinition from './machine.json';

const session = await runSession(machineDefinition);

console.log('Final state:', session.currentState);
```

## Core Functions

| Function | Purpose |
|----------|---------|
| `createSession` | Start a new decision process |
| `getSession` | Check session state |
| `getSessions` | List all active sessions |
| `registerProposer` | Add a proposer to a session |
| `submitProposal` | Submit a transition proposal (with roundId) |
| `submitArbitration` | Evaluate consensus and execute transition |
| `executeTransition` | Apply a transition directly |

## Full Example

```typescript
import {
  createSession,
  registerProposer,
  submitProposal,
  submitArbitration,
  getSession
} from 'dialai';

async function runMachine(machineDefinition: MachineDefinition) {
  // 1. Create a session
  const session = await createSession(machineDefinition);
  console.log('Session created:', session.sessionId);
  console.log('Round ID:', session.currentRoundId);

  // 2. Register specialists
  await registerProposer(session.sessionId, 'ai-proposer', {
    strategy: 'llm',
    config: { model: 'claude-sonnet-4-20250514' }
  });

  // 3. Run decision cycles until goal
  let current = await getSession(session.sessionId);

  while (current.status === 'active') {
    // Submit proposals (strategy invocation - omit transitionName)
    const proposal = await submitProposal(
      current.sessionId,
      'ai-proposer',
      current.currentRoundId
    );
    console.log('Proposal:', proposal);

    // Submit arbitration - evaluates and executes if consensus
    const result = await submitArbitration(
      current.sessionId,
      current.currentRoundId
    );

    if (result.executed) {
      console.log('Transitioned to:', result.toState);
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
{
  id: string;
  machineId: string;
  currentState: string;
  status: 'active' | 'completed' | 'failed';
  history: TransitionRecord[];
  createdAt: string;
  updatedAt: string;
}
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

// Custom strategy function
const customStrategy = async (context) => {
  const { currentState, availableTransitions, history } = context;

  // Your logic here
  const action = decideAction(availableTransitions);

  return {
    action: action.name,
    target: action.target,
    reasoning: 'Custom reasoning...'
  };
};

await registerProposer(sessionId, 'custom-proposer', {
  strategy: 'custom',
  config: { handler: customStrategy }
});
```

## Error Handling

```typescript
import { createSession, DIALError } from 'dialai';

try {
  const session = await createSession(machineDefinition);
} catch (error) {
  if (error instanceof DIALError) {
    console.error('DIAL error:', error.code, error.message);
  } else {
    throw error;
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
  ArbitrationResult
} from 'dialai';
```
