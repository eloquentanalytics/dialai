---
sidebar_position: 7
---

# `registerVoter(opts): Promise<Voter>`

Registers a voter specialist for a machine. Voters compare proposals pairwise and vote for their preferred option.

## CLI Usage

Define voters in your machine JSON file:

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
    { "role": "proposer", "specialistId": "ai-proposer-1", "strategyFnName": "firstAvailable" },
    { "role": "proposer", "specialistId": "ai-proposer-2", "strategyFnName": "random" },
    { "role": "voter", "specialistId": "ai-voter-1", "strategyFnName": "preferA" },
    { "role": "voter", "specialistId": "ai-voter-2", "strategyFnName": "random" }
  ]
}
```

Run with:

```bash
npx dialai machine.json
```

## Expected Output

```
Machine:       document-review
Initial state: pending
Goal state:    approved
Session ID:    a1b2c3d4-5678-90ab-cdef-1234567890ab

Registered voters:
  - ai-voter-1 (strategyFnName: preferA)
  - ai-voter-2 (strategyFnName: random)

Round 1 from pending
  Proposer ai-proposer-1 proposed: approve → approved
  Proposer ai-proposer-2 proposed: reject → rejected
  Voter ai-voter-1 voted: A (approve)
  Voter ai-voter-2 voted: B (reject)
  ...
```

## What Happened

1. Two voters were registered for the "document-review" machine
2. When multiple proposals existed, voters were asked to compare them pairwise
3. Each voter submitted their preference (A, B, BOTH, or NEITHER)
4. Votes were tallied to determine consensus

## Programmatic Usage

```typescript
import { registerVoter } from "dialai";

// Using a built-in strategy
const voter1 = await registerVoter({
  specialistId: "ai-voter-1",
  machineName: "document-review",
  strategyFnName: "preferA",
});

// Using a custom strategy function
const voter2 = await registerVoter({
  specialistId: "ai-voter-2",
  machineName: "document-review",
  strategyFn: async (ctx) => {
    // Prefer proposals that lead to approval
    if (ctx.proposalA.toState === "approved") {
      return { voteFor: "A", reasoning: "Proposal A leads to approval" };
    }
    if (ctx.proposalB.toState === "approved") {
      return { voteFor: "B", reasoning: "Proposal B leads to approval" };
    }
    return { voteFor: "NEITHER", reasoning: "Neither leads to approval" };
  },
});

// Using a webhook
const voter3 = await registerVoter({
  specialistId: "external-voter",
  machineName: "document-review",
  strategyWebhookUrl: "https://api.example.com/vote",
  webhookTokenName: "VOTE_API_KEY",
});

// Using LLM with context function
const voter4 = await registerVoter({
  specialistId: "llm-voter",
  machineName: "document-review",
  modelId: "claude-3-opus",
  contextFn: async (ctx) => `
    Compare these proposals:
    A: ${ctx.proposalA.transitionName} - ${ctx.proposalA.reasoning}
    B: ${ctx.proposalB.transitionName} - ${ctx.proposalB.reasoning}

    Which is better for: ${ctx.prompt}
  `,
});
```

## Parameters

See [RegisterVoterOptions](./types.md#registervoteroptions) for the complete type definition.

**Required:**
- `specialistId`: Unique identifier for this voter
- `machineName`: Which machine this voter participates in

**Execution mode (exactly one required):**
- `strategyFn`: Local async function
- `strategyFnName`: Built-in strategy name
- `strategyWebhookUrl`: External webhook URL
- `contextFn` + `modelId`: LLM with local context
- `contextWebhookUrl` + `modelId`: LLM with webhook context

## Return Value

Returns a `Voter` object. See [Voter](./types.md#voter) for the complete type definition.

## Vote Choices

Voters return one of four choices:

| Choice | Meaning |
|--------|---------|
| `"A"` | Prefer proposal A (+1 to A's tally) |
| `"B"` | Prefer proposal B (+1 to B's tally) |
| `"BOTH"` | Both acceptable (+1 to both tallies) |
| `"NEITHER"` | Neither acceptable (+0 to both) |

## Error Cases

| Error | Cause |
|-------|-------|
| `Specialist already exists` | A voter with this specialistId is already registered |
| `No execution mode specified` | Must provide one of the execution mode options |
| `Unknown strategy` | The `strategyFnName` is not a recognized built-in strategy |
