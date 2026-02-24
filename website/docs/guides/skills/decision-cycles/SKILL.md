---
name: dial-decision-cycles
description: Understand DIAL decision cycles. Use when learning how Propose, Arbitrate, Execute works.
user-invocable: false
---

# Decision Cycles

The repeating process that drives state transitions.

## The Cycle

```
Propose -> Arbitrate -> Execute -> (repeat)
```

Each cycle attempts to move the session from one state to another.

## Phases

### 1. Propose

Each registered proposer submits a transition proposal.

**What proposers receive**:
- Current state
- Available transitions
- Transition prompts
- Session history

**What proposers return**:
- Action name (e.g., `approve`, `reject`)
- Target state
- Reasoning

### 2. Arbitrate

The arbiter evaluates consensus using alignment margin.

**How it works**: Proposals are endorsements. The arbiter counts endorsements and applies the alignment margin threshold to determine consensus. Human proposals always win.

**Human primacy**: When proposals don't produce consensus, only a human specialist can force a decision via `submitArbitration`.

### 3. Execute

If consensus is reached, the winning transition is applied.

**What happens**:
- Session state updates to the target state
- TransitionRecord added to session.history
- Next cycle begins (or session completes if goal reached)

## Watching the Cycle

```bash
npx dialai machine.json --verbose
```

Verbose output shows:
```
[PROPOSE] ai-proposer: approve -> approved
[PROPOSE] ai-proposer-2: reject -> draft
[ARBITRATE] consensus reached: approve (alignment margin)
[EXECUTE] draft -> approved
```

## No Consensus

If proposals don't produce consensus:
- The cycle repeats
- New proposals are solicited
- Different proposals may emerge

Configure max cycles to prevent infinite loops:
```json
{
  "arbiter": {
    "strategy": "alignment margin",
    "maxCycles": 5
  }
}
```

## Session Completion

The session ends when:
- Current state equals `goalState` (success)
- Max cycles exceeded (failure)
- No valid transitions available (stuck)
