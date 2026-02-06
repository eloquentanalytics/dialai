---
name: dial-run-machine
description: Run a DIAL state machine from the CLI. Use when executing a machine definition JSON file.
argument-hint: [machine.json] [--verbose] [--human]
---

# Run a DIAL State Machine

Execute a state machine definition and run it to completion.

## Command

```bash
npx dialai <path-to-machine.json> [options]
```

## Options

| Flag | Description |
|------|-------------|
| `--verbose` | Show each step of the decision cycle |
| `--human` | Enable human input prompts |

## Examples

**Basic execution**:
```bash
npx dialai examples/code-review.json
```

**With verbose output**:
```bash
npx dialai examples/code-review.json --verbose
```

**With human interaction**:
```bash
npx dialai examples/approval-workflow.json --human
```

## Expected Output

```
Machine:       code-review
Initial state: draft
Goal state:    approved
Final state:   approved
Session ID:    a1b2c3d4-...
```

## What Happens

1. DIAL creates a session from the machine definition
2. Registers all specialists defined in the machine
3. Runs decision cycles (Propose, Vote, Arbitrate, Execute)
4. Terminates when the goal state is reached

## Verbose Output Shows

- Each proposal submitted by proposers
- Each vote cast by voters
- Consensus evaluation results
- Transition execution details

## Common Issues

| Problem | Solution |
|---------|----------|
| `Machine definition invalid` | Validate JSON with `cat machine.json \| jq .` |
| `ANTHROPIC_API_KEY not set` | Export your API key: `export ANTHROPIC_API_KEY=sk-...` |
| Machine exits immediately | Check for deterministic specialists auto-approving |
