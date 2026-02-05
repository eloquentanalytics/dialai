---
sidebar_position: 1
---

# State Machines

State machines define the structure of your sessions. Each session type has its own machine definition.

## Defining a Machine

A `MachineDefinition` defines:

- `machineName` — identifies the type
- `initialState` — where sessions start
- `defaultState` — the goal state (session is complete when it reaches this)
- `states` — a record of state names to their configuration

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
node dist/dialai/cli.js my-machine.json
```

## State Configuration

Each state in the `states` record can have:

### `prompt` (optional)

A string describing the decision to be made in this state. This prompt guides specialists in choosing which transition to propose.

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

## Decision Prompts

Each state's `prompt` describes how to decide what to do next. Good prompts are:

- **Specific** — List the available choices and criteria
- **Actionable** — Tell the specialist what to evaluate
- **Consistent** — Same instructions for all specialists (AI and human)

```
Good: "Review the code changes. Check for: 1) correctness, 2) test coverage,
      3) documentation. Approve if all criteria met, otherwise request changes."

Bad:  "Decide what to do next."
```
