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
    { "role": "arbiter", "specialistId": "consensus-arbiter", "strategyFnName": "alignmentMargin", "threshold": 0.5 }
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
  Arbiter consensus-arbiter: consensus reached (single proposal, no competing proposals)
  Executed: approve → approved

Session complete: approved
```

## What Happened

1. The session started in the `pending` state
2. The proposer submitted a proposal to transition via `approve`
3. The arbiter evaluated consensus using the `alignmentMargin` strategy
4. With only a single proposal and no competing proposals, `alignmentMargin` auto-approves (threshold ≤ 1.0)
5. The transition executed, moving to `approved`

## Programmatic Usage

```typescript
import { registerArbiter } from "dialai";

// Using a built-in strategy
const arbiter = await registerArbiter({
  specialistId: "consensus-arbiter",
  machineName: "document-review",
  strategyFnName: "alignmentMargin",
  threshold: 0.5,  // Require 0.5 alignment-weighted margin for consensus
});

// Using a custom strategy function (count-based, distinct from the built-in alignmentMargin)
const customArbiter = await registerArbiter({
  specialistId: "custom-arbiter",
  machineName: "document-review",
  strategyFn: async (ctx) => {
    // Custom count-based strategy: counts raw proposals per transition
    // (ignores alignment scores, unlike the built-in alignmentMargin which uses alignment-weighted margin)
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
    return { consensusReached: false, reasoning: "No transition alignment margin proposals yet" };
  },
});
```

## Parameters

See [RegisterArbiterOptions](./types.md#registerarbiteroptions) for the complete type definition.

## Built-in Strategies

Arbiters support two built-in consensus strategies via `strategyFnName`:

| Strategy | Description | Threshold Usage |
|----------|-------------|-----------------|
| `alignmentMargin` | Consensus when alignment-weighted margin exceeds threshold | `threshold` = minimum margin required (float 0-1) |
| `firstProposal` | Accepts the first valid proposal immediately | Not used |

Each proposal is weighted by the proposer's alignment score. Human proposals carry alignment = 1.0 (the highest weight) but still go through the normal consensus algorithm. To override consensus entirely, use `submitArbitration` with an explicit `transitionName`.

### alignmentMargin

The default strategy. Groups proposals by transition and scores each group by sum of proposer alignment scores. Computes an alignment-weighted margin between the leader and runner-up. Declares consensus when the margin exceeds the threshold. A single proposal with no competing proposals is auto-approved when threshold ≤ 1.0. If all alignment scores are 0 (cold start), no consensus is reached and human input is required.

```typescript
await registerArbiter({
  specialistId: "proposal-arbiter",
  machineName: "my-task",
  strategyFnName: "alignmentMargin",
  threshold: 0.5,  // Need 0.5 alignment-weighted margin
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
