---
sidebar_position: 1
---

# State Machines

State machines define the structure of your sessions. Each machine has its own definition.

## Why State Machines?

Every agentic AI system is a state machine: the agent occupies a state, takes an action, and transitions to a new state. Frameworks like LangGraph make this explicit: agents are graphs of states and edges. Even "open-ended" agent loops (observe → reason → act → observe) follow this structure.

DIAL makes the state machine explicit so that each transition becomes a **measurable decision point**. This doesn't limit what you can model; it clarifies *where decisions happen* so they can be calibrated. You don't need a DIAL decision point at every micro-step; you place them at the boundaries where delegation risk matters. An agent's internal tool-call loop can remain opaque. DIAL measures the outcomes at the states you care about.

This means open-ended tasks fit naturally:
- **Document generation**: Proposals *are* the candidate documents. Specialists propose drafts, voters compare them, the human picks or edits the winner.
- **Agentic workflows**: The default state is the agent's normal operating mode. It transitions out for decisions that need deliberation (tool selection, plan changes) and back when resolved.
- **Research and exploration**: Model as a loop: the agent explores, then a decision determines whether findings are sufficient or more exploration is needed.

## Defining a Machine

A `MachineDefinition` defines:

- `machineName`: identifies the type
- `initialState`: where sessions start
- `defaultState`: the state where the session is complete
- `states`: a record of state names to their configuration

For a complete JSON Schema definition, see [schema.json](../schema.json).

## Example

```typescript
import type { MachineDefinition } from "dialai";

const myMachine: MachineDefinition = {
  machineName: "my-task",
  initialState: "idle",
  defaultState: "done",
  states: {
    idle: {
      prompt: "The system is idle. What should happen next?",
      transitions: {
        start: "working",
        configure: "configuring",
      },
    },
    configuring: {
      prompt: "Configuration in progress. Apply or cancel?",
      transitions: {
        apply: "working",
        cancel: "idle",
      },
    },
    working: {
      prompt: "The system is working. Should it continue or finish?",
      transitions: {
        finish: "done",
        reconfigure: "configuring",
      },
    },
    done: {},
  },
};
```

## Machine Definition as JSON

Machines can also be defined as plain JSON files, useful with the CLI:

```json
{
  "machineName": "simple-task",
  "initialState": "pending",
  "defaultState": "done",
  "states": {
    "pending": {
      "prompt": "Should we complete this task?",
      "transitions": { "complete": "done" }
    },
    "done": {}
  }
}
```

Run with the CLI:

```bash
npx dialai my-machine.json
```

