---
name: dial-add-specialists
description: Add AI or human specialists to a DIAL machine. Use when configuring proposers.
---

# Add Specialists

Configure AI and human participants in a decision process.

## Built-in Proposer Strategies

| Strategy Name | Description |
|---------------|-------------|
| `firstAvailable` | Always picks the first available transition |
| `lastAvailable` | Always picks the last available transition |
| `random` | Randomly selects a transition |

## Built-in Arbiter Strategies

| Strategy Name | Description |
|---------------|-------------|
| `alignmentMargin` | Alignment-weighted margin consensus (default threshold: 1) |
| `firstProposal` | Accepts the first proposal submitted |

## Machine-Level Specialists (JSON)

```json
{
  "machineName": "code-review",
  "initialState": "pending",
  "goalState": "approved",
  "specialists": [
    {
      "specialistId": "ai-proposer",
      "role": "proposer",
      "strategyFnName": "firstAvailable"
    },
    {
      "specialistId": "review-arbiter",
      "role": "arbiter",
      "strategyFnName": "alignmentMargin",
      "threshold": 0.5
    }
  ],
  "states": { ... }
}
```

## Programmatic Registration

```typescript
import { registerProposer, registerArbiter } from "dialai";

// AI proposer with built-in strategy
await registerProposer({
  specialistId: "ai-proposer",
  machineName: "code-review",
  strategyFnName: "firstAvailable",
});

// Human specialist (can force arbitration)
await registerProposer({
  specialistId: "human-reviewer",
  machineName: "code-review",
  isHuman: true,
  strategyFnName: "firstAvailable",
});

// LLM-based proposer with context function
await registerProposer({
  specialistId: "llm-proposer",
  machineName: "code-review",
  modelId: "openai/gpt-4o-mini",
  contextFn: async (ctx) => `Review this: state=${ctx.currentState}`,
});

// Arbiter with alignment margin
await registerArbiter({
  specialistId: "consensus-arbiter",
  machineName: "code-review",
  strategyFnName: "alignmentMargin",
  threshold: 0.5,
});
```

## Patterns

### Human Override

AI proposes, human has final say:

```typescript
await registerProposer({
  specialistId: "ai",
  machineName: "review",
  strategyFnName: "firstAvailable",
});

await registerProposer({
  specialistId: "human",
  machineName: "review",
  isHuman: true,
  strategyFnName: "firstAvailable",
});
```

Human proposals always win via `submitArbitration` with an explicit `transitionName`.

### AI Consensus

Multiple AI proposers with alignment margin:

```typescript
await registerProposer({ specialistId: "ai-1", machineName: "review", strategyFnName: "firstAvailable" });
await registerProposer({ specialistId: "ai-2", machineName: "review", strategyFnName: "random" });
await registerProposer({ specialistId: "ai-3", machineName: "review", strategyFnName: "lastAvailable" });

await registerArbiter({
  specialistId: "arbiter",
  machineName: "review",
  strategyFnName: "alignmentMargin",
  threshold: 0.5,
});
```
