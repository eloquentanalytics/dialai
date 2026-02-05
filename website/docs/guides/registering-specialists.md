---
sidebar_position: 2
---

# Registering Specialists

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

An arbiter defines custom consensus logic. It receives all proposals and votes and returns a `ConsensusResult`. Arbiters support the same four execution modes as proposers and voters.

```typescript
import { registerArbiter } from "dialai";

registerArbiter({
  specialistId: "custom-arbiter",
  machineName: "my-task",
  strategyFn: async (ctx) => {
    // ctx contains proposals, votes, history
    const topProposal = ctx.proposals[0];
    return {
      consensusReached: true,
      winningProposalId: topProposal?.proposalId,
      reasoning: "Custom logic selected the first proposal",
    };
  },
});
```

## Execution Modes

All three registration functions support four execution modes. They are mutually exclusive.

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
**Forbidden parameters:** `strategyFn`, `strategyWebhookUrl`, `contextFn`

## Validation Rules

Valid parameter combinations:

| Mode | strategyFn | strategyWebhookUrl | contextFn | contextWebhookUrl | modelId | webhookTokenName |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| 1. Local strategy | required | | | | | |
| 2. Webhook strategy | | required | | | | required |
| 3. Local context + LLM | | | required | | required | |
| 4. Webhook context + LLM | | | | required | required | required |

Invalid configurations are rejected at registration time with descriptive error messages:

- `strategyFn` + `modelId` -- *"modelId is only used with contextFn or contextWebhookUrl. A strategyFn returns proposals/votes directly and does not need a model."*
- `contextFn` without `modelId` -- *"contextFn provides context for an LLM to generate proposals/votes. You must also specify modelId."*
- `strategyFn` + `contextFn` -- *"Provide either strategyFn (you handle everything) or contextFn + modelId (orchestrator calls the LLM), not both."*
- `contextWebhookUrl` without `webhookTokenName` -- *"Webhook URLs require webhookTokenName for authentication."*
- No execution parameters at all -- *"Specialist must specify one of: strategyFn, strategyWebhookUrl, contextFn + modelId, or contextWebhookUrl + modelId."*

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

### ArbiterContext

```typescript
interface ArbiterContext {
  sessionId: string;
  currentState: string;
  proposals: Proposal[];
  votes: Vote[];
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

To enable the human override in `evaluateConsensus`, include "human" (case-insensitive) anywhere in the `specialistId`:

```typescript
// These all trigger human primacy:
registerVoter({ specialistId: "human-reviewer", ... });
registerVoter({ specialistId: "specialist.human.jane", ... });
registerVoter({ specialistId: "HUMAN_APPROVER", ... });
```

## Human Specialists

Human specialists can be registered with strategy functions that encode human preferences, or proposals/votes can be submitted directly via `submitProposal` and `submitVote`:

```typescript
// Register a human specialist with a strategy
registerVoter({
  specialistId: "human-reviewer",
  machineName: "document-review",
  strategyFn: async (ctx) => ({
    voteFor: "B",
    reasoning: "Prefer the more conservative approach",
  }),
});

// Or submit votes directly without a strategy
import { submitVote } from "dialai";

submitVote(
  session.sessionId,
  "human-reviewer",
  proposalA.proposalId,
  proposalB.proposalId,
  "B",
  "I prefer the more conservative approach"
);
```

## Registration Options Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `specialistId` | `string` | Yes | -- | Unique identifier. Include "human" for human specialists. |
| `machineName` | `string` | Yes | -- | Which session type this specialist participates in |
| `strategyFn` | `async (context) => result` | Mode 1 | -- | Local function that returns a proposal, vote, or ConsensusResult |
| `strategyWebhookUrl` | `string` | Mode 2 | -- | URL to POST context to; expects proposal/vote response |
| `contextFn` | `async (context) => string` | Mode 3 | -- | Local function that returns context for the LLM |
| `contextWebhookUrl` | `string` | Mode 4 | -- | URL to POST context request to; expects context response |
| `modelId` | `string` | Modes 3, 4 | -- | LLM model identifier (e.g., `"openai/gpt-4o-mini"`) |
| `webhookTokenName` | `string` | Modes 2, 4 | -- | Env var name holding the webhook auth token |
