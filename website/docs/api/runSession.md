---
sidebar_position: 2
---

# `runSession(machine: MachineDefinition): Promise<Session>`

Runs a machine to completion. Creates a session, registers specialists (from the machine definition or a built-in deterministic proposer), and loops through the decision cycle until `currentState === goalState`.

## CLI Usage

The simplest way to run a machine:

```bash
npx dialai machine.json
```

Where `machine.json` contains:

```json
{
  "machineName": "document-review",
  "initialState": "pending",
  "goalState": "approved",
  "states": {
    "pending": {
      "prompt": "Review the document. Approve or request changes?",
      "transitions": { "approve": "approved", "request_changes": "needs_revision" }
    },
    "needs_revision": {
      "prompt": "Revisions submitted. Approve now?",
      "transitions": { "approve": "approved", "request_changes": "needs_revision" }
    },
    "approved": {}
  },
  "specialists": [
    { "role": "proposer", "specialistId": "ai-proposer", "strategyFnName": "firstAvailable" },
    { "role": "arbiter", "specialistId": "arbiter", "strategyFnName": "aheadByK", "threshold": 1 }
  ]
}
```

## Expected Output

```
Machine:       document-review
Initial state: pending
Goal state:    approved
Session ID:    a1b2c3d4-5678-90ab-cdef-1234567890ab

Round 1 from pending
  Proposer ai-proposer proposed: approve → approved
  Arbiter arbiter: consensus reached
  Executed: approve → approved

Session complete: approved

Total transitions: 1
Total cost: $0.00
```

## What Happened

1. A new session was created in the `pending` state
2. Specialists from the machine definition were registered
3. The decision cycle began:
   - Proposer submitted a proposal for the "approve" transition
   - With only one proposal, the arbiter found consensus immediately
   - The transition executed, moving to "approved"
4. Since "approved" is the goal state, the session completed

## Programmatic Usage

```typescript
import { runSession } from "dialai";

const machine = {
  machineName: "simple-task",
  initialState: "todo",
  goalState: "done",
  states: {
    todo: {
      prompt: "Complete the task",
      transitions: { complete: "done" }
    },
    done: {}
  }
};

const session = await runSession(machine);
console.log(session.currentState);  // "done"
console.log(session.history.length); // 1
```

## Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `machine` | `MachineDefinition` | Yes | The machine definition to run |

See [MachineDefinition](./types.md#machinedefinition) for the complete type definition.

## Return Value

Returns the completed `Session` object. See [Session](./types.md#session) for the complete type definition.

The returned session will have:
- `currentState` equal to `machine.goalState` if consensus was reached, or the state where the cascade was exhausted
- `history` containing all transitions that occurred
- Cost tracking totals (if specialists reported costs)

## Behavior

1. Creates a session in `machine.initialState`
2. If `machine.specialists` is provided, registers those specialists
3. Otherwise, registers a built-in deterministic proposer (picks first transition)
4. Runs the proposal solicitation:
   - Solicits proposals from all enabled proposers, checks consensus after each
   - If no consensus: returns session (exhausted, waiting for human)
   - If consensus: executes the winning transition
5. Returns the session (completed or waiting for human)

## Error Cases

| Error | Cause |
|-------|-------|
| `Invalid machine definition` | Missing required fields |
