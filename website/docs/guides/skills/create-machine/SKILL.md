---
name: dial-create-machine
description: Create a DIAL state machine definition. Use when defining a new decision process as JSON.
---

# Create a Machine Definition

Define a state machine for a decision process.

## Structure

```json
{
  "machine": {
    "id": "unique-machine-id",
    "description": "What this machine does",
    "defaultState": "goal-state",
    "states": { ... }
  },
  "specialists": {
    "proposers": [...],
    "voters": [...]
  }
}
```

## Required Fields

| Field | Type | Description |
|-------|------|-------------|
| `machine.id` | string | Unique identifier for the machine |
| `machine.defaultState` | string | The goal state that ends the session |
| `machine.states` | object | State definitions with transitions |

## State Types

| Type | Meaning |
|------|---------|
| `initial` | Starting state of the session |
| `intermediate` | Normal state with outgoing transitions |
| `default` | Goal state; session completes when reached |

## Transition Definition

```json
{
  "action-name": {
    "target": "next-state",
    "prompt": "Question that guides the decision"
  }
}
```

## Complete Example

```json
{
  "machine": {
    "id": "document-approval",
    "description": "Route documents through review and approval",
    "defaultState": "approved",
    "states": {
      "draft": {
        "type": "initial",
        "transitions": {
          "submit": {
            "target": "review",
            "prompt": "Submit this document for review?"
          }
        }
      },
      "review": {
        "type": "intermediate",
        "transitions": {
          "approve": {
            "target": "approved",
            "prompt": "Document meets quality standards?"
          },
          "reject": {
            "target": "draft",
            "prompt": "Document needs revision?"
          }
        }
      },
      "approved": {
        "type": "default"
      }
    }
  },
  "specialists": {
    "proposers": [
      {
        "id": "ai-reviewer",
        "strategy": "llm",
        "config": {
          "model": "claude-sonnet-4-20250514"
        }
      }
    ],
    "voters": [
      {
        "id": "human-approver",
        "strategy": "human"
      }
    ]
  }
}
```

## Validation

Check your machine definition:
```bash
cat machine.json | jq .
```

Test with verbose output:
```bash
npx dialai machine.json --verbose
```
