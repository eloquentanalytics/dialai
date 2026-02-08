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

Arbitration is built into the framework via the `submitArbitration` function, which evaluates guards, tallies votes, applies human primacy rules, and executes the winning transition automatically. The arbiter can be configured at the machine level with `aheadByK` thresholds and optional LLM-based reasoning synthesis.

## Human vs AI Specialists

**Human specialists** are registered with `isHuman: true`. They can provide explicit values to submit functions:
- `submitProposal` with explicit `transitionName`
- `submitVote` with explicit `voteFor`
- `submitArbitration` with explicit `transitionName` (to force a decision)

Human specialists are registered separately from the machine definition—the machine JSON only defines AI specialists.

**AI specialists** are registered in the machine definition with strategies (LLMs, tools, deterministic logic). They must use strategy invocation:
- `submitProposal` must omit `transitionName` (strategy provides it)
- `submitVote` must omit `voteFor` (strategy provides it)
- `submitArbitration` must omit `transitionName` (can only check consensus)

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

Each registration function (`registerProposer`, `registerVoter`) accepts:

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `specialistId` | `string` | Yes | Unique identifier for the specialist |
| `machineName` | `string` | Yes | Which machine this specialist participates in |
| `isHuman` | `boolean` | No | Set to `true` to allow forcing arbitration decisions |
| `strategyFn` | `async (context) => result` | Mode 1 | Local function that returns a proposal or vote |
| `strategyWebhookUrl` | `string` | Mode 2 | URL to POST context to; expects result response |
| `contextFn` | `async (context) => string` | Mode 3 | Local function returning context for the LLM |
| `contextWebhookUrl` | `string` | Mode 4 | URL to POST context request to; expects context response |
| `modelId` | `string` | Modes 3, 4 | LLM model identifier |
| `webhookTokenName` | `string` | Modes 2, 4 | Env var name holding the webhook auth token |

Both registration functions support the same four execution modes. See the [registering specialists guide](../guides/registering-specialists.md) for full details.
