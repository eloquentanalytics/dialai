---
name: dial-machine
description: >
  This skill should be used when the user asks to "implement a dial machine",
  "create a dial workflow", "add dial to my project", "run a dial machine",
  "set up dialai", "configure specialists", "build a state machine with AI and
  human decision-makers", or mentions dialai, DIAL framework, progressive collapse,
  proposers and arbiters, or alignment-based consensus in a consumer project.
---

# DIAL Machine Skill

DIAL (Dynamic Integration between AI and Labor) is a TypeScript framework for coordinating AI and human specialists making decisions within state machines. Specialists are either **proposers** (suggest state transitions) or **arbiters** (evaluate consensus among proposals). The framework tracks alignment scores between AI and human decisions, enabling progressive collapse — high-alignment specialists eventually run autonomously without human oversight.

For full API types and function signatures, see `references/api-reference.md`. For copy-paste-ready machine patterns, see `references/patterns.md`.

## Project Setup

1. Check if `dialai` is already in `package.json` dependencies. If not, install it:

```bash
npm install dialai
```

2. Confirm the project has `"type": "module"` in `package.json`. DIAL is ESM-only.

3. Import from the top-level package:

```typescript
import { runSession, createSession, registerProposer, registerArbiter } from "dialai";
import type { MachineDefinition, ProposerContext, ArbiterContext } from "dialai";
```

## Define a Machine

A `MachineDefinition` requires four fields:

| Field | Type | Description |
|---|---|---|
| `machineName` | `string` | Unique identifier for this machine type |
| `initialState` | `string` | State where sessions start |
| `goalState` | `string` | Rest state where the session is headed (must have no transitions) |
| `states` | `Record<string, StateDefinition>` | Map of state names to definitions |

Optional fields: `specialists` (array of `SpecialistDefinition`), `consensusThreshold` (number, 0-1).

Each `StateDefinition` has:
- `prompt` (string) — the decision question for specialists in this state
- `transitions` (Record<string, string>) — map of transition names to target states
- `consensusThreshold` (number) — override threshold for this state
- `specialists` (SpecialistDefinition[]) — per-state specialist declarations

### JSON Example

```json
{
  "machineName": "document-review",
  "initialState": "draft",
  "goalState": "published",
  "states": {
    "draft": {
      "prompt": "Review the document. Approve or request changes?",
      "transitions": {
        "approve": "published",
        "request_changes": "revision"
      }
    },
    "revision": {
      "prompt": "Changes made. Approve now?",
      "transitions": {
        "approve": "published",
        "request_changes": "revision"
      }
    },
    "published": {}
  }
}
```

### TypeScript Example

```typescript
import type { MachineDefinition } from "dialai";

const machine: MachineDefinition = {
  machineName: "document-review",
  initialState: "draft",
  goalState: "published",
  states: {
    draft: {
      prompt: "Review the document. Approve or request changes?",
      transitions: {
        approve: "published",
        request_changes: "revision",
      },
    },
    revision: {
      prompt: "Changes made. Approve now?",
      transitions: {
        approve: "published",
        request_changes: "revision",
      },
    },
    published: {},
  },
};
```

## Configure Specialists

Specialists have two roles:
- **Proposer** — suggests which transition to take (`role: "proposer"`)
- **Arbiter** — evaluates proposals and determines consensus (`role: "arbiter"`)

### Attachment Methods

**1. Machine-level JSON** — embedded in the machine definition:

```json
{
  "machineName": "my-machine",
  "initialState": "start",
  "goalState": "end",
  "specialists": [
    { "role": "proposer", "specialistId": "ai-1", "strategyFnName": "firstAvailable" },
    { "role": "arbiter", "specialistId": "judge", "strategyFnName": "firstProposal" }
  ],
  "states": {
    "start": {
      "prompt": "Proceed?",
      "transitions": { "go": "end" }
    },
    "end": {}
  }
}
```

