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
import { createSession, runToCompletion } from 'dialai';
import machineDefinition from './machine.json';

const session = await createSession(machineDefinition);
const result = await runToCompletion(session.id);

console.log('Final state:', result.currentState);
```

## Core Functions

| Function | Purpose |
|----------|---------|
| `createSession` | Start a new decision process |
| `getSession` | Check session state |
| `getSessions` | List all active sessions |
| `registerProposer` | Add a proposer to a session |
| `registerVoter` | Add a voter to a session |
| `submitProposal` | Submit a transition proposal |
| `solicitProposal` | Ask a specialist to propose |
| `submitVote` | Cast a vote |
| `solicitVote` | Ask a specialist to vote |
| `evaluateConsensus` | Check for agreement |
| `executeTransition` | Apply the winning proposal |

## Full Example

```typescript
import {
  createSession,
  registerProposer,
  registerVoter,
  solicitProposals,
  solicitVotes,
  evaluateConsensus,
  executeTransition,
  getSession
} from 'dialai';

async function runMachine(machineDefinition: MachineDefinition) {
  // 1. Create a session
  const session = await createSession(machineDefinition);
  console.log('Session created:', session.id);

  // 2. Register specialists
  await registerProposer(session.id, 'ai-proposer', {
    strategy: 'llm',
    config: { model: 'claude-sonnet-4-20250514' }
  });

  await registerVoter(session.id, 'human-voter', {
    strategy: 'human'
  });

  // 3. Run decision cycles until goal
  let current = await getSession(session.id);

  while (current.status === 'active') {
    // Solicit proposals from all proposers
    const proposals = await solicitProposals(session.id);
    console.log('Proposals:', proposals);

    // Collect votes from all voters
    const votes = await solicitVotes(session.id, proposals);
    console.log('Votes:', votes);

    // Check consensus
    const result = await evaluateConsensus(session.id);

    if (result.consensus) {
      await executeTransition(session.id, result.winner);
      console.log('Transitioned to:', result.winner.target);
    }

    current = await getSession(session.id);
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
  console.log(`${record.fromState} -> ${record.toState}`);
  console.log(`  Action: ${record.action}`);
  console.log(`  Reasoning: ${record.reasoning}`);
  console.log(`  Timestamp: ${record.timestamp}`);
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
  Vote,
  TransitionRecord,
  ConsensusResult
} from 'dialai';
```
