---
sidebar_position: 2
---

# Registering Specialists

This guide covers how to register specialists using the `dialai` library. For the conceptual foundation, see [Specialists](/docs/concepts/specialists).

Specialists are registered using one of three functions: `registerProposer`, `registerVoter`, or `registerArbiter`. Each function accepts configuration for how the specialist produces its output.

## Proposer Registration

A proposer analyzes the current state and suggests what transition should happen next.

```typescript
import { registerProposer } from "dialai";

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
```

## Voter Registration

A voter evaluates pairs of proposals and expresses a preference.

```typescript
import { registerVoter } from "dialai";

registerVoter({
  specialistId: "quality-voter",
  machineName: "my-task",
  strategyFn: async (ctx) => ({
    voteFor: "A",
    reasoning: "Proposal A is more aligned with the goal",
  }),
});
```

## Arbiter Registration

An arbiter evaluates consensus and determines winning proposals.

```typescript
import { registerArbiter } from "dialai";

registerArbiter({
  specialistId: "consensus-arbiter",
  machineName: "my-task",
  strategyFnName: "aheadByK",
  threshold: 2,
});
```

Arbiters support three execution modes: `strategyFn`, `strategyWebhookUrl`, and `strategyFnName`. They do not support LLM-based modes because arbitration must be deterministic.

See [Consensus Strategies](/docs/concepts/consensus-strategies) for details on the built-in arbiter strategies.

## Execution Modes

Proposers and voters support five execution modes. Arbiters support three (no LLM modes). They are mutually exclusive.

### 1. `strategyFn` -- Local Function

You provide an async function. The orchestrator calls it with the appropriate context and expects a complete proposal or vote back.

```typescript
registerProposer({
  specialistId: "my-proposer",
  machineName: "document-review",
  strategyFn: async (ctx) => ({
    transitionName: "approve",
    toState: "approved",
    reasoning: "Document meets all criteria",
  }),
});
```

What happens inside the function is entirely up to you. Call your own LLM, apply rules, run deterministic logic. The orchestrator only checks that the return value matches the expected shape.

**Required parameters:** `strategyFn`
**Forbidden parameters:** `contextFn`, `contextWebhookUrl`, `strategyWebhookUrl`, `modelId`, `webhookTokenName`

### 2. `strategyWebhookUrl` -- Remote Function

The orchestrator POSTs the full context to a URL and expects a proposal or vote response. Authentication is HTTP Basic Auth: the username is the `machineName`, the password is the value of the environment variable named by `webhookTokenName`.

```typescript
registerProposer({
  specialistId: "remote-proposer",
  machineName: "document-review",
  strategyWebhookUrl: "https://my-service.example.com/propose",
  webhookTokenName: "MY_SERVICE_TOKEN",
});
```

```
POST https://my-service.example.com/propose
Authorization: Basic base64("document-review:${MY_SERVICE_TOKEN}")
Content-Type: application/json

{ ...ProposerContext }
```

#### Response Handling: 55-Second Window

The orchestrator waits up to 55 seconds for the webhook to respond.

- **If the webhook responds** with a JSON body containing a valid proposal or vote, the orchestrator submits it on the specialist's behalf.

  Proposer response:
  ```json
  { "transitionName": "approve", "toState": "approved", "reasoning": "Meets criteria" }
  ```

  Voter response:
  ```json
  { "voteFor": "A", "reasoning": "Proposal A is more faithful to the prompt" }
  ```

- **If the webhook does not respond within 55 seconds**, or responds with `202 Accepted`, the orchestrator moves on. The webhook is then responsible for calling the DIAL API (`submitProposal` or `submitVote`) at its own leisure.

**Required parameters:** `strategyWebhookUrl`, `webhookTokenName`
**Forbidden parameters:** `strategyFn`, `contextFn`, `contextWebhookUrl`, `modelId`

