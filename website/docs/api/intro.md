---
sidebar_position: 1
---

# API Reference

The DialAI API provides 11 functions for creating sessions, registering specialists, and managing the decision cycle. Functions that invoke strategy functions (`solicitProposal`, `solicitVote`, `runSession`) are async and return Promises. All other functions are synchronous.

## Session Functions

### `createSession(machine: MachineDefinition): Session`

Creates a new session instance. Generates a UUID, sets `currentState` to `machine.initialState`, and stores the session.

```typescript
import { createSession } from "dialai";

const session = createSession(machine);
```

### `getSession(sessionId: string): Session`

Retrieves a session by ID. Throws if not found.

```typescript
import { getSession } from "dialai";

const session = getSession("a1b2c3d4-...");
```

### `getSessions(): Session[]`

Returns all stored sessions.

```typescript
import { getSessions } from "dialai";

const all = getSessions();
```

## Specialist Functions

### `registerProposer(opts): Proposer`

Registers a proposer for a session type. Supports four execution modes: `strategyFn`, `strategyWebhookUrl`, `contextFn + modelId`, or `contextWebhookUrl + modelId`. See the [registering specialists guide](../guides/registering-specialists.md) for details on all modes.

```typescript
import { registerProposer } from "dialai";

const proposer = registerProposer({
  specialistId: "ai-proposer-1",
  machineName: "my-task",
  strategyFn: async (ctx) => ({
    transitionName: Object.keys(ctx.transitions)[0],
    toState: Object.values(ctx.transitions)[0],
    reasoning: "First available",
  }),
});
```

### `registerVoter(opts): Voter`

Registers a voter for a session type. Supports the same four execution modes as `registerProposer`. See the [registering specialists guide](../guides/registering-specialists.md) for details.

```typescript
import { registerVoter } from "dialai";

const voter = registerVoter({
  specialistId: "ai-voter-1",
  machineName: "my-task",
  strategyFn: async (ctx) => ({
    voteFor: "A",
    reasoning: "Proposal A is better aligned",
  }),
});
```

## Proposal Functions

### `submitProposal(sessionId, specialistId, transitionName, toState, reasoning?): Proposal`

Creates and stores a proposal with a generated UUID.

```typescript
import { submitProposal } from "dialai";

const proposal = submitProposal(
  session.sessionId,
  "ai-proposer-1",
  "approve",
  "approved",
  "Document meets standards"
);
```

### `solicitProposal(sessionId, specialistId): Promise<Proposal>`

Calls the specialist's strategy function with the session's current state and transitions, then submits the resulting proposal. Async because strategy functions are async.

```typescript
import { solicitProposal } from "dialai";

const proposal = await solicitProposal(session.sessionId, "ai-proposer-1");
```

## Vote Functions

### `submitVote(sessionId, specialistId, proposalIdA, proposalIdB, voteFor, reasoning?): Vote`

Creates and stores a vote with a generated UUID.

```typescript
import { submitVote } from "dialai";

const vote = submitVote(
  session.sessionId,
  "ai-voter-1",
  proposalA.proposalId,
  proposalB.proposalId,
  "A",
  "Proposal A is better aligned"
);
```

### `solicitVote(sessionId, specialistId, proposalIdA, proposalIdB): Promise<Vote>`

Calls the specialist's strategy function with the two proposals, then submits the resulting vote. Async because strategy functions are async.

```typescript
import { solicitVote } from "dialai";

const vote = await solicitVote(
  session.sessionId,
  "ai-voter-1",
  proposalA.proposalId,
  proposalB.proposalId
);
```

## Consensus & Execution

### `evaluateConsensus(sessionId: string): ConsensusResult`

Evaluates consensus for all proposals and votes in the session:
- **0 proposals**: `{ consensusReached: false }`
- **1 proposal**: `{ consensusReached: true, winningProposalId: ... }`
- **2+ proposals**: Human votes override; otherwise ahead-by-k (k=1)

```typescript
import { evaluateConsensus } from "dialai";

const result = evaluateConsensus(session.sessionId);
if (result.consensusReached) {
  console.log("Winner:", result.winningProposalId);
}
```

### `executeTransition(sessionId, transitionName, toState, reasoning?): Session`

Validates the transition from the current state, records it in `session.history` with the given `reasoning`, updates `currentState`, and clears all proposals and votes for the session.

```typescript
import { executeTransition } from "dialai";

const updated = executeTransition(
  session.sessionId,
  "approve",
  "approved",
  consensus.reasoning
);
console.log(updated.currentState); // "approved"
console.log(updated.history);      // [{ fromState: "review", toState: "approved", reasoning: "...", ... }]
```

## Engine

### `runSession(machine: MachineDefinition): Promise<Session>`

Runs a machine to completion. Creates a session, registers a built-in deterministic proposer, and loops through the decision cycle until `currentState === defaultState`. Async because it awaits strategy functions.

```typescript
import { runSession } from "dialai";

const session = await runSession(machine);
```

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
  ConsensusResult,
  ProposerContext,
  VoterContext,
  VoteChoice,
} from "dialai";
```

## Store

The in-memory store is also exported for advanced use and testing:

```typescript
import { sessions, specialists, proposals, votes, clear } from "dialai";

// clear() resets all maps - useful for test isolation
clear();
```
