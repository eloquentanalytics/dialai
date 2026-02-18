---
sidebar_position: 6
---

# `registerProposer(opts): Promise<Proposer>`

Registers a proposer specialist for a machine. Proposers submit state transition proposals during the decision cycle.

## CLI Usage

Define proposers in your machine JSON file:

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
    { "role": "proposer", "specialistId": "ai-proposer-2", "strategyFnName": "random" }
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

Registered proposers:
  - ai-proposer-1 (strategyFnName: firstAvailable)
  - ai-proposer-2 (strategyFnName: random)

Round 1 from pending
  Proposer ai-proposer-1 proposed: approve → approved
  Proposer ai-proposer-2 proposed: reject → rejected
  ...
```

## What Happened

1. Two proposers were registered for the "document-review" machine
2. Each proposer uses a different built-in strategy
3. During the decision cycle, both proposers submitted proposals
4. The arbiter counted proposals per transition and found consensus

## Programmatic Usage

```typescript
import { registerProposer } from "dialai";

// Using a built-in strategy
const proposer1 = await registerProposer({
  specialistId: "ai-proposer-1",
  machineName: "document-review",
  strategyFnName: "firstAvailable",
});

// Using a custom strategy function
const proposer2 = await registerProposer({
  specialistId: "ai-proposer-2",
  machineName: "document-review",
  strategyFn: async (ctx) => ({
    transitionName: Object.keys(ctx.transitions)[0],
    toState: Object.values(ctx.transitions)[0],
    reasoning: `Choosing based on prompt: ${ctx.prompt}`,
  }),
});

// Using a webhook
const proposer3 = await registerProposer({
  specialistId: "external-proposer",
  machineName: "document-review",
  strategyWebhookUrl: "https://api.example.com/propose",
  webhookTokenName: "PROPOSAL_API_KEY",
});

// Using LLM with context function
const proposer4 = await registerProposer({
  specialistId: "llm-proposer",
  machineName: "document-review",
  modelId: "claude-3-opus",
  contextFn: async (ctx) => `
    Current state: ${ctx.currentState}
    Decision: ${ctx.prompt}
    Options: ${Object.keys(ctx.transitions).join(", ")}
  `,
});
```

## Parameters

See [RegisterProposerOptions](./types.md#registerproposeroptions) for the complete type definition.

**Required:**
- `specialistId`: Unique identifier for this proposer
- `machineName`: Which machine this proposer participates in

**Execution mode (exactly one required):**
- `strategyFn`: Local async function
- `strategyFnName`: Built-in strategy name
- `strategyWebhookUrl`: External webhook URL
- `contextFn` + `modelId`: LLM with local context
- `contextWebhookUrl` + `modelId`: LLM with webhook context

## Return Value

Returns a `Proposer` object. See [Proposer](./types.md#proposer) for the complete type definition.

## Error Cases

| Error | Cause |
|-------|-------|
| `Specialist already exists` | A proposer with this specialistId is already registered |
| `No execution mode specified` | Must provide one of the execution mode options |
| `Unknown strategy` | The `strategyFnName` is not a recognized built-in strategy |