This is a minimal example. Machine JSON files can also include embedded specialist and arbiter configuration—see [Full Machine JSON Structure](#full-machine-json-structure) below.

## State Configuration

Each state in the `states` record can have:

### `prompt` (optional)

A string describing the decision to be made in this state. This prompt guides specialists in choosing which transition to propose. If omitted, a generic default prompt is used: `"Choose a transition for state '{stateName}'."` with the available transitions listed.

```typescript
states: {
  reviewing: {
    prompt: "Review the document. Approve if quality standards are met, otherwise request changes.",
    transitions: { approve: "approved", request_changes: "needs_revision" },
  },
}
```

### `transitions` (optional)

A record mapping transition names to target state names. If omitted, the state has no outgoing transitions (terminal state).

```typescript
transitions: {
  approve: "approved",        // transition "approve" → state "approved"
  request_changes: "needs_revision",
}
```

### `proposers` (optional)

A record of proposer specialists registered for this state. Each proposer can be configured with one of four execution modes.

### `voters` (optional)

A record of voter specialists registered for this state. Each voter can be configured with one of four execution modes.

### `arbiter` (optional)

Arbiter configuration for this state, including consensus threshold and optional reasoning synthesis.

## Full Machine JSON Structure

Machines can include embedded AI specialist and arbiter configuration at the state level. Human specialists are registered separately—not in the machine JSON:

```json
{
  "machineName": "example-task",
  "initialState": "pending",
  "defaultState": "done",
  "states": {
    "pending": {
      "prompt": "Should we complete this task?",
      "transitions": { "complete": "done" },

      "proposers": {
        "ai-proposer-1": {
          "strategyFn": "async (ctx) => ({ transitionName: 'complete', reasoning: 'Task is ready' })"
        },
        "llm-proposer-2": {
          "modelId": "openai/gpt-4o-mini"
        }
      },

      "voters": {
        "voter-1": {
          "strategyFn": "async (ctx) => ({ voteFor: 'A', reasoning: 'Proposal A is more aligned' })"
        },
        "llm-voter-2": {
          "modelId": "openai/gpt-4o-mini"
        }
      },

      "arbiter": {
        "aheadByK": 2
      }
    },
    "done": {}
  }
}
```

### State-Level Fields

| Field | Type | Description |
|-------|------|-------------|
| `prompt` | `string` | Decision prompt for this state |
| `transitions` | `Record<string, string>` | Map of transition names to target states |
| `proposers` | `Record<string, SpecialistConfig>` | Proposers registered for this state |
| `voters` | `Record<string, SpecialistConfig>` | Voters registered for this state |
| `arbiter` | `ArbiterConfig` | Arbiter configuration for this state |

### Specialist Configuration in JSON

Each proposer or voter supports the same [four execution modes](./registering-specialists.md#execution-modes) as programmatic registration. In JSON, function values are represented as strings:

```json
{
  "proposers": {
    "inline-strategy": {
      "strategyFn": "async (ctx) => ({ transitionName: 'approve', reasoning: 'Ready' })"
    },
    "llm-based": {
      "modelId": "openai/gpt-4o-mini"
    },
    "llm-with-context": {
      "modelId": "openai/gpt-4o-mini",
      "contextFn": "async (ctx) => `History: ${ctx.history.length} transitions`"
    },
    "webhook-based": {
      "strategyWebhookUrl": "https://api.example.com/propose",
      "webhookTokenName": "MY_API_TOKEN"
    }
  }
}
```

**Note:** Human specialists are registered separately via `registerVoter` or `registerProposer` with `isHuman: true`—they are not defined in the machine JSON. See [Registering Specialists](./registering-specialists.md) for the full configuration reference and [Implementing Strategies](./implementing-strategies.md) for strategy function details.

### Arbiter Configuration

The `arbiter` block controls consensus evaluation:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `aheadByK` | `number` | `1` | Votes the leading proposal must be ahead by |
| `modelId` | `string` | — | LLM for reasoning synthesis (optional) |
| `contextFn` | `string` | — | Context function for reasoning synthesis |

Higher `aheadByK` values require stronger consensus. See [Arbitration](../concepts/arbitration.md) for details.

## Design Patterns

### Linear Workflow

```typescript
const linear: MachineDefinition = {
  machineName: "pipeline",
  initialState: "step1",
  defaultState: "complete",
  states: {
    step1: { transitions: { next: "step2" } },
    step2: { transitions: { next: "step3" } },
    step3: { transitions: { next: "complete" } },
    complete: {},
  },
};
```

### Review Loop

```typescript
const reviewLoop: MachineDefinition = {
  machineName: "review",
  initialState: "draft",
  defaultState: "published",
  states: {
    draft: {
      prompt: "Review the draft. Approve or request revisions?",
      transitions: {
        approve: "published",
        revise: "revising",
      },
    },
    revising: {
      prompt: "Revisions made. Submit for review?",
      transitions: { submit: "draft" },
    },
    published: {},
  },
};
```

### Branching Decisions

```typescript
const branching: MachineDefinition = {
  machineName: "triage",
  initialState: "incoming",
  defaultState: "resolved",
  states: {
    incoming: {
      prompt: "Triage this ticket: escalate, handle directly, or close?",
      transitions: {
        escalate: "escalated",
        handle: "in_progress",
        close: "resolved",
      },
    },
    escalated: {
      transitions: { resolve: "resolved" },
    },
    in_progress: {
      transitions: { resolve: "resolved", escalate: "escalated" },
    },
    resolved: {},
  },
};
```

### Agentic Workflow

An agent's operating loop modeled as a DIAL machine. The default state is the agent running normally: it transitions out when a decision needs deliberation, and back when resolved.

```typescript
const agentLoop: MachineDefinition = {
  machineName: "coding-agent",
  initialState: "operating",
  defaultState: "done",
  states: {
    operating: {
      prompt:
        "The agent is working. Should it continue, use a tool, replan, or finalize?",
      transitions: {
        use_tool: "tool_selection",
        replan: "planning",
        finalize: "done",
      },
    },
    tool_selection: {
      prompt: "Which tool should the agent use for this step?",
      transitions: { selected: "operating" },
    },
    planning: {
      prompt: "The current approach isn't working. What should the new plan be?",
      transitions: { resume: "operating" },
    },
    done: {},
  },
};
```

### Document Generation

For open-ended generation tasks, the specialist proposals *are* the candidate outputs. Voters compare drafts, and the human selects or edits the winner.

```typescript
const docGen: MachineDefinition = {
  machineName: "report-generation",
  initialState: "drafting",
  defaultState: "published",
  states: {
    drafting: {
      prompt:
        "Generate a draft of the report. Each proposal should be a complete draft.",
      transitions: {
        accept: "published",
        revise: "revising",
      },
    },
    revising: {
      prompt:
        "Revise the draft based on feedback. Each proposal should be a revised version.",
      transitions: {
        accept: "published",
        revise: "revising",
      },
    },
    published: {},
  },
};
```

## Decision Prompts

Each state's `prompt` describes how to decide what to do next. Good prompts are:

- **Specific**: List the available choices and criteria
- **Actionable**: Tell the specialist what to evaluate
- **Consistent**: Same instructions for all specialists (AI and human)

```
Good: "Review the code changes. Check for: 1) correctness, 2) test coverage,
      3) documentation. Approve if all criteria met, otherwise request changes."

Bad:  "Decide what to do next."
```
