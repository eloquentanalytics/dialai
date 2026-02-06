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

### `submitProposal(sessionId, specialistId, transitionName?, toState?, reasoning?): Promise<Proposal>`

Creates and stores a proposal with a generated UUID. If `transitionName` and `toState` are omitted, invokes the specialist's registered strategy to generate the proposal.

**Direct Submission** (provide proposal data):

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

**Strategy Invocation** (omit proposal data):

```typescript
import { submitProposal } from "dialai";

// Calls specialist's registered strategy, then submits result
const proposal = await submitProposal(session.sessionId, "ai-proposer-1");
```

## Vote Functions

### `submitVote(sessionId, specialistId, proposalIdA, proposalIdB, voteFor?, reasoning?): Promise<Vote>`

Creates and stores a vote with a generated UUID. If `voteFor` is omitted, invokes the specialist's registered strategy to determine the vote.

**Direct Submission** (provide vote choice):

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

**Strategy Invocation** (omit vote choice):

```typescript
import { submitVote } from "dialai";

// Calls specialist's registered strategy, then submits result
const vote = await submitVote(
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