### 3. `contextFn` + `modelId` -- Local Context, Orchestrator Calls LLM

You provide an async function that returns a context string. The orchestrator sends that string to the LLM specified by `modelId` along with the decision prompt and parses the response into a proposal or vote.

```typescript
registerProposer({
  specialistId: "context-proposer",
  machineName: "document-review",
  modelId: "openai/gpt-4o-mini",
  contextFn: async (ctx) => {
    const doc = await readFile(ctx.prompt);
    return `Document contents:\n${doc}\n\nReview criteria: completeness, accuracy`;
  },
});
```

Your function only provides the context string. The orchestrator handles prompt assembly, the API call, response parsing, and validation.

**Required parameters:** `contextFn`, `modelId`
**Forbidden parameters:** `strategyFn`, `strategyWebhookUrl`, `contextWebhookUrl`, `webhookTokenName`

### 4. `contextWebhookUrl` + `modelId` -- Remote Context, Orchestrator Calls LLM

The orchestrator POSTs the context request to a URL, then sends the returned context to the LLM.

```typescript
registerVoter({
  specialistId: "webhook-context-voter",
  machineName: "document-review",
  modelId: "openai/gpt-4o-mini",
  contextWebhookUrl: "https://my-service.example.com/context",
  webhookTokenName: "MY_SERVICE_TOKEN",
});
```

The webhook response should contain a `content` or `markdown` field with the context string:

```json
{ "content": "Document contents:\n..." }
```

The orchestrator waits up to 55 seconds for the response. If the webhook does not respond in time, the orchestrator calls the LLM with no additional context.

**Required parameters:** `contextWebhookUrl`, `webhookTokenName`, `modelId`
**Forbidden parameters:** `strategyFn`, `strategyWebhookUrl`, `contextFn`, `strategyFnName`

### 5. `strategyFnName` -- Built-in Named Strategy

Reference a built-in strategy by name. The orchestrator loads the strategy from its internal registry and invokes it with the appropriate context.

```typescript
registerArbiter({
  specialistId: "consensus-arbiter",
  machineName: "document-review",
  strategyFnName: "aheadByK",
  threshold: 2,
});
```

Built-in strategies are stored in `src/strategies/` and loaded by name at runtime. The `threshold` parameter is passed to the strategy and its meaning varies by strategy type.

