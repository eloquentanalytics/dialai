---
sidebar_position: 5
---

# Arbitration

**Arbitration** is the process of evaluating consensus and determining when a proposal has sufficient support to execute.

## Overview

After specialists submit proposals and cast votes, the `evaluateConsensus` function analyzes the results:

```mermaid
graph LR
    V[Votes] --> A[evaluateConsensus]
    P[Proposals] --> A
    A --> |Consensus| E[Execute]
    A --> |No Consensus| F[Error]
```

## The Built-in Arbiter: Weighted Ahead-by-K

DIAL ships with a built-in arbitration strategy that implements **weighted voting with human override**.

### Rules

1. **Zero proposals** — No consensus (`consensusReached: false`)

2. **Single proposal** — Auto-consensus (the lone proposal wins)

3. **Two or more proposals** — Evaluate votes:
   - If any human has voted, their choice wins immediately
   - Otherwise, tally weighted votes per proposal
   - The leading proposal must be ahead by `k = 1.0` weighted votes

### Vote Tallying

For each vote comparing proposals A and B:

| Vote | Effect |
|------|--------|
| `"A"` | Adds specialist's weight to proposal A |
| `"B"` | Adds specialist's weight to proposal B |
| `"BOTH"` | Adds specialist's weight to both proposals |
| `"NEITHER"` | Adds nothing to either proposal |

### Example

```
Proposal A: "approve"
  - Voter 1 votes A (weight 1.0)
  - Voter 2 votes A (weight 1.0)
  Total for A: 2.0

Proposal B: "request_changes"
  - Voter 3 votes B (weight 1.0)
  Total for B: 1.0

Ahead by: 2.0 - 1.0 = 1.0

k = 1.0: Consensus reached (1.0 >= 1.0)
```

### Human Override

When a human votes, the calculation short-circuits:

```
Proposal A: "approve"
  - AI Voter 1 votes A (weight 1.0)
  - AI Voter 2 votes A (weight 1.0)

Proposal B: "request_changes"
  - Human Voter votes B (weight 1.0)

Result: B wins immediately

Human primacy: AI votes don't matter when a human participates.
```

A specialist is considered "human" if their `specialistId` contains "human" (case-insensitive).

## Using evaluateConsensus

```typescript
import { evaluateConsensus } from "dialai";

const result = evaluateConsensus("session-123");

// Result shape:
// {
//   consensusReached: boolean,
//   winningProposalId?: string,
//   reasoning: string
// }
```

The `ConsensusResult` type:

```typescript
interface ConsensusResult {
  consensusReached: boolean;
  winningProposalId?: string;
  reasoning: string;
}
```

## Vote Types

Specialists can vote in four ways:

| Vote | Meaning | Impact |
|------|---------|--------|
| **A** | Prefer proposal A | +weight to A |
| **B** | Prefer proposal B | +weight to B |
| **BOTH** | Both acceptable | +weight to both |
| **NEITHER** | Both unacceptable | No weight added |

### Handling NEITHER Votes

When specialists vote NEITHER, no weight is added to either proposal. If all voters vote NEITHER, no proposal reaches the ahead-by-k threshold and consensus fails.

## The Engine's Behavior

When using `runSession`, the engine handles arbitration automatically:

1. If there's only 1 proposal (e.g., only the built-in proposer), it auto-wins
2. If there are 2+ proposals, pairwise votes are solicited from all registered voters
3. `evaluateConsensus` is called
4. If no consensus, the engine throws an error

## Best Practices

### 1. Start with Simple Machines

Begin with machines where the built-in deterministic proposer can navigate to the goal. Add additional proposers and voters as complexity grows.

### 2. Use Descriptive Reasoning

Always include clear reasoning in proposals and votes:

```typescript
// Good
{ voteFor: "A", reasoning: "Proposal A moves to done state, which is the goal" }

// Bad
{ voteFor: "A", reasoning: "A" }
```

### 3. Monitor NEITHER Votes

High NEITHER rates indicate:
- Poor proposal quality
- Unclear decision prompts
- Specialists that don't understand the task

## Related Concepts

- [Decision Cycle](./decision-cycle.md) — Where arbitration fits
- [Specialists](./specialists.md) — Voting weights
- [Human Primacy](./human-primacy.md) — Why humans override
