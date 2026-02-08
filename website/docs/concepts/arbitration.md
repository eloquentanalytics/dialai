---
sidebar_position: 5
---

# Arbitration

**Arbitration** is the continuous process of evaluating consensus after every proposal and vote to determine when sufficient support exists to execute a transition.

## Overview

Consensus evaluation is **asynchronous and continuous**. Proposals and votes arrive in an uncontrolled, unbound manner—there is no defined order or timing. After each proposal submission and each vote cast, the arbiter re-evaluates whether any proposal has crossed the threshold:

```mermaid
graph LR
    P[New Proposal] --> A[Evaluate Consensus]
    V[New Vote] --> A
    A --> |Consensus| E[Execute Transition]
    A --> |Not Yet| W[Wait for more input]
    W --> P
    W --> V
```

The key insight is that it's not a specific point in time that decides consensus—it's the mathematics of the algorithm applied to the current state of proposals and votes.

## The Arbiter

The arbiter is always a **fully deterministic, built-in component**—never an AI model or a human. This is a deliberate safety constraint: the mechanism that decides whether consensus has been reached must be predictable and auditable.

The arbiter evaluates two things:

### 1. Guards (Deterministic)

Guards are deterministic checks that must pass before a transition can execute:

- **Proposal existence**: At least one proposal must exist for the current round
- **Ahead-by-k threshold**: The leading proposal must be ahead by `k` votes (configurable)
- **Round validity**: The round must still be active (not already completed)

Guards are pure logic—no LLM calls, no latency, no stochastic behavior.

### 2. Reasoning Synthesis (Optional)

When guards pass, the arbiter can optionally synthesize reasoning to explain the consensus decision. This reasoning is recorded in the transition history but does not affect the consensus determination.

## The Built-in Strategy: Ahead-by-K

DIAL ships with a built-in arbitration strategy that implements **ahead-by-k voting**.

### Rules

1. **Zero proposals**: No consensus

2. **One or more proposals**: Evaluate votes:
   - Tally votes per proposal (all votes count equally, including human votes)
   - The leading proposal must be ahead by `k` votes
   - A single proposal with no votes has no consensus—votes are still required

The number of proposals (1 vs. N) doesn't change the fundamental requirement: sufficient support must be demonstrated through voting. A lone proposal doesn't automatically win.

### Vote Tallying

For each vote comparing proposals A and B:

| Vote | Effect |
|------|--------|
| **A** | Adds 1 to proposal A's tally |
| **B** | Adds 1 to proposal B's tally |
| **BOTH** | Adds 1 to both proposals' tallies |
| **NEITHER** | Adds nothing to either proposal |

If all voters vote NEITHER, no proposal reaches the threshold and consensus fails.

### Example

Consider two proposals being evaluated:

- **Proposal A** ("approve"): Receives votes from Voter 1 and Voter 2. Total: 2
- **Proposal B** ("request_changes"): Receives vote from Voter 3. Total: 1

Ahead by: 2 - 1 = 1

With k = 1: Consensus is reached (margin of 1 meets the threshold)

## Human Override

When consensus isn't reached through normal voting, a human can force a decision. This is the mechanism for [Human Primacy](./human-primacy.md):

- Humans participate in voting like anyone else during normal operation
- When AI specialists cannot reach consensus, humans break the deadlock
- Only humans can force a decision—AI cannot override the process

If an AI specialist attempts to force a transition, it is rejected. This ensures that the ultimate authority rests with humans.

## Configuring the Threshold

The `aheadByK` parameter controls how much support a proposal needs:

- **k=1** (default): Quick decisions, single vote margin
- **k=2+**: More robust consensus, requires broader agreement
- Higher values slow down decisions but reduce the chance of marginal wins

The threshold can be configured at the machine level (applies to all states) or per-state (overrides the machine default for specific decision points).

## When Consensus Fails

It is entirely possible—and expected in complex scenarios—that specialists will **not** reach consensus. This is not a failure; it's a feature.

When voters are split or vote NEITHER, the system naturally surfaces the decision to a human. The inability to reach consensus indicates:

- The decision requires human judgment
- The specialists may need additional training or clearer instructions
- The problem space has genuine ambiguity that humans should resolve

This is how DIAL implements [Human Primacy](./human-primacy.md) in practice: humans don't need to monitor every decision, only the ones where specialists genuinely disagree.

## Best Practices

### 1. Start Simple

Begin with machines where decisions are straightforward. Add complexity (more proposers, higher k values) as you understand the decision landscape.

### 2. Monitor NEITHER Votes

High NEITHER rates or frequent consensus failures indicate:
- Decisions that genuinely require human judgment
- Poor proposal quality
- Unclear decision prompts
- Specialists that need additional training

### 3. Use Descriptive Reasoning

Clear reasoning in proposals and votes helps diagnose why consensus succeeds or fails.

### 4. Configure aheadByK Appropriately

Match the threshold to the stakes:
- Low-stakes, reversible decisions: k=1
- High-stakes, irreversible decisions: k=2+

## Related Concepts

- [Decision Cycle](./decision-cycle.md): Where arbitration fits
- [Specialists](./specialists.md): The actors that vote
- [Human Primacy](./human-primacy.md): Why humans override
