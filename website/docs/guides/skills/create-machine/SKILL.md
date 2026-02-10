---
name: dial-create-machine
description: Create a DIAL state machine definition. Use when defining a new decision process as JSON.
---

# Create a Machine Definition

Define a state machine for a decision process.

## Structure

```json
{
  "machineName": "unique-machine-id",
  "initialState": "start-state",
  "goalState": "end-state",
  "states": {
    "start-state": {
      "prompt": "Decision prompt?",
      "transitions": { "action": "next-state" }
    },
    "end-state": {}
  }
}
```

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `machineName` | string | Unique identifier for the machine |
| `initialState` | string | The state where sessions begin |
| `goalState` | string | The rest state where the session is headed; no action needed when reached |
| `states` | object | State definitions with transitions |

## Transition Definition

Transitions map action names to target states:

```json
{
  "transitions": {
    "approve": "approved",
    "reject": "draft"
  }
}
```

## Complete Example

```json
{
  "machineName": "document-approval",
  "initialState": "draft",
  "goalState": "approved",
  "states": {
    "draft": {
      "prompt": "Submit this document for review?",
      "transitions": {
        "submit": "review"
      }
    },
    "review": {
      "prompt": "Document meets quality standards? Approve or reject.",
      "transitions": {
        "approve": "approved",
        "reject": "draft"
      }
    },
    "approved": {}
  }
}
```

For machines with embedded specialists, see [State Machines](../../state-machines.md#full-machine-json-structure).

## Validation

Check your machine definition:
```bash
cat machine.json | jq .
```

Test with verbose output:
```bash
npx dialai machine.json --verbose
```
