---
sidebar_position: 1
---

# API Reference

The DialAI API provides 11 functions for creating sessions, registering specialists, and managing the decision cycle. All functions are async and return Promises.

## Session Functions

- [`createSession`](./createSession.md) - Creates a new session instance
- [`getSession`](./getSession.md) - Retrieves a session by ID
- [`getSessions`](./getSessions.md) - Returns all stored sessions

## Specialist Functions

- [`registerProposer`](./registerProposer.md) - Registers a proposer specialist
- [`registerVoter`](./registerVoter.md) - Registers a voter specialist

## Proposal Functions

### `submitProposal(sessionId, specialistId, transitionName, toState, reasoning?): Promise<Proposal>`

Creates and stores a proposal with a generated UUID.

```typescript
import { submitProposal } from "dialai";

const proposal = await submitProposal(
  session.sessionId,
  "ai-proposer-1",
  "approve",
  "approved",
  "Document meets standards"
);
```

### `solicitProposal(sessionId, specialistId): Promise<Proposal>`

Calls the specialist's strategy function with the session's current state and transitions, then submits the resulting proposal.

```typescript
import { solicitProposal } from "dialai";

const proposal = await solicitProposal(session.sessionId, "ai-proposer-1");
```

## Vote Functions

### `submitVote(sessionId, specialistId, proposalIdA, proposalIdB, voteFor, reasoning?): Promise<Vote>`

Creates and stores a vote with a generated UUID.

```typescript
import { submitVote } from "dialai";

const vote = await submitVote(
  session.sessionId,
  "ai-voter-1",
  proposalA.proposalId,
  proposalB.proposalId,
  "A",
  "Proposal A is better aligned"
);
```

### `solicitVote(sessionId, specialistId, proposalIdA, proposalIdB): Promise<Vote>`

Calls the specialist's strategy function with the two proposals, then submits the resulting vote.

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

- [`evaluateConsensus`](./evaluateConsensus.md) - Evaluates consensus for proposals
- [`executeTransition`](./executeTransition.md) - Executes a state transition

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
