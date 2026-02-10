---
sidebar_position: 8
---

# `registerArbiter(opts): Promise<Arbiter>`

Registers an arbiter specialist for a machine. Arbiters evaluate consensus among proposals and determine winning transitions.

## CLI Usage

Define an arbiter in your machine JSON file:

```json
{
  "machineName": "document-review",
  "initialState": "pending",
  "goalState": "approved",
  "states": {
    "pending": {
      "prompt": "Review the document. Approve or request changes?",
      "transitions": { "approve": "approved", "reject": "rejected" }
    },
    "approved": {},
    "rejected": {}
  },
  "specialists": [
    { "role": "proposer", "specialistId": "ai-proposer", "strategyFnName": "firstAvailable" },
    { "role": "voter", "specialistId": "ai-voter", "strategyFnName": "preferA" },
    { "role": "arbiter", "specialistId": "consensus-arbiter", "strategyFnName": "aheadByK", "threshold": 1 }
  ]
}
```

Run the machine:

```bash
npx dialai machine.json
```

## Expected Output

```
Machine:       document-review
Initial state: pending
Goal state:    approved
Session ID:    a1b2c3d4-5678-90ab-cdef-1234567890ab

Round 1 from pending
  Proposer ai-proposer proposed: approve → approved
  Arbiter consensus-arbiter: consensus reached (1 proposal, threshold met)
  Executed: approve → approved

Session complete: approved
```

## What Happened

1. The session started in the `pending` state
2. The proposer submitted a proposal to transition via `approve`
3. The arbiter evaluated consensus using the `aheadByK` strategy
4. With only one proposal and threshold of 1, consensus was reached
5. The transition executed, moving to `approved`

## Programmatic Usage

```typescript
import { registerArbiter } from "dialai";

// Using a built-in strategy
const arbiter = await registerArbiter({
  specialistId: "consensus-arbiter",
  machineName: "document-review",
  strategyFnName: "aheadByK",
  threshold: 2,  // Require 2-vote lead for consensus
});

// Using a custom strategy function
const customArbiter = await registerArbiter({
  specialistId: "custom-arbiter",
  machineName: "document-review",
  strategyFn: async (ctx) => {
    // Require unanimous votes for consensus
    const allVotesSame = ctx.votes.every(v => v.voteFor === ctx.votes[0]?.voteFor);
    if (allVotesSame && ctx.votes.length > 0) {
      return {
        consensusReached: true,
        winningProposalId: ctx.proposals[0].proposalId,
        reasoning: "Unanimous agreement",
      };
    }
    return { consensusReached: false, reasoning: "No unanimous agreement" };
  },
});
```

## Parameters

See [RegisterArbiterOptions](./types.md#registerarbiteroptions) for the complete type definition.

## Built-in Strategies

Arbiters support three built-in consensus strategies via `strategyFnName`:

| Strategy | Description | Threshold Usage |
|----------|-------------|-----------------|
| `aheadByK` | Consensus when leading proposal is ahead by K votes | `threshold` = minimum vote lead required |
| `mostSimilar` | Consensus based on similarity to human gold examples | `threshold` = minimum similarity score (0-1) |
| `pairwiseConsensus` | Bradley-Terry model ranking from pairwise votes | `threshold` = minimum win probability |

### aheadByK

The simplest strategy. Counts votes and declares consensus when one proposal leads by at least `threshold` votes.

```typescript
await registerArbiter({
  specialistId: "simple-arbiter",
  machineName: "my-task",
  strategyFnName: "aheadByK",
  threshold: 2,  // Need 2-vote lead
});
```

### mostSimilar

Compares proposals to human gold examples and selects the most similar. Useful for tasks with known-good reference outputs.

```typescript
await registerArbiter({
  specialistId: "similarity-arbiter",
  machineName: "my-task",
  strategyFnName: "mostSimilar",
  threshold: 0.8,  // Require 80% similarity
});
```

### pairwiseConsensus

Uses the Bradley-Terry model to compute rankings from pairwise vote comparisons. More sophisticated than simple vote counting.

```typescript
await registerArbiter({
  specialistId: "bt-arbiter",
  machineName: "my-task",
  strategyFnName: "pairwiseConsensus",
  threshold: 0.7,  // Require 70% win probability
});
```

## Return Value

Returns an `Arbiter` object. See [Arbiter](./types.md#arbiter) for the type definition.

## Error Cases

| Error | Cause |
|-------|-------|
| `Specialist already exists` | An arbiter with this specialistId is already registered |
| `No execution mode specified` | Must provide `strategyFn`, `strategyFnName`, or `strategyWebhookUrl` |
| `Unknown strategy` | The `strategyFnName` is not a recognized built-in strategy |
