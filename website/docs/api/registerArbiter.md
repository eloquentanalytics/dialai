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
  threshold: 2,  // Require 2-proposal lead for consensus
});

// Using a custom strategy function
const customArbiter = await registerArbiter({
  specialistId: "custom-arbiter",
  machineName: "document-review",
  strategyFn: async (ctx) => {
    // Count endorsements per transition and require the leader to be ahead by k
    const counts: Record<string, number> = {};
    for (const p of ctx.proposals) {
      counts[p.transitionName] = (counts[p.transitionName] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const k = 2;
    if (sorted.length >= 1 && (sorted.length === 1 || sorted[0][1] - sorted[1][1] >= k)) {
      return {
        consensusReached: true,
        winningProposalId: ctx.proposals.find(p => p.transitionName === sorted[0][0])!.proposalId,
        reasoning: `Transition "${sorted[0][0]}" ahead by ${sorted.length === 1 ? sorted[0][1] : sorted[0][1] - sorted[1][1]} proposals`,
      };
    }
    return { consensusReached: false, reasoning: "No transition ahead by k proposals yet" };
  },
});
```

## Parameters

See [RegisterArbiterOptions](./types.md#registerarbiteroptions) for the complete type definition.

## Built-in Strategies

Arbiters support two built-in consensus strategies via `strategyFnName`:

| Strategy | Description | Threshold Usage |
|----------|-------------|-----------------|
| `aheadByK` | Consensus when leading transition is ahead by K proposals | `threshold` = minimum proposal lead required |
| `firstProposal` | Accepts the first valid proposal immediately | Not used |

Each proposal counts as one endorsement of a transition. Human proposals always win consensus immediately, regardless of strategy.

### aheadByK

The default strategy. Counts proposals per transition and declares consensus when one transition is ahead by at least `threshold` proposals. Human proposals always win consensus immediately.

```typescript
await registerArbiter({
  specialistId: "proposal-arbiter",
  machineName: "my-task",
  strategyFnName: "aheadByK",
  threshold: 2,  // Need 2-proposal lead
});
```

### firstProposal

The simplest strategy. Accepts the first valid proposal immediately. Useful as a default or when only one proposer is registered.

```typescript
await registerArbiter({
  specialistId: "simple-arbiter",
  machineName: "my-task",
  strategyFnName: "firstProposal",
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
