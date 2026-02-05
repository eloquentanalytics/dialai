---
sidebar_position: 3
---

# Specialists

Specialists are the "pluggable" actors that participate in sessions. They can be AI models or humans.

## Roles

### Proposers

Proposers analyze the current state and suggest what transition should happen next. Any number of proposers can participate. A proposer's `strategyFn` receives a `ProposerContext` and returns a proposed transition.

### Voters

Voters evaluate proposals and express preferences between them. They compare pairs of proposals and vote for A, B, BOTH, or NEITHER. A voter's `strategyFn` receives a `VoterContext` and returns a vote choice.

### Arbiters

Arbitration is built into the framework via the `evaluateConsensus` function. For custom consensus logic, register an arbiter with `registerArbiter` and a `strategyFn` that receives an `ArbiterContext` and returns a `ConsensusResult`.

## Human vs AI Specialists

**Human specialists** are identified by including "human" (case-insensitive) anywhere in their `specialistId` (e.g., `human-reviewer`, `specialist.human.jane`). When a human specialist votes, their choice wins immediately; no further vote tallying is needed.

**AI specialists** participate through voting. Each vote counts equally.

## Registering Specialists

```typescript
import { registerProposer, registerVoter } from "dialai";

// Register a proposer with an inline strategy
registerProposer({
  specialistId: "ai-proposer-1",
  machineName: "my-task",
  strategyFn: async (ctx) => {
    const name = Object.keys(ctx.transitions)[0];
    return {
      transitionName: name,
      toState: ctx.transitions[name],
      reasoning: "First available transition",
    };
  },
});

// Register a voter
registerVoter({
  specialistId: "ai-voter-1",
  machineName: "my-task",
  strategyFn: async (ctx) => ({
    voteFor: "A",
    reasoning: "Proposal A moves closer to the goal",
  }),
});
```

### Registration Options

Each registration function (`registerProposer`, `registerVoter`, `registerArbiter`) accepts:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `specialistId` | `string` | Yes | Unique identifier. Include "human" for human specialists. |
| `machineName` | `string` | Yes | Which session type this specialist participates in |
| `strategyFn` | `async (context) => result` | Mode 1 | Local function that returns a proposal, vote, or ConsensusResult |
| `strategyWebhookUrl` | `string` | Mode 2 | URL to POST context to; expects result response |
| `contextFn` | `async (context) => string` | Mode 3 | Local function returning context for the LLM |
| `contextWebhookUrl` | `string` | Mode 4 | URL to POST context request to; expects context response |
| `modelId` | `string` | Modes 3, 4 | LLM model identifier |
| `webhookTokenName` | `string` | Modes 2, 4 | Env var name holding the webhook auth token |

All three registration functions support the same four execution modes. See the [registering specialists guide](../guides/registering-specialists.md) for full details.
