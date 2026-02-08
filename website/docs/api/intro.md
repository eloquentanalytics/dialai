---
sidebar_position: 1
---

# API Reference

The DialAI API provides 9 functions for creating sessions, registering specialists, and managing the decision cycle. All functions are async and return Promises.

## Session Functions

- [`createSession`](./createSession.md) - Creates a new session instance
- [`getSession`](./getSession.md) - Retrieves a session by ID
- [`getSessions`](./getSessions.md) - Returns all stored sessions

## Specialist Functions

- [`registerProposer`](./registerProposer.md) - Registers a proposer specialist
- [`registerVoter`](./registerVoter.md) - Registers a voter specialist

## Proposal Functions

### `submitProposal(sessionId, specialistId, roundId, transitionName?, reasoning?, metaJson?): Promise<Proposal>`

Creates and stores a proposal with a generated UUID. If `transitionName` is omitted, invokes the specialist's registered strategy to generate the proposal. The `toState` is computed from `machine.states[currentState].transitions[transitionName]`.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session identifier |
| `specialistId` | `string` | Yes | The proposer's specialist ID |
| `roundId` | `string` | Yes | Associates proposal with current state round |
| `transitionName` | `string` | No | If omitted, invoke strategy; if provided, requires `isHuman: true` |
| `reasoning` | `string` | No | Explanation for the proposal |
| `metaJson` | `object` | No | Arbitrary client metadata (opaque to DIAL) |

**Direct Submission** (human specialists only):

```typescript
import { submitProposal } from "dialai";

// Only specialists registered with isHuman: true can provide transitionName
const proposal = await submitProposal(
  session.sessionId,
  "human-reviewer",  // registered with isHuman: true
  session.currentRoundId,
  "approve",
  "Document meets standards",
  { correlationId: "doc-123" }
);
```

**Strategy Invocation** (AI specialists):

```typescript
import { submitProposal } from "dialai";

// AI specialists must omit transitionName - their strategy is invoked
const proposal = await submitProposal(
  session.sessionId,
  "ai-proposer-1",
  session.currentRoundId
);
```

## Vote Functions

### `submitVote(sessionId, specialistId, roundId, proposalIdA, proposalIdB, voteFor?, reasoning?, metaJson?): Promise<Vote>`

Creates and stores a vote with a generated UUID. If `voteFor` is omitted, invokes the specialist's registered strategy to determine the vote.

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session identifier |
| `specialistId` | `string` | Yes | The voter's specialist ID |
| `roundId` | `string` | Yes | Associates vote with current state round |
| `proposalIdA` | `string` | Yes | First proposal to compare |
| `proposalIdB` | `string` | Yes | Second proposal to compare |
| `voteFor` | `"A" \| "B" \| "BOTH" \| "NEITHER"` | No | If omitted, invoke strategy; if provided, requires `isHuman: true` |
| `reasoning` | `string` | No | Explanation for the vote |
| `metaJson` | `object` | No | Arbitrary client metadata (opaque to DIAL) |

**Direct Submission** (human specialists only):

```typescript
import { submitVote } from "dialai";

// Only specialists registered with isHuman: true can provide voteFor
const vote = await submitVote(
  session.sessionId,
  "human-reviewer",  // registered with isHuman: true
  session.currentRoundId,
  proposalA.proposalId,
  proposalB.proposalId,
  "A",
  "Proposal A is better aligned",
  { reviewerId: "rev-456" }
);
```

**Strategy Invocation** (omit vote choice):

```typescript
import { submitVote } from "dialai";

// Calls specialist's registered strategy, then submits result
const vote = await submitVote(
  session.sessionId,
  "ai-voter-1",
  session.currentRoundId,
  proposalA.proposalId,
  proposalB.proposalId
);
```

## Arbitration & Execution

- [`submitArbitration`](./submitArbitration.md) - Evaluates consensus and executes winning transition
- [`executeTransition`](./executeTransition.md) - Executes a state transition directly

## Engine

- [`runSession`](./runSession.md) - Runs a machine to completion

## Types

All types are exported from the main package:

```typescript
import type {
  MachineDefinition,
  Session,
  Proposer,
  Voter,
  Proposal,
  Vote,
  ArbitrationResult,
  ProposerContext,
  VoterContext,
  VoteChoice,
} from "dialai";
```

### Proposal

```typescript
interface Proposal {
  proposalId: string;
  sessionId: string;
  roundId: string;
  specialistId: string;
  transitionName: string;
  toState: string;           // verified against machine definition
  reasoning: string;
  isHuman: boolean;          // was this submitted by a human specialist?
  metaJson?: Record<string, unknown>;
}
```

**Note on `toState`:** When a proposer's strategy returns a proposal, it must include `toState`. The engine verifies this value matches `machine.states[currentState].transitions[transitionName]`. This ensures proposals are consistent with the machine definition.

### Vote

```typescript
interface Vote {
  voteId: string;
  sessionId: string;
  roundId: string;
  specialistId: string;
  proposalIdA: string;
  proposalIdB: string;
  voteFor: VoteChoice;       // "A" | "B" | "BOTH" | "NEITHER"
  reasoning: string;
  isHuman: boolean;          // was this submitted by a human specialist?
  metaJson?: Record<string, unknown>;
}
```

## Store

The in-memory store is also exported for advanced use and testing:

```typescript
import { sessions, specialists, proposals, votes, clear } from "dialai";

// clear() resets all maps - useful for test isolation
clear();
```
