# How Specialists Work

Specialists are the pluggable actors that participate in DIAL sessions. They propose transitions, vote on competing proposals, and are the mechanism through which both AI and humans participate in the decision cycle.

---

## Roles

A specialist has one of three roles.

### Proposer

Proposers analyze the current state and suggest what transition should happen next. Any number of proposers can participate in a session type. When the orchestrator reaches a state with a decision prompt, it solicits proposals from all registered proposers for that session type.

A proposer receives the current state, the decision prompt, the available transitions, and the session history. It returns a single transition choice with reasoning.

### Voter

Voters evaluate proposals and express preferences between them. When two or more proposals exist, the orchestrator solicits pairwise votes from all registered voters for the session type. Each voter compares two proposals and votes A, B, BOTH, or NEITHER.

| Vote | Meaning |
|------|---------|
| **A** | Proposal A better reflects what the human would choose |
| **B** | Proposal B better reflects what the human would choose |
| **BOTH** | Both proposals are equally faithful to the decision criteria |
| **NEITHER** | Neither proposal faithfully applies the decision criteria |

### Arbiter

Arbitration is built into the framework via the `evaluateConsensus` function. There is no arbiter strategy to implement. The arbiter role exists on the `Specialist` type for future use, but the current consensus mechanism is automatic.

---

## Session Type Binding

A specialist is registered for a specific `machineName`. It only participates in sessions of that type. Multiple specialists of different roles and execution modes can be registered for the same session type. The orchestrator finds all matching specialists when it needs proposals or votes.

```typescript
// These two specialists both participate in "document-review" sessions
registerSpecialist({
  specialistId: "proposer-1",
  machineName: "document-review",
  role: "proposer",
  strategyFn: async (ctx) => { /* ... */ },
});

registerSpecialist({
  specialistId: "voter-1",
  machineName: "document-review",
  role: "voter",
  strategyFn: async (ctx) => { /* ... */ },
});
```

---

## The Four Execution Modes

When you register a specialist, you configure **how** it produces proposals or votes. There are four execution modes. They are mutually exclusive.

### 1. `strategyFn` — Local Function

You provide an async function. The orchestrator calls it with the appropriate context for the specialist's role and expects a complete Proposal or Vote back.

```typescript
registerSpecialist({
  specialistId: "my-proposer",
  machineName: "document-review",
  role: "proposer",
  strategyFn: async (context: ProposerContext) => ({
    transitionName: "approve",
    toState: "approved",
    reasoning: "Document meets all criteria",
  }),
});
```

```typescript
registerSpecialist({
  specialistId: "my-voter",
  machineName: "document-review",
  role: "voter",
  strategyFn: async (context: VoterContext) => ({
    voteFor: "A",
    reasoning: "Proposal A better addresses the prompt",
  }),
});
```

