---
name: dial-run-machine
description: Run a DIAL state machine from the CLI. Use when executing a machine definition JSON file.
argument-hint: "<machine.json>"
---

# Run a DIAL State Machine

Execute a state machine definition and run it to completion.

## Command

```bash
npx dialai <path-to-machine.json>
```

## Examples

**Basic execution**:
```bash
npx dialai examples/code-review.json
```

## Expected Output

```
Machine:        code-review
Initial state:  draft
Goal state:     approved
Final state:    approved
Session ID:     a1b2c3d4-...
```

## What Happens

1. DIAL creates a session from the machine definition
2. Registers all specialists defined in the machine
3. Runs decision cycles (Propose, Arbitrate, Execute)
4. Terminates when `goalState` is reached

## Common Issues

| Problem | Solution |
|---------|----------|
| `Machine definition invalid` | Validate JSON with `cat machine.json \| jq .` |
| `ANTHROPIC_API_KEY not set` | Export your API key: `export ANTHROPIC_API_KEY=sk-...` |
| Machine exits immediately | Check for deterministic specialists auto-approving |
