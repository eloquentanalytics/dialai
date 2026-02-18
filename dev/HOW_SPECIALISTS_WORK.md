# How Specialists Work

Specialists are the pluggable actors that participate in DIAL sessions. They propose transitions and are the mechanism through which both AI and humans participate in the decision cycle.

---

## Roles

A specialist has one of two roles.

### Proposer

Proposers analyze the current state and suggest what transition should happen next. Any number of proposers can participate in a session type. When the orchestrator reaches a state with a decision prompt, it solicits proposals from all registered proposers for that session type.

A proposer receives the current state, the decision prompt, the available transitions, and the session history. It returns a single transition choice with reasoning.

Each proposal counts as one endorsement of the transition it selects. Consensus is determined by counting endorsements per transition using the ahead-by-k mechanism (see [Consensus](#consensus-how-proposals-become-transitions) below).

### Arbiter

Arbitration is built into the framework via the `evaluateConsensus` function. There is no arbiter strategy to implement. The consensus mechanism is automatic.

---

## Session Type Binding

A specialist is registered for a specific `machineName`. It only participates in sessions of that type. Multiple specialists of different roles and execution modes can be registered for the same session type. The orchestrator finds all matching specialists when it needs proposals.

```typescript
// These two specialists both participate in "document-review" sessions
registerSpecialist({
  specialistId: "proposer-1",
  machineName: "document-review",
  role: "proposer",
  strategyFn: async (ctx) => { /* ... */ },
});

registerSpecialist({
  specialistId: "proposer-2",
  machineName: "document-review",
  role: "proposer",
  strategyFn: async (ctx) => { /* ... */ },
});
```

---

## The Four Execution Modes

When you register a specialist, you configure **how** it produces proposals. There are four execution modes. They are mutually exclusive.

### 1. `strategyFn` — Local Function

You provide an async function. The orchestrator calls it with the appropriate context and expects a complete Proposal back.

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

The function receives full context (see [Context Shapes](#context-shapes-by-role) below) and returns the final answer. What happens inside the function is entirely up to you. Call your own LLM, run deterministic logic, flip a coin. The orchestrator does not care — it only checks that the return value matches the expected proposal shape.

**Required parameters:** `strategyFn`
**Forbidden parameters:** `contextFn`, `contextWebhookUrl`, `strategyWebhookUrl`, `modelId`, `webhookTokenName`

---

### 2. `strategyWebhookUrl` — Remote Function

Same as `strategyFn`, but the orchestrator POSTs the context to a URL instead of calling a local function. The webhook receives the full proposer context as the JSON request body.

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

- **If the webhook responds** with a JSON body containing a valid proposal, the orchestrator submits it on the specialist's behalf. The orchestrator treats it the same as a `strategyFn` return value.

  Proposer response:
  ```json
  { "transitionName": "approve", "toState": "approved", "reasoning": "Meets criteria" }
  ```

- **If the webhook does not respond within 55 seconds**, or responds with an empty body or a `202 Accepted`, the orchestrator moves on. The webhook is then responsible for calling the DIAL API (`submitProposal`) at its own leisure when it has a result.

If the webhook does not intend to reply inline, it should drop the connection early or return `202 Accepted` immediately rather than holding the request open.

**Required parameters:** `strategyWebhookUrl`, `webhookTokenName`
**Forbidden parameters:** `strategyFn`, `contextFn`, `contextWebhookUrl`, `modelId`

---

### 3. `contextFn` — Local Context, Orchestrator Calls LLM

You provide an async function that returns a string. The orchestrator sends that string to the LLM specified by `modelId` along with the decision prompt and parses the LLM response into a Proposal.

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

The orchestrator handles all LLM interaction: prompt assembly, the API call, response parsing, and validation. Your function only provides the context string — whatever additional information the LLM needs beyond the decision prompt and transition data that the orchestrator already has.

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

- **If the webhook does not respond within 55 seconds**, the orchestrator calls the LLM with no additional context — only the decision prompt and the built-in transition data. The specialist still participates, but without the extra context the webhook would have provided.

If the webhook does not intend to reply inline, it should drop the connection early rather than holding the request open.

Authentication works identically to `strategyWebhookUrl` — Basic Auth with `machineName` as user, env var value as password.

**Required parameters:** `contextWebhookUrl`, `webhookTokenName`, `modelId`
**Forbidden parameters:** `strategyFn`, `strategyWebhookUrl`, `contextFn`

---

## Context Shapes by Role

The orchestrator passes context to proposers when soliciting proposals.

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

---

## Specialist ID Conventions

The `specialistId` is a free-form string. Any naming scheme works, but including the role and purpose is helpful:

```
ai-proposer-1
ai-proposer-gpt4
human-reviewer
human-approver-jane
remote-context-proposer
```

One naming convention has behavioral significance: if the `specialistId` contains `"human"` (case-insensitive), the specialist is treated as a human specialist for the purposes of consensus evaluation. See [Human Specialists](#human-specialists) below.

---

## Human Specialists

A specialist is identified as human if its `specialistId` contains `"human"` (case-insensitive). Examples:

```
human-reviewer          <- human
specialist.human.jane   <- human
HUMAN_APPROVER          <- human
ai-proposer-1           <- not human
```

When `evaluateConsensus` encounters a proposal from a human specialist, that proposal wins consensus immediately. All AI proposals are disregarded. This is the **human primacy rule** — the foundational safety mechanism in DIAL.

```
Transition: "approve"
  - AI Proposer 1 endorses "approve"
  - AI Proposer 2 endorses "approve"
  - AI Proposer 3 endorses "approve"

Transition: "request_changes"
  - Human Proposer endorses "request_changes"

Result: "request_changes" wins immediately. AI proposals do not matter.
```

The winning proposal is the human's proposal. The rationale: humans have context that AI cannot access. When a human's decision differs from the AI's, the AI should assume the human had reasons it cannot see. See `DIAL_CONSTITUTION.md` for the full reasoning.

---

## Consensus: How Proposals Become Transitions

After proposals are collected, `evaluateConsensus` determines the outcome by counting endorsements per transition.

### Rules

1. **Zero proposals** — No consensus. `consensusReached: false`.

2. **Human proposal exists** — The human's proposal wins immediately. All AI proposals are disregarded. The winning proposal is the first proposal submitted by a human specialist for the winning transition.

3. **Single transition endorsed** — Auto-consensus. If every proposal endorses the same transition, that transition wins. The winning proposal is the first proposal submitted for that transition.

4. **Multiple transitions endorsed** — Apply ahead-by-k:
   - Count the number of proposals endorsing each transition.
   - The leading transition must be ahead of the runner-up by at least `k` proposals (default `k = 1`).
   - If a transition leads by the required margin, it wins. The winning proposal is the first proposal submitted for that transition.
   - If no transition leads by the required margin, consensus fails.

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

2. **Evaluate consensus** — `evaluateConsensus` counts endorsements per transition and applies the rules described above (human primacy, then ahead-by-k).

3. **Execute transition** — If consensus is reached, the winning proposal's transition executes. The session's `currentState` updates. All proposals for the session are cleared.

4. **Repeat** — If the session has not reached `defaultState`, the cycle runs again from step 1 in the new state.

If consensus cannot be reached at any step, the engine throws an error.

### Single-Proposer Shortcut

When only one proposer is registered (or only one proposal is submitted), that proposal wins by auto-consensus. This is the common case for simple machines and the built-in deterministic proposer.

---

## Direct Submission

You can bypass the strategy/execution mode system entirely and submit proposals directly using `submitProposal`. This is useful for:

- Human-facing UIs where a person makes the choice
- External systems that call into the DIAL API
- Webhook callbacks (when the strategy webhook returns `202` and calls back later)
- Testing

```typescript
import { submitProposal } from "dialai";

const proposal = submitProposal(
  sessionId,
  "manual-proposer",
  "approve",
  "approved",
  "Manually approved after review"
);
```

Direct submission does not require a registered specialist. The `specialistId` is just a string identifier. However, if the ID contains `"human"`, the human primacy rule still applies during consensus evaluation.

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

- `strategyFn` + `modelId` — *"modelId is only used with contextFn or contextWebhookUrl. A strategyFn returns proposals directly and does not need a model."*
- `contextFn` without `modelId` — *"contextFn provides context for an LLM to generate proposals. You must also specify modelId."*
- `strategyFn` + `contextFn` — *"Provide either strategyFn (you handle everything) or contextFn + modelId (orchestrator calls the LLM), not both."*
- `contextWebhookUrl` without `webhookTokenName` — *"Webhook URLs require webhookTokenName for authentication."*
- No execution parameters at all — *"Specialist must specify one of: strategyFn, strategyWebhookUrl, contextFn + modelId, or contextWebhookUrl + modelId."*

---

## Registration Options Reference

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `specialistId` | `string` | Yes | — | Unique identifier. Include "human" for human specialists. |
| `machineName` | `string` | Yes | — | Which session type this specialist participates in |
| `role` | `"proposer"` | Yes | — | The specialist's role |
| `strategyFn` | `async (context) => result` | Mode 1 | — | Local function that returns a proposal |
| `strategyWebhookUrl` | `string` | Mode 2 | — | URL to POST context to; expects proposal response |
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
1. A system message framing the specialist's role as a proposer
2. The decision prompt from the machine state
3. The available transitions
4. The context string returned by `contextFn` or the context webhook

The LLM response is parsed into a proposal and submitted on behalf of the specialist.

---

## Reasoning

Every proposal includes a `reasoning` string. This is not optional decoration — it is the mechanism by which humans and other specialists can evaluate whether a decision was derived from the right criteria.

Good reasoning traces back to the decision prompt or session history. It explains *why* this transition was chosen, not just *what* was chosen.

```
Good: "The document has been reviewed by two approvers and all comments are resolved,
       so the 'approve' transition matches the prompt criteria."

Bad:  "approve"
```

When a specialist is uncertain, the reasoning should include the uncertainty. Fabricating confidence corrupts the system's ability to measure alignment.

---

## All Functions Are Async

Every function in the specialist execution path is async: `strategyFn`, `contextFn`, `solicitProposal`, and `runSession`. This is true even for mode 1, where a local deterministic function could be synchronous. The uniform async interface means the orchestrator does not need separate codepaths for sync and async execution.
