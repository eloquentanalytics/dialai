---
sidebar_position: 12
---

# CLI Reference

The `dialai` command-line interface runs state machines to completion.

## Installation

```bash
npm install -g dialai
# or
npx dialai <machine.json>
```

## Usage

```bash
dialai <machine.json>
```

### Arguments

| Argument | Description |
|----------|-------------|
| `<machine.json>` | Path to a JSON file containing a machine definition |

### Environment Variables

| Variable | Description |
|----------|-------------|
| `DIALAI_BASE_URL` | Forward to remote server (e.g., `http://server:3000`) |
| `DIALAI_API_TOKEN` | Bearer token for remote authentication |

## Output

On success, the CLI prints:

```
Machine:       <machineName>
Initial state: <initialState>
Goal state:    <goalState>
Final state:   <currentState>
Session ID:    <sessionId>
```

On failure:

```
Session failed:
<error message>
```

Exit code is `0` on success, `1` on failure.

## Examples

### Run a Local Machine

```bash
# Create a machine definition
cat > task.json << 'EOF'
{
  "machineName": "simple-task",
  "initialState": "pending",
  "goalState": "done",
  "states": {
    "pending": {
      "prompt": "Should we complete this task?",
      "transitions": { "complete": "done" }
    },
    "done": {}
  }
}
EOF

# Run it
dialai task.json
```

Output:

```
Machine:       simple-task
Initial state: pending
Goal state:    done
Final state:   done
Session ID:    a1b2c3d4-5678-90ab-cdef-1234567890ab
```

### Run via Remote Server

```bash
# Start server (in another terminal)
DIALAI_PORT=3000 DIALAI_API_TOKEN=secret npx dialai --mcp

# Run machine via remote server
DIALAI_BASE_URL=http://localhost:3000 DIALAI_API_TOKEN=secret dialai task.json
```

### Multi-State Machine

```bash
cat > pipeline.json << 'EOF'
{
  "machineName": "pipeline",
  "initialState": "queued",
  "goalState": "complete",
  "states": {
    "queued": {
      "prompt": "Ready to start?",
      "transitions": { "start": "processing" }
    },
    "processing": {
      "prompt": "Processing done. Finalize?",
      "transitions": { "finalize": "complete" }
    },
    "complete": {}
  }
}
EOF

dialai pipeline.json
```

Output:

```
Machine:       pipeline
Initial state: queued
Goal state:    complete
Final state:   complete
Session ID:    ...
```

### Machine with Embedded Specialists

```bash
cat > review.json << 'EOF'
{
  "machineName": "code-review",
  "initialState": "pending",
  "goalState": "approved",
  "states": {
    "pending": {
      "prompt": "Review the code. Approve or request changes?",
      "transitions": {
        "approve": "approved",
        "request_changes": "needs_work"
      },
      "proposers": {
        "ai-reviewer": {
          "modelId": "openai/gpt-4o-mini"
        }
      },
      "voters": {
        "quality-check": {
          "strategyFn": "async (ctx) => ({ voteFor: 'A', reasoning: 'Approving' })"
        }
      }
    },
    "needs_work": {
      "prompt": "Changes made. Re-review?",
      "transitions": {
        "approve": "approved",
        "request_changes": "needs_work"
      }
    },
    "approved": {}
  }
}
EOF

dialai review.json
```

## Machine JSON Schema

The CLI accepts JSON files conforming to the `MachineDefinition` type:

```json
{
  "machineName": "string (required)",
  "initialState": "string (required)",
  "goalState": "string (required)",
  "states": {
    "<state-name>": {
      "prompt": "string (optional)",
      "transitions": {
        "<transition-name>": "<target-state>"
      },
      "proposers": {
        "<specialist-id>": {
          "strategyFn": "string (JS function)",
          "modelId": "string",
          "contextFn": "string (JS function)",
          "strategyWebhookUrl": "string",
          "contextWebhookUrl": "string",
          "webhookTokenName": "string"
        }
      },
      "voters": {
        "<specialist-id>": { /* same options as proposers */ }
      },
      "arbiter": {
        "aheadByK": "number (default: 1)"
      }
    }
  }
}
```

## Behavior

The CLI:

1. Loads the machine definition from the JSON file
2. Creates a session in the initial state
3. Registers a built-in deterministic proposer (picks the first available transition)
4. Loops until the session reaches the goal state:
   - Solicits proposals from all registered proposers
   - If 2+ proposals, solicits pairwise votes from all voters
   - Evaluates consensus
   - Executes the winning transition
5. Prints the result and exits

## Error Handling

| Error | Cause | Solution |
|-------|-------|----------|
| `Usage: dialai <machine.json>` | No file argument | Provide a machine JSON file |
| `Cannot find file: <path>` | File doesn't exist | Check the file path |
| `Invalid JSON: <message>` | Malformed JSON | Fix the JSON syntax |
| `No transitions available from current state` | Terminal state without transitions to default | Add transitions or fix machine design |
| `No consensus reached: <reason>` | Voting didn't produce a winner | Add voters or adjust aheadByK |

## Related

- [Proxy Mode](/docs/guides/proxy-mode) - Running as a server
- [State Machines](/docs/guides/state-machines) - Machine definition guide
- [Types Reference](/docs/api/types) - Complete type definitions