**2. Per-state** — different specialists for different states:

```json
{
  "states": {
    "triage": {
      "prompt": "How should we handle this?",
      "transitions": { "escalate": "review", "resolve": "done" },
      "specialists": [
        { "role": "proposer", "specialistId": "triage-bot", "strategyFnName": "firstAvailable" },
        { "role": "arbiter", "specialistId": "triage-arbiter", "strategyFnName": "firstProposal" }
      ]
    },
    "review": {
      "prompt": "Senior review complete?",
      "transitions": { "approve": "done" },
      "specialists": [
        { "role": "proposer", "specialistId": "senior-bot", "strategyFnName": "firstAvailable" },
        { "role": "arbiter", "specialistId": "senior-arbiter", "strategyFnName": "alignmentMargin" }
      ]
    }
  }
}
```

**3. Programmatic** — registered via API calls:

```typescript
import { registerProposer, registerArbiter } from "dialai";

await registerProposer({
  specialistId: "ai-reviewer",
  machineName: "document-review",
  strategyFnName: "firstAvailable",
});

await registerArbiter({
  specialistId: "consensus-judge",
  machineName: "document-review",
  strategyFnName: "alignmentMargin",
  threshold: 0.6,
});
```

### Built-in Strategies

| Strategy | Role | Behavior |
|---|---|---|
| `firstAvailable` | proposer | Returns the first transition in the map |
| `lastAvailable` | proposer | Returns the last transition in the map |
| `random` | proposer | Returns a random transition |
| `firstProposal` | arbiter | Accepts the first proposal by timestamp |
| `alignmentMargin` | arbiter | Alignment-weighted margin consensus (see below) |

**`alignmentMargin` algorithm**: Groups proposals by transition name, scores each group by summing proposer alignment scores, computes `margin = (leader - runnerUp) / totalAlignment`. Consensus when `margin >= threshold`. Single proposal auto-approves. Cold start (all alignment = 0) requires human input.

### Execution Modes

Each specialist must have exactly one execution mode:

| Mode | Fields | Description |
|---|---|---|
| Built-in strategy | `strategyFnName` | Name of a built-in strategy |
| Custom function | `strategyFn` | Local async function |
| Webhook | `strategyWebhookUrl` + `webhookTokenName` | External HTTP endpoint |
| LLM (local context) | `contextFn` + `modelId` | You provide context, DIAL calls the LLM |
| LLM (webhook context) | `contextWebhookUrl` + `modelId` + `webhookTokenName` | Webhook provides context, DIAL calls the LLM |

Arbiters support the first three modes only (no LLM modes).

## Run the Machine

### Method 1: CLI

```bash
npx dialai machine.json
```

This registers default specialists (`firstAvailable` proposer, `firstProposal` arbiter) if none are specified in the JSON, and runs the machine to completion.

### Method 2: `runSession()` One-Liner

```typescript
import { runSession } from "dialai";

const session = await runSession(machine);
console.log(session.currentState); // goalState
console.log(session.history);      // TransitionRecord[]
```

`runSession` creates a session, registers specialists from the machine definition (or defaults), and loops `tick()` until the session reaches `goalState` or needs human intervention.

### Method 3: Manual Decision Cycle

```typescript
import {
  createSession,
  getSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  submitArbitration,
} from "dialai";

// 1. Create session
const session = await createSession(machine);

// 2. Register specialists
await registerProposer({
  specialistId: "ai-1",
  machineName: machine.machineName,
  strategyFnName: "firstAvailable",
});

await registerArbiter({
  specialistId: "arbiter-1",
  machineName: machine.machineName,
  strategyFnName: "firstProposal",
});

// 3. Submit proposals (omit transitionName to invoke the registered strategy)
await submitProposal({
  sessionId: session.sessionId,
  specialistId: "ai-1",
});

// 4. Submit arbitration (evaluates consensus, executes transition if reached)
const result = await submitArbitration({
  sessionId: session.sessionId,
});

console.log(result.executed);    // true
console.log(result.toState);     // next state

// 5. Fetch updated session
const updated = await getSession(session.sessionId);
console.log(updated.currentState);
```

