---
name: dial-decision-cycles
description: Understand DIAL decision cycles. Use when learning how Propose, Vote, Arbitrate, Execute works.
user-invocable: false
---

# Decision Cycles

The repeating process that drives state transitions.

## The Cycle

```
Propose -> Vote -> Arbitrate -> Execute -> (repeat)
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

### 2. Vote

Each registered voter compares proposals pairwise and votes.

**What voters receive**:
- The two proposals being compared
- Current state context
- Session history

**What voters return**:
- Which proposal they prefer (A or B)
- NEITHER if both are bad
- Confidence level

### 3. Arbitrate

The arbiter evaluates consensus using the configured strategy.

**Strategies**:
| Strategy | Behavior |
|----------|----------|
| `majority` | >50% of votes wins |
| `supermajority` | Configurable threshold (e.g., 66%) |
| `unanimous` | All voters must agree |

**Human primacy**: When consensus cannot be reached, only a human specialist can force a decision via `submitArbitration`.

### 4. Execute

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
[VOTE] ai-voter: A (approve) - confidence: 0.8
[VOTE] human-voter: A (approve) - confidence: 1.0
[ARBITRATE] consensus reached: approve
[EXECUTE] draft -> approved
```

## No Consensus

If voting doesn't produce a winner:
- The cycle repeats
- New proposals are solicited
- Different proposals may emerge

Configure max cycles to prevent infinite loops:
```json
{
  "arbiter": {
    "strategy": "majority",
    "maxCycles": 5
  }
}
```

## Session Completion

The session is at rest when:
- Current state equals `goalState` (at rest)
- Max cycles exceeded (failure)
- No valid transitions available (stuck)

Note: "goal" does not mean "over"—for cyclical workflows, the session may transition out of the goal state when new work arrives.
