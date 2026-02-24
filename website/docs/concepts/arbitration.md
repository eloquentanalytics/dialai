---
sidebar_position: 5
---

# Arbitration

The **arbiter** is the orchestrator of every decision cycle. It solicits proposals from specialists, scores endorsements per transition using alignment-weighted margins, and declares consensus when one transition's margin exceeds the configured threshold.

## The Arbiter as Orchestrator

The arbiter is a fully deterministic, built-in component — never an AI model or a human. It drives the decision cycle by:

1. **Soliciting** proposers at a steady pace
2. **Validating** proposals — rejecting invalid transitions
3. **Clustering** proposals by transition — combining endorsements for the same transition
4. **Scoring** proposals per transition using alignment-weighted margins as contributions arrive
5. **Declaring consensus** when the alignment-weighted margin exceeds the threshold
6. **Blocking** for human input when all specialists are exhausted without consensus
7. **Self-healing** when anomalies occur (re-enabling disabled specialists)

The arbiter does not wait for all responses before evaluating. It re-evaluates after every contribution.

## Ahead-by-k Consensus

### How It Works

Every proposal is an endorsement of a transition. The arbiter groups proposals by transition, scores each group by the **sum of proposer alignment scores**, and computes an alignment-weighted margin between the leader and runner-up.

### The Alignment-Weighted Margin

Consensus is evaluated as follows:

1. **Group** proposals by `transitionName`
2. **Score** each group: `groupScore = sum(alignmentScore for each proposer in group)`
3. **Compute margin**: `margin = (leaderScore - runnerUpScore) / totalAlignment`
4. **Consensus** when `threshold < 1` and `margin >= threshold`

Special cases:
- **Single proposal** with `threshold < 1`: auto-approved (no competing proposals needed)
- **Threshold = 1**: disables all auto-approval — human must always decide
- **Cold start** (`totalAlignment = 0`): always blocks for human input — alignment data is required for consensus

The threshold is a float (default 0.5), not an integer:
- **threshold = 0.5** (default): A moderate alignment-weighted lead is sufficient
- **threshold = 0.7**: Requires a stronger margin — more confidence needed
- **threshold = 1.0**: Human-only mode — no auto-approval possible

### Worked Example

Three proposers submit proposals for a code review task. Two propose "approve" and one proposes "request_changes":

| Specialist | Transition | Alignment Score |
|------------|-----------|-----------------|
| Proposer A (GPT-4) | approve | 0.72 |
| Proposer B (Claude) | approve | 0.85 |
| Proposer C (Llama) | request_changes | 0.31 |

Scores after grouping:
- **approve**: 0.72 + 0.85 = 1.57
- **request_changes**: 0.31
- **totalAlignment**: 0.72 + 0.85 + 0.31 = 1.88

```
margin = (1.57 - 0.31) / 1.88 = 0.67
```

With `threshold = 0.5`: ✅ Consensus reached on "approve" (0.67 >= 0.5). The winning proposal is from Proposer B (highest alignment in the winning group).

## Proposal Clustering

Proposals are grouped by **transition**, not by individual proposal. If two proposers both select "approve," they are supporting the same outcome, even if their reasoning differs.

This is critical for the consensus score: the question isn't "which proposal is best?" but "which transition has the most support from aligned specialists?"

When proposals target the same transition, their alignment scores **add up** for that transition's group score. This means:
- Two highly-aligned specialists proposing the same transition create a large group score, making consensus more likely
- A single low-alignment specialist proposing a different transition has little weight against them
- Clustering prevents spurious competition between specialists who agree on the outcome

## Self-Healing

The arbiter monitors for situations where pruning has reduced the specialist pool too aggressively.

### Invalid Proposal from Sole Proposer

If only one proposer is enabled and it submits an invalid proposal (proposing a transition that doesn't exist in the current state):

1. The arbiter **re-enables all disabled proposers** for this round
2. Solicits new proposals from the re-enabled pool
3. If valid proposals now arrive, consensus evaluation proceeds normally
4. The pruning analysis would need to start fresh for proposers

### Cascading Re-enablement

If re-enabling proposers doesn't resolve the issue (no valid proposals from anyone), the arbiter blocks for human intervention.

```
Invalid from sole proposer
  → Re-enable all proposers
    → Still stuck? Block for human
```

This ensures that pruning is aggressive in the happy path but cannot create permanent dead ends. The arbiter can always recover by broadening the specialist pool.

## Alignment Score Updates

After every human-forced decision, the arbiter updates alignment scores for all specialists who participated in that round using the **Wilson score lower bound**:

```
alignmentScore = wilsonLowerBound(matchingChoices, totalComparisons, z=1.96)
```

This is the lower bound of a 95% confidence interval for the true match rate, not a simple fraction. It naturally penalizes small sample sizes: a specialist with 1 match out of 1 comparison gets an alignment score of ~0.21 (not 1.0). Confidence grows with evidence — a specialist with 19/20 matches scores ~0.85.

A "matching choice" means the specialist's proposal aligned with the transition the human ultimately chose.

### Cold Start

At cold start, when no alignment data exists (`totalAlignment = 0`), the system **always blocks for human input**. Alignment data is required for the alignment-weighted margin to be computed — without it, no consensus is possible. This ensures the system cannot delegate decisions before any alignment evidence has been collected.

As human decisions accumulate and alignment scores grow, the margin calculation becomes meaningful and consensus becomes possible.

## Configuring the Consensus Threshold

The threshold is a float between 0 and 1, resolved with this priority: **state > machine > arbiter > 0.5**.

| Setting | Behavior | Use When |
|---------|----------|----------|
| **0.3** | Low bar — modest alignment-weighted lead is enough | Low-stakes, high-throughput decisions |
| **0.5** (default) | Moderate lead required | Standard decisions |
| **0.7** | Strong lead required | Important decisions needing high confidence |
| **1.0** | Human-only — no auto-approval | Highest-stakes decisions, audit requirements |

The threshold can be set at the **machine level** (applies to all states) or **per-state** (overrides the default for specific decision points).

## Best Practices

### 1. Start with a High Threshold

Begin with a higher threshold (e.g., 0.8 or 1.0). This requires a stronger alignment-weighted margin before auto-approval, which increases the likelihood of human participation, generates exemplars, and calibrates alignment. Lower the threshold only after alignment scores demonstrate reliable human prediction.

### 2. Monitor the Margin

The consensus margin tells you how "confident" the system is. A margin just barely above the threshold suggests the decision was close; a large margin suggests strong agreement.

### 3. Watch for Redundancy

If two specialists always support the same transition with similar alignment scores, one may be redundant. Disabling the redundant specialist reduces cost without losing signal.

### 4. Use the Trip Line

If a champion specialist's alignment degrades (e.g., the human distribution shifts), the trip line fires: the threshold effectively rises because the specialist's alignment has dropped, making consensus harder to reach. This naturally increases human participation until alignment is re-established.

## Related Concepts

- [Decision Cycle](./decision-cycle.md): How the arbiter drives the cycle
- [Specialists](./specialists.md): The actors contributing to consensus
- [Human Primacy](./human-primacy.md): Why humans override when consensus fails
- [Consensus Strategies](./consensus-strategies.md): Alternative strategies and configuration