## Custom Strategy Functions

### Proposer `strategyFn`

Receives a `ProposerContext` and returns `{ transitionName, toState, reasoning }`:

```typescript
await registerProposer({
  specialistId: "smart-proposer",
  machineName: "my-machine",
  strategyFn: async (ctx: ProposerContext) => {
    // ctx.currentState   — current state name
    // ctx.prompt         — decision prompt for this state
    // ctx.transitions    — Record<string, string> of available transitions
    // ctx.history        — TransitionRecord[] of previous transitions
    // ctx.metaJson       — session-level metadata

    const [name, target] = Object.entries(ctx.transitions)[0];
    return {
      transitionName: name,
      toState: target,
      reasoning: "Chose first transition based on custom logic",
    };
  },
});
```

### Arbiter `strategyFn`

Receives an `ArbiterContext` and returns `{ consensusReached, winningProposalId?, reasoning }`:

```typescript
await registerArbiter({
  specialistId: "custom-arbiter",
  machineName: "my-machine",
  strategyFn: async (ctx: ArbiterContext) => {
    // ctx.proposals        — Proposal[] in this round
    // ctx.alignmentScores  — Record<string, number> by specialistId
    // ctx.threshold        — configured threshold
    // ctx.currentState     — current state name
    // ctx.prompt           — decision prompt
    // ctx.history          — TransitionRecord[]
    // ctx.metaJson         — session-level metadata

    if (ctx.proposals.length === 0) {
      return { consensusReached: false, reasoning: "No proposals" };
    }

    // Simple: pick the first proposal
    return {
      consensusReached: true,
      winningProposalId: ctx.proposals[0].proposalId,
      reasoning: "Custom arbiter selected first proposal",
    };
  },
});
```

### LLM Mode

Use `contextFn` + `modelId` to let DIAL call an LLM with your context:

```typescript
await registerProposer({
  specialistId: "llm-proposer",
  machineName: "my-machine",
  contextFn: async (ctx: ProposerContext) => {
    // Return a string prompt for the LLM
    return `You are reviewing a document in state "${ctx.currentState}".
The prompt is: ${ctx.prompt}
Available transitions: ${JSON.stringify(ctx.transitions)}
Previous history: ${ctx.history.map(h => h.transitionName).join(" -> ")}

Choose the best transition and explain why.`;
  },
  modelId: "anthropic/claude-sonnet-4",
});
```

Set `OPENROUTER_API_TOKEN` in the environment (or `DIALAI_LLM_BASE_URL` for a different OpenAI-compatible provider).

## Testing

Use vitest with `clear()` to reset state between tests:

```typescript
import { clear, runSession } from "dialai";
import { describe, it, beforeEach, expect } from "vitest";
import type { MachineDefinition } from "dialai";

const machine: MachineDefinition = {
  machineName: "test-machine",
  initialState: "start",
  goalState: "end",
  states: {
    start: {
      prompt: "Proceed?",
      transitions: { go: "end" },
    },
    end: {},
  },
};

describe("my machine", () => {
  beforeEach(async () => {
    await clear(); // Reset all sessions, specialists, proposals
  });

  it("reaches goal state", async () => {
    const session = await runSession(machine);
    expect(session.currentState).toBe("end");
  });

  it("records transition history", async () => {
    const session = await runSession(machine);
    expect(session.history).toHaveLength(1);
    expect(session.history[0].transitionName).toBe("go");
  });
});
```

## Additional Resources

- `references/api-reference.md` — Full API types, function signatures, built-in strategies, environment variables
- `references/patterns.md` — Copy-paste-ready machine patterns (minimal, pipeline, branching, human-in-the-loop, multi-agent, LLM-powered, testing, anti-patterns)
