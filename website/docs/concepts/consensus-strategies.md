---
sidebar_position: 12
---

# Consensus Strategies

DIAL's consensus mechanism is **Ahead-by-k** — an alignment-weighted margin approach where each proposal acts as an endorsement of its transition, weighted by the proposer's alignment score. Consensus is reached when one transition's alignment-weighted margin exceeds the configured threshold. DIAL also ships with `firstProposal` as a convenience strategy for testing and single-proposer setups.

## Overview

In DIAL, every proposal is an endorsement weighted by the proposer's alignment score. When a specialist proposes a transition, their alignment score is added to that transition's group score. There is no separate evaluation or scoring step — the proposals themselves are the signal.

Consensus is reached when the leading transition's alignment-weighted margin exceeds the threshold. The winning proposal is from the **highest-alignment proposer** within the winning transition group.

## `aheadByK` *(Default)*

The default strategy. Each proposal endorses a transition, weighted by the proposer's alignment score. The arbiter groups proposals by transition, computes alignment-weighted margins, and declares consensus when the leader's margin exceeds the threshold.

### When to Use

- **Always**, unless you have a specific reason to use `firstProposal`
- Production systems with multiple specialists
- Any scenario where progressive collapse is desired
- When you want the system to naturally converge as specialists are pruned

### How It Works

#### Step 1: Group and Score by Transition

As proposals arrive, the arbiter groups them by transition and scores each group by the **sum of alignment scores**:

```
groupScore(T) = sum(alignmentScore(proposer) for each proposal endorsing T)
totalAlignment = sum(alignmentScore(proposer) for all proposals)
```

#### Step 2: Calculate Margin

```
margin = (leaderScore - runnerUpScore) / totalAlignment
```

The margin is a normalized value between 0 and 1, representing how dominant the leading transition is relative to all alignment evidence.

#### Step 3: Check Threshold

```
consensus when: threshold < 1 AND margin >= threshold
```

The **threshold** is a float (default 0.5). Higher thresholds require a more dominant lead. Setting threshold = 1 disables auto-approval entirely (human-only mode).

**Special case — single proposal**: When only one proposal exists and `threshold < 1`, consensus is immediate (no competing proposals needed).

### Algorithm

```
function aheadByK(ctx) -> ConsensusResult:
    threshold = ctx.threshold ?? 1

    if len(ctx.proposals) == 0:
        return { consensusReached: false, reasoning: "No proposals" }

    # Single proposal: auto-approve when threshold < 1
    if len(ctx.proposals) == 1 and threshold < 1:
        return {
            consensusReached: true,
            winningProposalId: ctx.proposals[0].proposalId,
            reasoning: "Single proposal with no competing proposals"
        }

    # Group proposals by transition, score by alignment
    scores = ctx.alignmentScores ?? {}
    transitionScores = {}   # { transitionName: { score, bestProposalId, bestAlignment } }
    totalAlignment = 0

    for proposal in ctx.proposals:
        alignment = scores[proposal.specialistId] ?? 0
        totalAlignment += alignment
        group = transitionScores[proposal.transitionName]
        if group:
            group.score += alignment
            if alignment > group.bestAlignment:
                group.bestAlignment = alignment
                group.bestProposalId = proposal.proposalId
        else:
            transitionScores[proposal.transitionName] = {
                score: alignment,
                bestProposalId: proposal.proposalId,
                bestAlignment: alignment
            }

    # Cold start: no alignment data → block for human
    if totalAlignment == 0:
        return { consensusReached: false, reasoning: "Cold start: no alignment data" }

    # Compute margin
    sorted = sorted(transitionScores.items(), by: score, desc: true)
    leaderScore = sorted[0].score
    runnerUpScore = sorted[1].score if len(sorted) > 1 else 0
    margin = (leaderScore - runnerUpScore) / totalAlignment

    if threshold < 1 and margin >= threshold:
        return {
            consensusReached: true,
            winningProposalId: sorted[0].bestProposalId,
            reasoning: f"Margin {margin:.2f} >= threshold {threshold}"
        }

    return {
        consensusReached: false,
        reasoning: f"Margin {margin:.2f} below threshold {threshold}"
    }
```

### Proposal Clustering

When multiple specialists propose the same transition, their alignment scores **add up** in the group score. A highly-aligned specialist's endorsement carries more weight than a poorly-aligned one.