See [Default Strategies](#default-strategies) below for the complete list and documentation.

**Required parameters:** `strategyFnName`
**Optional parameters:** `threshold`
**Forbidden parameters:** `strategyFn`, `strategyWebhookUrl`, `contextFn`, `contextWebhookUrl`, `modelId`

## Validation Rules

Valid parameter combinations:

| Mode | strategyFn | strategyFnName | strategyWebhookUrl | contextFn | contextWebhookUrl | modelId | webhookTokenName | threshold |
|------|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| 1. Local strategy | required | | | | | | | |
| 2. Webhook strategy | | | required | | | | required | |
| 3. Local context + LLM | | | | required | | required | | |
| 4. Webhook context + LLM | | | | | required | required | required | |
| 5. Built-in strategy | | required | | | | | | optional |

Invalid configurations are rejected at registration time with descriptive error messages:

- `strategyFn` + `modelId` -- *"modelId is only used with contextFn or contextWebhookUrl. A strategyFn returns proposals/votes directly and does not need a model."*
- `strategyFn` + `strategyFnName` -- *"Provide either strategyFn (custom function) or strategyFnName (built-in strategy), not both."*
- `strategyFnName` + `modelId` -- *"modelId is only used with contextFn or contextWebhookUrl. A strategyFnName references a built-in strategy and does not need a model."*
- `contextFn` without `modelId` -- *"contextFn provides context for an LLM to generate proposals/votes. You must also specify modelId."*
- `strategyFn` + `contextFn` -- *"Provide either strategyFn (you handle everything) or contextFn + modelId (orchestrator calls the LLM), not both."*
- `contextWebhookUrl` without `webhookTokenName` -- *"Webhook URLs require webhookTokenName for authentication."*
- Arbiter with `contextFn` or `contextWebhookUrl` -- *"Arbiters cannot use LLM-based modes. Arbitration must be deterministic."*
- No execution parameters at all -- *"Specialist must specify one of: strategyFn, strategyFnName, strategyWebhookUrl, contextFn + modelId, or contextWebhookUrl + modelId."*

## Context Shapes

### ProposerContext

```typescript
interface ProposerContext {
  sessionId: string;
  currentState: string;
  prompt: string;
  transitions: Record<string, string>;
  history: TransitionRecord[];
}
```

### VoterContext

```typescript
interface VoterContext {
  sessionId: string;
  currentState: string;
  prompt: string;
  proposalA: Proposal;
  proposalB: Proposal;
  history: TransitionRecord[];
}
```

## Specialist ID Conventions

Any naming scheme works, but including the purpose is helpful:

```
ai-proposer-1
ai-voter-gpt4
human-reviewer
human-approver-jane
```

To allow a specialist to force arbitration decisions, set `isHuman: true` when registering:

```typescript
// This allows forcing arbitration:
registerVoter({
  specialistId: "reviewer-jane",
  machineName: "document-review",
  isHuman: true,
  strategyFn: async (ctx) => ({ ... }),
});
```

## Human Specialists

Human specialists are registered with `isHuman: true`. Their votes count like any other vote during consensus evaluation. The key difference is that only human specialists can *force* a transition when consensus isn't reached.

Human specialists can have strategy functions that encode human preferences, or proposals/votes can be submitted directly:

```typescript
// Register a human specialist with a strategy
registerVoter({
  specialistId: "reviewer-jane",
  machineName: "document-review",
  isHuman: true,
  strategyFn: async (ctx) => ({
    voteFor: "B",
    reasoning: "Prefer the more conservative approach",
  }),
});

// Or submit votes directly by providing all parameters
import { submitVote } from "dialai";

await submitVote(
  session.sessionId,
  "reviewer-jane",  // must be registered with isHuman: true
  session.currentRoundId,
  proposalA.proposalId,
  proposalB.proposalId,
  "B",  // Providing voteFor bypasses strategy invocation
  "I prefer the more conservative approach",
  { reviewedBy: "jane@example.com" }  // optional metadata
);
```

Humans can also bypass the entire decision cycle using `submitArbitration` with an explicit transition:

```typescript
import { submitArbitration } from "dialai";

// Human override - directly execute a transition
await submitArbitration(
  session.sessionId,
  session.currentRoundId,
  "human-reviewer",           // must be registered with isHuman: true
  "approve",
  "Reviewed and approved by manager",
  { approvedBy: "manager@example.com" }
);
```

## Registration Options Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `specialistId` | `string` | Yes | -- | Unique identifier for the specialist |
| `machineName` | `string` | Yes | -- | Which machine this specialist participates in |
| `isHuman` | `boolean` | No | `false` | Set to `true` to allow forcing arbitration decisions (proposers/voters only) |
| `strategyFn` | `async (context) => result` | Mode 1 | -- | Local function that returns a proposal, vote, or consensus result |
| `strategyFnName` | `string` | Mode 5 | -- | Built-in strategy name (see [Default Strategies](#default-strategies)) |
| `strategyWebhookUrl` | `string` | Mode 2 | -- | URL to POST context to; expects proposal/vote/consensus response |
| `contextFn` | `async (context) => string` | Mode 3 | -- | Local function that returns context for the LLM (proposers/voters only) |
| `contextWebhookUrl` | `string` | Mode 4 | -- | URL to POST context request to; expects context response (proposers/voters only) |
| `modelId` | `string` | Modes 3, 4 | -- | LLM model identifier (e.g., `"openai/gpt-4o-mini"`) |
| `webhookTokenName` | `string` | Modes 2, 4 | -- | Env var name holding the webhook auth token |
| `threshold` | `number` | No | varies | Strategy-specific threshold (see [Consensus Strategies](/docs/concepts/consensus-strategies)) |

## Default Strategies

DIAL provides built-in strategies for all specialist roles. These are referenced by name via `strategyFnName` and stored in `src/strategies/`.

### Proposer Strategies

| Strategy | Description | Threshold |
|----------|-------------|-----------|
| `firstAvailable` | Proposes the first available transition (by insertion order) | -- |
| `lastAvailable` | Proposes the last available transition (by insertion order) | -- |
| `random` | Proposes a random available transition | -- |
| `weightedRandom` | Proposes randomly, weighted by specialist alignment scores | -- |

#### `firstAvailable`

```
function firstAvailable(ctx: ProposerContext) -> Proposal:
    transitions = list(ctx.transitions.keys())  // insertion order
    name = transitions[0]
    return {
        transitionName: name,
        toState: ctx.transitions[name],
        reasoning: "First available transition"
    }
```

#### `lastAvailable`

```
function lastAvailable(ctx: ProposerContext) -> Proposal:
    transitions = list(ctx.transitions.keys())  // insertion order
    name = transitions[len(transitions) - 1]
    return {
        transitionName: name,
        toState: ctx.transitions[name],
        reasoning: "Last available transition"
    }
```

#### `random`

```
function random(ctx: ProposerContext) -> Proposal:
    transitions = list(ctx.transitions.keys())
    name = random_choice(transitions)
    return {
        transitionName: name,
        toState: ctx.transitions[name],
        reasoning: "Randomly selected transition"
    }
```

#### `weightedRandom`

```
function weightedRandom(ctx: ProposerContext) -> Proposal:
    transitions = list(ctx.transitions.keys())

    # Weights are derived from specialist alignment scores,
    # calculated as needed by the orchestrator. Currently
    # falls back to uniform random selection.
    name = random_choice(transitions)

    return {
        transitionName: name,
        toState: ctx.transitions[name],
        reasoning: "Weighted random selection"
    }
```

### Voter Strategies

| Strategy | Description | Threshold |
|----------|-------------|-----------|
| `preferA` | Always votes for proposal A | -- |
| `preferB` | Always votes for proposal B | -- |
| `both` | Always votes BOTH (both acceptable) | -- |
| `neither` | Always votes NEITHER (neither acceptable) | -- |
| `random` | Votes randomly between A and B | -- |
| `randomAll` | Votes randomly between A, B, BOTH, NEITHER | -- |
| `preferGoal` | Prefers whichever proposal leads closer to goalState | -- |
| `preferShorterPath` | Prefers the proposal with fewer hops to goalState | -- |

#### `preferA`

```
function preferA(ctx: VoterContext) -> Vote:
    return {
        voteFor: "A",
        reasoning: "Default preference for proposal A"
    }
```

#### `preferB`

```
function preferB(ctx: VoterContext) -> Vote:
    return {
        voteFor: "B",
        reasoning: "Default preference for proposal B"
    }
```

#### `both`

```
function both(ctx: VoterContext) -> Vote:
    return {
        voteFor: "BOTH",
        reasoning: "Both proposals are acceptable"
    }
```

#### `neither`

```
function neither(ctx: VoterContext) -> Vote:
    return {
        voteFor: "NEITHER",
        reasoning: "Neither proposal is acceptable"
    }
```

#### `random`

```
function random(ctx: VoterContext) -> Vote:
    choice = random_choice(["A", "B"])
    return {
        voteFor: choice,
        reasoning: f"Random selection: {choice}"
    }
```

#### `randomAll`

```
function randomAll(ctx: VoterContext) -> Vote:
    choice = random_choice(["A", "B", "BOTH", "NEITHER"])
    return {
        voteFor: choice,
        reasoning: f"Random selection from all options: {choice}"
    }
```

#### `preferGoal`

```
function preferGoal(ctx: VoterContext) -> Vote:
    # Prefer whichever proposal's toState matches the machine's goalState
    goalState = ctx.machine.goalState

    if ctx.proposalA.toState == goalState and ctx.proposalB.toState != goalState:
        return { voteFor: "A", reasoning: "Proposal A reaches goal state" }

    if ctx.proposalB.toState == goalState and ctx.proposalA.toState != goalState:
        return { voteFor: "B", reasoning: "Proposal B reaches goal state" }

    if ctx.proposalA.toState == goalState and ctx.proposalB.toState == goalState:
        return { voteFor: "BOTH", reasoning: "Both proposals reach goal state" }

    return { voteFor: "NEITHER", reasoning: "Neither proposal reaches goal state" }
```

#### `preferShorterPath`

```
function preferShorterPath(ctx: VoterContext) -> Vote:
    # Calculate minimum hops to goalState from each proposal's toState
    hopsA = calculate_min_hops(ctx.machine, ctx.proposalA.toState, ctx.machine.goalState)
    hopsB = calculate_min_hops(ctx.machine, ctx.proposalB.toState, ctx.machine.goalState)

    if hopsA < hopsB:
        return { voteFor: "A", reasoning: f"Proposal A is {hopsB - hopsA} hops closer to goal" }

    if hopsB < hopsA:
        return { voteFor: "B", reasoning: f"Proposal B is {hopsA - hopsB} hops closer to goal" }

    return { voteFor: "BOTH", reasoning: "Both proposals are equidistant from goal" }
```

### Arbiter Strategies

| Strategy | Description | Key Parameter |
|----------|-------------|---------------|
| `alignmentWeightedMargin` | **Default.** Unified consensus score from all contributions | `consensus_threshold` (0.0–1.0) |
| `firstProposal` | Immediately selects the first proposal received | — |
| `mostSimilar` | Compares proposals to human exemplars via semantic similarity | Min similarity (0.0–1.0) |

#### `alignmentWeightedMargin` *(Default)*

The default strategy. Every specialist contribution (proposal, selection vote, pairwise vote) adds the specialist's alignment score to the transition it supports. Consensus is reached when one transition's margin of superiority crosses the threshold.

See [Consensus Strategies](/docs/concepts/consensus-strategies#alignmentweightedmargin-default) for full documentation.

#### `firstProposal`

The simplest arbiter: immediately declares consensus on the first proposal received, with no voting required.

See [Consensus Strategies](/docs/concepts/consensus-strategies#firstproposal) for full documentation.

#### `mostSimilar`

Compares proposals to human exemplars using semantic similarity. No voting required.

See [Consensus Strategies](/docs/concepts/consensus-strategies#mostsimilar) for full documentation.

### Strategy Combinations

Common combinations of proposer, voter, and arbiter strategies:

| Use Case | Proposer | Voter | Arbiter |
|----------|----------|-------|---------|
| **Testing/Dev** | `firstAvailable` | `preferA` | `firstProposal` |
| **Production** | (LLM) | (LLM) | `alignmentWeightedMargin` |
| **Model selection** | (LLM) | — | `mostSimilar` |
| **High-stakes** | (LLM) | (LLM) | `alignmentWeightedMargin` (threshold=0.8+) |

### Implementing Custom Strategies

You can implement custom strategies using `strategyFn`:

```typescript
registerProposer({
  specialistId: "custom-proposer",
  machineName: "my-task",
  strategyFn: async (ctx) => {
    // Your custom logic
    const best = analyzeTransitions(ctx.transitions, ctx.history);
    return {
      transitionName: best.name,
      toState: best.target,
      reasoning: best.explanation,
    };
  },
});
```

Custom strategies can call external services, use ML models (for proposers/voters), or implement any deterministic logic (for arbiters).