The function receives full context (see [Context Shapes](#context-shapes-by-role) below) and returns the final answer. What happens inside the function is entirely up to you. Call your own LLM, run deterministic logic, flip a coin. The orchestrator does not care — it only checks that the return value matches the specialist's role.

**Required parameters:** `strategyFn`
**Forbidden parameters:** `contextFn`, `contextWebhookUrl`, `strategyWebhookUrl`, `modelId`, `webhookTokenName`

---

### 2. `strategyWebhookUrl` — Remote Function

Same as `strategyFn`, but the orchestrator POSTs the context to a URL instead of calling a local function. The webhook receives the full proposer or voter context as the JSON request body.

```typescript
registerSpecialist({
  specialistId: "remote-proposer",
  machineName: "document-review",
  role: "proposer",
  strategyWebhookUrl: "https://my-service.example.com/propose",
  webhookTokenName: "MY_SERVICE_TOKEN",
});
```

Authentication is HTTP Basic Auth. The username is the `machineName`. The password is the value of the environment variable (or `.env` entry) named by `webhookTokenName`.

```
POST https://my-service.example.com/propose
Authorization: Basic base64("document-review:${MY_SERVICE_TOKEN}")
Content-Type: application/json

{ ...ProposerContext }
```

#### Response Handling: 55-Second Window

The orchestrator waits **up to 55 seconds** for the webhook to respond.

- **If the webhook responds** with a JSON body containing a valid proposal or vote, the orchestrator submits it on the specialist's behalf. The orchestrator treats it the same as a `strategyFn` return value.

  Proposer response:
  ```json
  { "transitionName": "approve", "toState": "approved", "reasoning": "Meets criteria" }
  ```

  Voter response:
  ```json
  { "voteFor": "A", "reasoning": "Proposal A is more faithful to the prompt" }
  ```

- **If the webhook does not respond within 55 seconds**, or responds with an empty body or a `202 Accepted`, the orchestrator moves on. The webhook is then responsible for calling the DIAL API (`submitProposal` or `submitVote`) at its own leisure when it has a result.

If the webhook does not intend to reply inline, it should drop the connection early or return `202 Accepted` immediately rather than holding the request open.

**Required parameters:** `strategyWebhookUrl`, `webhookTokenName`
**Forbidden parameters:** `strategyFn`, `contextFn`, `contextWebhookUrl`, `modelId`

---

### 3. `contextFn` — Local Context, Orchestrator Calls LLM

You provide an async function that returns a string. The orchestrator sends that string to the LLM specified by `modelId` along with the decision prompt and parses the LLM response into a Proposal or Vote.

```typescript
registerSpecialist({
  specialistId: "context-proposer",
  machineName: "document-review",
  role: "proposer",
  modelId: "openai/gpt-4o-mini",
  contextFn: async (context: ProposerContext) => {
    const doc = await readFile(context.prompt);
    return `Document contents:\n${doc}\n\nReview criteria: completeness, accuracy`;
  },
});
```

```typescript
registerSpecialist({
  specialistId: "context-voter",
  machineName: "document-review",
  role: "voter",
  modelId: "openai/gpt-4o-mini",
  contextFn: async (context: VoterContext) => {
    return `Company policy requires minimal state transitions when possible.`;
  },
});
```

The orchestrator handles all LLM interaction: prompt assembly, the API call, response parsing, and validation. Your function only provides the context string — whatever additional information the LLM needs beyond the decision prompt and proposal/transition data that the orchestrator already has.

The reference implementation uses any OpenAI-compatible chat completions endpoint. The base URL is configurable. By default it points at OpenRouter and expects `OPENROUTER_API_TOKEN` in the environment.

**Required parameters:** `contextFn`, `modelId`
**Forbidden parameters:** `strategyFn`, `strategyWebhookUrl`, `contextWebhookUrl`, `webhookTokenName`

---

### 4. `contextWebhookUrl` — Remote Context, Orchestrator Calls LLM

Same as `contextFn`, but the orchestrator POSTs the context request to a URL instead of calling a local function. The orchestrator then sends the returned context to the LLM, same as mode 3.

```typescript
registerSpecialist({
  specialistId: "webhook-context-proposer",
  machineName: "document-review",
  role: "proposer",
  modelId: "openai/gpt-4o-mini",
  contextWebhookUrl: "https://my-service.example.com/context",
  webhookTokenName: "MY_SERVICE_TOKEN",
});
```

```
POST https://my-service.example.com/context
Authorization: Basic base64("document-review:${MY_SERVICE_TOKEN}")
Content-Type: application/json

{ ...ProposerContext }
```

#### Response Handling: 55-Second Window

The orchestrator waits **up to 55 seconds** for the webhook to respond with context.

- **If the webhook responds** with a JSON body, the orchestrator extracts the context string from the `content` or `markdown` field (`content` takes precedence; they are interchangeable). That string is sent to the LLM specified by `modelId` alongside the decision prompt.

  ```json
  { "content": "Document contents:\n..." }
  ```

  or:

  ```json
  { "markdown": "## Review Notes\n..." }
  ```

- **If the webhook does not respond within 55 seconds**, the orchestrator calls the LLM with no additional context — only the decision prompt and the built-in proposal/transition data. The specialist still participates, but without the extra context the webhook would have provided.

If the webhook does not intend to reply inline, it should drop the connection early rather than holding the request open.

Authentication works identically to `strategyWebhookUrl` — Basic Auth with `machineName` as user, env var value as password.

**Required parameters:** `contextWebhookUrl`, `webhookTokenName`, `modelId`
**Forbidden parameters:** `strategyFn`, `strategyWebhookUrl`, `contextFn`

---

## Context Shapes by Role

The orchestrator passes different context depending on the specialist's role.

### ProposerContext

Passed to proposer `strategyFn`, proposer `contextFn`, and as the POST body to proposer webhooks.

```typescript
interface ProposerContext {
  sessionId: string;
  currentState: string;
  prompt: string;                          // from machine state definition
  transitions: Record<string, string>;     // { transitionName: targetState }
  history: TransitionRecord[];             // prior transitions in this session
}
```

A proposer `strategyFn` must return:

```typescript
{ transitionName: string; toState: string; reasoning: string }
```

### VoterContext

Passed to voter `strategyFn`, voter `contextFn`, and as the POST body to voter webhooks.

```typescript
interface VoterContext {
  sessionId: string;
  proposalA: Proposal;
  proposalB: Proposal;
}
```

A voter `strategyFn` must return:

```typescript
{ voteFor: "A" | "B" | "BOTH" | "NEITHER"; reasoning: string }
```

---

## Specialist ID Conventions

The `specialistId` is a free-form string. Any naming scheme works, but including the role and purpose is helpful:

```
ai-proposer-1
ai-voter-gpt4
human-reviewer
human-approver-jane
remote-context-proposer
```

One naming convention has behavioral significance: if the `specialistId` contains `"human"` (case-insensitive), the specialist is treated as a human specialist for the purposes of consensus evaluation. See [Human Specialists](#human-specialists) below.

---

## Weight

Every specialist has a `weight` (default `1.0`) that determines how much its votes count during consensus evaluation.

```typescript
registerSpecialist({
  specialistId: "senior-voter",
  machineName: "document-review",
  role: "voter",
  weight: 2.0,
  strategyFn: async (ctx) => { /* ... */ },
});
```

Weight only matters for voter specialists — it affects the vote tally in `evaluateConsensus`. Proposer weight has no effect on proposal selection (proposals are selected by votes, not by proposer weight).

Human vote override ignores weights entirely. If a human votes, their choice wins regardless of any weight configuration.

---

## Human Specialists

A specialist is identified as human if its `specialistId` contains `"human"` (case-insensitive). Examples:

```
human-reviewer          ← human
specialist.human.jane   ← human
HUMAN_APPROVER          ← human
ai-proposer-1           ← not human
quality-voter           ← not human
```

When `evaluateConsensus` encounters a vote from a human specialist, that vote wins immediately. All AI votes are ignored. This is the **human primacy override** — the foundational safety mechanism in DIAL.

```
Proposal A: "approve"
  - AI Voter 1 votes A (weight 1.0)
  - AI Voter 2 votes A (weight 1.0)
  - AI Voter 3 votes A (weight 1.0)

Proposal B: "request_changes"
  - Human Voter votes B (weight 1.0)

Result: B wins immediately. AI votes do not matter.
```

The rationale: humans have context that AI cannot access. When a human's decision differs from the AI's, the AI should assume the human had reasons it cannot see. See `DIAL_CONSTITUTION.md` for the full reasoning.

---

## Consensus: How Votes Become Transitions

After proposals and votes are collected, `evaluateConsensus` determines the outcome.

### Rules

1. **Zero proposals** — No consensus. `consensusReached: false`.

2. **Single proposal** — Auto-consensus. The lone proposal wins. No votes needed.

3. **Two or more proposals** — Evaluate votes:
   - If any human specialist has voted, their choice wins immediately (human primacy).
   - Otherwise, tally weighted votes per proposal.
   - For each vote: `"A"` adds the voter's weight to proposal A, `"B"` to proposal B, `"BOTH"` to both, `"NEITHER"` to neither.
   - The leading proposal must be ahead of the runner-up by at least `k = 1.0` weighted votes.
   - If no proposal leads by the required margin, consensus fails.

### Result Shape

```typescript
interface ConsensusResult {
  consensusReached: boolean;
  winningProposalId?: string;
  reasoning: string;
}
```

---

## The Decision Cycle

Specialists do not run in isolation. They participate in a repeating cycle driven by the orchestrator (`runSession`). The cycle runs for each non-terminal state until the session reaches its `defaultState`.

### Per-State Cycle

1. **Solicit proposals** — The orchestrator calls all registered proposers for the session type. Each proposer receives a `ProposerContext` and returns a proposal (or, for webhooks, the orchestrator POSTs the context and waits for a response).

2. **Solicit pairwise votes** — If two or more proposals exist, the orchestrator generates all pairs and solicits votes from all registered voters for each pair. With N proposals and V voters, this produces `V * (N choose 2)` votes.

3. **Evaluate consensus** — `evaluateConsensus` applies the voting rules described above.

4. **Execute transition** — If consensus is reached, the winning proposal's transition executes. The session's `currentState` updates. All proposals and votes for the session are cleared.

5. **Repeat** — If the session has not reached `defaultState`, the cycle runs again from step 1 in the new state.

If consensus cannot be reached at any step, the engine throws an error.

### Single-Proposer Shortcut

When only one proposer is registered (or only one proposal is submitted), that proposal wins by auto-consensus. No voters are solicited. This is the common case for simple machines and the built-in deterministic proposer.

---

## Direct Submission

You can bypass the strategy/execution mode system entirely and submit proposals or votes directly using `submitProposal` and `submitVote`. This is useful for:

- Human-facing UIs where a person makes the choice
- External systems that call into the DIAL API
- Webhook callbacks (when the strategy webhook returns `202` and calls back later)
- Testing

```typescript
import { submitProposal, submitVote } from "dialai";

const proposal = submitProposal(
  sessionId,
  "manual-proposer",
  "approve",
  "approved",
  "Manually approved after review"
);

const vote = submitVote(
  sessionId,
  "manual-voter",
  proposalA.proposalId,
  proposalB.proposalId,
  "A",
  "Prefer proposal A"
);
```

Direct submission does not require a registered specialist. The `specialistId` is just a string identifier. However, if the ID contains `"human"`, the human primacy override still applies during consensus evaluation.

---

## Validation Rules

`registerSpecialist` rejects invalid parameter combinations at registration time with an error message explaining what is allowed. The valid combinations are:

| Mode | strategyFn | strategyWebhookUrl | contextFn | contextWebhookUrl | modelId | webhookTokenName |
|------|:---:|:---:|:---:|:---:|:---:|:---:|
| 1. Local strategy | required | | | | | |
| 2. Webhook strategy | | required | | | | required |
| 3. Local context + LLM | | | required | | required | |
| 4. Webhook context + LLM | | | | required | required | required |

Any other combination is an error. Examples of invalid configurations and their error messages:

- `strategyFn` + `modelId` — *"modelId is only used with contextFn or contextWebhookUrl. A strategyFn returns proposals/votes directly and does not need a model."*
- `contextFn` without `modelId` — *"contextFn provides context for an LLM to generate proposals/votes. You must also specify modelId."*
- `strategyFn` + `contextFn` — *"Provide either strategyFn (you handle everything) or contextFn + modelId (orchestrator calls the LLM), not both."*
- `contextWebhookUrl` without `webhookTokenName` — *"Webhook URLs require webhookTokenName for authentication."*
- No execution parameters at all — *"Specialist must specify one of: strategyFn, strategyWebhookUrl, contextFn + modelId, or contextWebhookUrl + modelId."*

---

## Registration Options Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `specialistId` | `string` | Yes | — | Unique identifier. Include "human" for human specialists. |
| `machineName` | `string` | Yes | — | Which session type this specialist participates in |
| `role` | `"proposer" \| "voter" \| "arbiter"` | Yes | — | The specialist's role |
| `weight` | `number` | No | `1.0` | Voting weight used in consensus evaluation |
| `strategyFn` | `async (context) => result` | Mode 1 | — | Local function that returns a proposal or vote |
| `strategyWebhookUrl` | `string` | Mode 2 | — | URL to POST context to; expects proposal/vote response |
| `contextFn` | `async (context) => string` | Mode 3 | — | Local function that returns context for the LLM |
| `contextWebhookUrl` | `string` | Mode 4 | — | URL to POST context request to; expects context response |
| `modelId` | `string` | Modes 3, 4 | — | LLM model identifier (e.g., `"openai/gpt-4o-mini"`) |
| `webhookTokenName` | `string` | Modes 2, 4 | — | Env var name holding the webhook auth token |

---

## Machine Definitions Do Not Change

The execution mode is a property of the **specialist**, not the **machine**. A machine defines states, transitions, and decision prompts. Different specialists can participate in the same machine using different execution modes — one proposer might use a local `strategyFn` while another uses `contextFn` + `modelId`. The orchestrator handles the dispatch.

---

## LLM Configuration in the Reference Implementation

When a specialist uses `contextFn` or `contextWebhookUrl` (modes 3 and 4), the orchestrator calls an LLM. The reference implementation ships a helper that talks to any OpenAI-compatible chat completions endpoint.

- **Base URL**: Configurable. Defaults to `https://openrouter.ai/api/v1`.
- **API key**: Read from the `OPENROUTER_API_TOKEN` environment variable.
- **Model**: The `modelId` from the specialist registration (e.g., `"openai/gpt-4o-mini"`).

The orchestrator assembles the LLM prompt from:
1. A system message framing the specialist's role (proposer or voter)
2. The decision prompt from the machine state
3. The available transitions or proposals (depending on role)
4. The context string returned by `contextFn` or the context webhook

The LLM response is parsed into the appropriate shape (proposal or vote) and submitted on behalf of the specialist.

---

## Reasoning

Every proposal and every vote includes a `reasoning` string. This is not optional decoration — it is the mechanism by which humans and other specialists can evaluate whether a decision was derived from the right criteria.

Good reasoning traces back to the decision prompt or session history. It explains *why* this transition or *why* this vote, not just *what* was chosen.

```
Good: "The document has been reviewed by two approvers and all comments are resolved,
       so the 'approve' transition matches the prompt criteria."

Bad:  "approve"
```

When a specialist is uncertain, the correct response is to say so — vote NEITHER, or include the uncertainty in the reasoning. Fabricating confidence corrupts the system's ability to measure alignment.

---

## All Functions Are Async

Every function in the specialist execution path is async: `strategyFn`, `contextFn`, `solicitProposal`, `solicitVote`, and `runSession`. This is true even for mode 1, where a local deterministic function could be synchronous. The uniform async interface means the orchestrator does not need separate codepaths for sync and async execution.