This has important implications:
- Two highly-aligned specialists agreeing on a transition create a large margin, making consensus likely
- A single low-alignment specialist disagreeing has little impact on the margin
- Agreement among well-aligned specialists is rewarded — it reflects high-quality signal
- Disagreement among equally-aligned specialists keeps the margin low, surfacing genuine ambiguity

### The Cold Start Problem

When no alignment data exists (`totalAlignment = 0`):
- All alignment scores are zero
- The margin cannot be computed (division by zero)
- Consensus is impossible regardless of threshold
- The system blocks for a human decision

This is intentional: the system cannot delegate until alignment evidence has been collected through human decisions. Even if all specialists agree on the same transition, the system requires at least some alignment history before auto-approving.

### Worked Example: Progressive Consensus

**Round 1** (cold start — single specialist, threshold=0.5):

| Specialist | Proposal | Alignment |
|-----------|----------|-----------|
| Specialist A | propose "approve" | 0.0 |

totalAlignment = 0. **Cold start — blocked.** Human forces "approve." Alignment data begins accumulating.

**Round 5** (multiple specialists with alignment, threshold=0.5):

| Specialist | Proposal | Alignment |
|-----------|----------|-----------|
| Specialist A | propose "approve" | 0.72 |
| Specialist B | propose "approve" | 0.85 |
| Specialist C | propose "request_changes" | 0.31 |

Group scores: approve = 1.57, request_changes = 0.31. totalAlignment = 1.88.

```
margin = (1.57 - 0.31) / 1.88 = 0.67
```

0.67 >= 0.5. **Consensus reached** on "approve." Winner: Specialist B's proposal (highest alignment in the group).

**Round 50** (champion mode, threshold=0.5):

| Specialist | Proposal | Alignment |
|-----------|----------|-----------|
| Specialist A | propose "approve" | 0.92 |

Single proposal with threshold < 1. **Auto-approved immediately.**

## `firstProposal`

The simplest strategy: immediately declares consensus on the first valid proposal received. No counting, no waiting.

### When to Use

- Testing and development
- Single-proposer scenarios
- Bootstrap phase before any specialists are trained
- Deterministic pipelines where deliberation adds no value

### Algorithm

```
function firstProposal(ctx) -> ConsensusResult:
    if len(ctx.proposals) == 0:
        return { consensusReached: false, reasoning: "No proposals" }

    first = sorted(ctx.proposals, by: createdAt, ascending: true)[0]

    return {
        consensusReached: true,
        winningProposalId: first.proposalId,
        reasoning: f"First proposal wins (from {first.specialistId})"
    }
```

### Trade-offs

**Advantages:**
- Zero latency: no waiting for additional proposals
- Simple to reason about

**Disadvantages:**
- No deliberation: ignores all other proposals
- Bypasses DIAL's core value proposition

## Progressive Collapse

With `aheadByK`, progressive collapse happens naturally:

1. **Cold start**: No alignment data exists. All alignment scores are zero. System always blocks for human. Human decisions generate exemplars and alignment data.
2. **Calibration**: Alignment scores grow as human decisions accumulate. Multiple proposals per round start arriving. If well-aligned specialists agree, the margin grows and consensus becomes possible.
3. **Autonomous consensus**: Highly-aligned specialists consistently agree on transitions. The alignment-weighted margin exceeds the threshold quickly, and the system acts without human intervention.
4. **Pruning**: Redundant and underperforming specialists are disabled. Fewer proposals per round, but the remaining specialists have high alignment. Cost drops.
5. **Champion**: One specialist handles the task solo. With threshold < 1, a single proposal is auto-approved immediately.
6. **Collapsed**: A fine-tuned, cheap model replaces the original specialist. Same accuracy, fraction of the cost.

The strategy never changes — the same `aheadByK` algorithm handles every stage. What changes is **how many specialists propose**, **how aligned they are**, and **how much they agree**.

## Related Concepts

- [Arbitration](./arbitration.md): The arbiter's role in evaluating consensus
- [Specialists](./specialists.md): How specialists participate
- [Human Primacy](./human-primacy.md): Why human gold examples are ground truth
- [Decision Cycle](./decision-cycle.md): Where consensus evaluation fits
