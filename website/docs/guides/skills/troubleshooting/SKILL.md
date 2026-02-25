---
name: dial-troubleshooting
description: Debug common DIAL issues. Use when something goes wrong during execution.
---

# Troubleshooting

Diagnose and fix common DIAL issues.

## Quick Diagnostics

```bash
# Validate machine JSON
cat machine.json | jq .

# Run with verbose output
npx dialai machine.json --verbose

# Check environment
echo $ANTHROPIC_API_KEY
```

## Common Errors

### Machine Definition Invalid

**Error**: `Machine definition invalid: missing required field`

**Causes**:
- Malformed JSON syntax
- Missing required fields (`machineName`, `initialState`, `goalState`, `states`)
- State references non-existent target

**Fix**:
```bash
# Check JSON syntax
cat machine.json | jq .

# Verify structure
cat machine.json | jq '.machine.states | keys'
```

### No Proposers Registered

**Error**: `No proposers registered for session`

**Cause**: No proposers registered for the machine.

**Fix**: Add at least one proposer to the machine definition:
```json
{
  "specialists": [
    { "specialistId": "default", "role": "proposer", "strategyFnName": "firstAvailable" }
  ]
}
```
Or use `runSession` which registers a default proposer automatically.

### Transition Not Available

**Error**: `Transition 'approve' not available from state 'draft'`

**Cause**: Proposed action doesn't exist on current state.

**Fix**: Check available transitions:
```bash
cat machine.json | jq '.machine.states.draft.transitions | keys'
```

### Consensus Not Reached

**Symptom**: Cycle repeats without progress.

**Causes**:
- Proposals don't converge on a single action
- Alignment margin threshold not met

**Fix**:
- Lower the consensus threshold (e.g., `consensusThreshold: 0.5` on the machine)
- Add more proposers to increase endorsement count
- Check proposer prompts for clarity

### API Key Errors

**Error**: `ANTHROPIC_API_KEY not set` or `Invalid API key`

**Fix**:
```bash
export ANTHROPIC_API_KEY=sk-ant-...
```

Or in `.env`:
```
ANTHROPIC_API_KEY=sk-ant-...
```

### Session Completes Immediately

**Symptom**: Machine runs but exits in one cycle.

**Causes**:
- Deterministic specialist auto-approves
- Initial state has transition directly to goal

**Fix**:
- Remove deterministic specialists for real runs
- Add intermediate states

### Human Prompts Not Appearing

**Symptom**: Human specialist configured but no prompts shown.

**Cause**: Missing `--human` flag.

**Fix**:
```bash
npx dialai machine.json --human
```

## Debugging Strategies

### Verbose Mode

```bash
npx dialai machine.json --verbose
```

Shows:
- Each proposal submitted
- Consensus evaluation
- Transition execution

### Inspect Session History

```typescript
import { getSession } from 'dialai';

const session = await getSession(sessionId);
console.log(JSON.stringify(session.history, null, 2));
```

### Test with Deterministic Specialists

Replace LLM specialists with deterministic ones for predictable behavior:

```json
{
  "specialists": [
    { "specialistId": "test", "role": "proposer", "strategyFnName": "firstAvailable" }
  ]
}
```

### Check State Machine Graph

Visualize your machine:
```bash
cat machine.json | jq '.machine.states | to_entries | .[] | "\(.key) -> \(.value.transitions // {} | keys)"'
```

## Performance Issues

### Slow Execution

**Causes**:
- Slow API responses

**Fixes**:
- Use faster models for routine proposals
- Add timeout configuration

### High API Costs

**Causes**:
- Using expensive models for all specialists
- Too many decision cycles

**Fixes**:
- Use cheaper models for routine decisions
- Tune consensus threshold

## Getting Help

1. Check the [API Reference](/docs/api/createSession)
2. Review [example machines](/docs/examples/intro)
3. Open an issue on GitHub
