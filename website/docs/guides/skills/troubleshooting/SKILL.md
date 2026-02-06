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
- Missing required fields (`id`, `defaultState`, `states`)
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

**Cause**: Machine definition has empty `specialists.proposers` array.

**Fix**: Add at least one proposer:
```json
{
  "specialists": {
    "proposers": [
      { "id": "default", "strategy": "llm", "config": { "model": "claude-sonnet-4-20250514" } }
    ]
  }
}
```

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
- Voters disagree and no majority forms
- Threshold too high for voter count
- All voters returning NEITHER

**Fix**:
- Lower threshold: `"threshold": 0.5`
- Add more voters
- Check voter prompts for clarity

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
- Each vote cast
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
  "specialists": {
    "proposers": [
      { "id": "test", "strategy": "deterministic", "config": { "action": "approve" } }
    ],
    "voters": [
      { "id": "test-voter", "strategy": "deterministic", "config": { "choice": "A" } }
    ]
  }
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
- Large number of voters (pairwise voting is O(n^2))
- Slow API responses

**Fixes**:
- Reduce voter count
- Use faster models for non-critical votes
- Add timeout configuration

### High API Costs

**Causes**:
- Using expensive models for all specialists
- Too many decision cycles

**Fixes**:
- Use cheaper models for routine decisions
- Add `maxCycles` limit
- Tune consensus threshold

## Getting Help

1. Check the [API Reference](/docs/api/create-session)
2. Review [example machines](/docs/examples)
3. Open an issue on GitHub
