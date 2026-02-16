---
sidebar_position: 11
---

# Alignment & Consensus

In DIAL, alignment measurement and voting are not separate approaches — they are **unified** in a single consensus algorithm. Every vote and every proposal is multiplied by the contributing specialist's alignment score. This page explains how they work together.

## The Unified Model

Traditional multi-agent systems treat voting and alignment measurement as distinct mechanisms:
- Voting determines which proposal wins *now*
- Alignment measurement determines which model is best *over time*

DIAL merges them. The alignment score **is** the vote multiplier. A specialist with high alignment has more influence in the consensus score; a specialist with low alignment has less. This means:

- **Alignment drives consensus**: As specialists prove reliable, their contributions carry more consensus power
- **Consensus drives alignment**: Every resolved round (especially human-forced ones) generates data for alignment measurement
- **Progressive collapse is automatic**: The same algorithm handles everything from cold start to champion mode

## How Alignment Feeds Consensus

Every specialist contribution to the consensus score is multiplied by that specialist's alignment score:

```
contribution = alignment_score × support
```

| Alignment | Consensus Impact |
|-----------|-----------------|
| 0.0 (new AI) | Contributes nothing — effectively silent |
| 0.3 (low) | Weak signal — needs others to agree |
| 0.7 (good) | Strong contribution — can tip consensus with a few allies |
| 0.9 (excellent) | Near-human influence — can often drive consensus alone |
| 1.0 (human) | Maximum influence — ground truth |

This means the consensus algorithm **self-calibrates**:
- Early on (low alignment): many specialists needed, system blocks for human often
- Over time (growing alignment): fewer specialists needed, consensus reached faster
- At convergence (high alignment): one specialist can drive consensus alone

## How Consensus Feeds Alignment

Every time a decision resolves — whether through autonomous consensus or human forcing — alignment scores are updated:

```
alignment_i = (previous matches + current match?) / (previous comparisons + 1)
```

A "match" means the specialist's proposal or vote supported the transition that was ultimately chosen (by consensus or by human forcing).

**Human-forced decisions are the primary alignment signal.** When a human forces a transition, every specialist's contribution is compared against the human's choice. This is the ground truth that calibrates the entire system.

**Autonomous consensus also provides signal**, but it is secondary. If consensus selected transition A and a specialist supported transition B, we know B didn't win, but we don't know if A was "right" until a human validates (either through the trip line mechanism or periodic spot-checks).

## When Alignment Alone Is Sufficient

In some scenarios, you can skip voting entirely and rely purely on alignment measurement:

### Direct Alignment with Exemplars

If you have reliable **exemplars** (past human decisions with context), you can compare proposals directly against them using semantic similarity:

```
similarity = semantic_similarity(proposal.reasoning, exemplar.reasoning)
```

This is the [`mostSimilar` strategy](./consensus-strategies.md#mostsimilar). It's useful for:
- States with abundant human decision history
- Model selection (finding the best model for a state)
- Fast decisions where voting overhead is undesirable

### Champion Mode

When a single specialist has alignment > 0.9 and the threshold is moderate, that specialist's proposal alone generates enough consensus score to clear the threshold. No voting is needed — the specialist's track record is sufficient proof.

This is not a separate mechanism. It's the natural outcome of the `alignmentWeightedMargin` algorithm when one specialist is highly aligned.

## When Voting Is Essential

Voting adds value when alignment scores alone don't resolve the decision:

### Ambiguous Cases
Two proposals target different transitions and neither proposer has dramatically higher alignment. Selection voters and pairwise voters provide additional signal to break the tie.

### Cold Start
All alignment scores are 0. Proposals contribute nothing to the consensus score. Voting also contributes nothing. The system blocks for human input — voting exists for when alignment *starts* to grow but isn't yet sufficient from proposals alone.

### Multiple Stakeholders
When the decision genuinely requires input from diverse perspectives, selection and pairwise voting provide structured comparison mechanisms.

### Rich Data Collection
Pairwise voting generates the richest alignment data. Each head-to-head comparison creates a detailed record of specialist preferences. In the calibration phase, more voting means faster alignment convergence.

## The Natural Progression

The unified model creates a natural progression where the role of voting changes over time:

| Phase | Alignment State | Voting Role | Human Role |
|-------|----------------|-------------|------------|
| **Cold start** | All = 0 | Contributes nothing | Forces every decision |
| **Calibration** | Growing (0.1–0.5) | Helps reach threshold | Forces most decisions |
| **Autonomous** | Moderate (0.5–0.8) | Breaks ties between proposals | Spot-checks occasionally |
| **Champion** | High (0.8+) | Rarely needed — proposals suffice | Periodic validation |
| **Collapsed** | Very high (0.95+) | Never solicited | Trip-line monitoring only |

The algorithm never changes. The alignment scores change, and the system's behavior follows.

## Pruning: Alignment-Driven Simplification

As alignment data accumulates, the system identifies specialists that can be safely disabled:

### Low Alignment
A specialist with consistently low alignment (< 0.3 after 20+ rounds) is contributing near-zero to the consensus score. Disabling it saves the cost of solicitation without meaningful impact on consensus quality.

### Redundancy
Two specialists with similar alignment scores that always support the same transition are redundant. One can be disabled — the remaining specialist provides the same signal.

### Staleness
A specialist that hasn't been solicited in many rounds (because the system reached consensus before its phase) may be contributing no value. It can be disabled to reduce the pool.

Pruning uses **disable**, not delete. Alignment history is preserved, and the [arbiter's self-healing mechanism](./arbitration.md#self-healing) can re-enable specialists if needed.

## Implementation Notes

### Alignment Score Tracking

```typescript
interface AlignmentRecord {
  specialistId: string;
  matchingChoices: number;
  totalComparisons: number;
  alignmentScore: number; // matchingChoices / totalComparisons
  lastUpdated: string;    // ISO timestamp
}
```

### Consensus Contribution

```typescript
function contributionToScore(
  specialist: Specialist,
  supportedTransition: string,
  alignment: AlignmentRecord
): number {
  return alignment.alignmentScore; // The multiplier
}
```

The simplicity is intentional. The power comes from the accumulation of contributions across many specialists, not from the complexity of any individual calculation.

## Related Concepts

- [Arbitration](./arbitration.md): The unified consensus score algorithm
- [Consensus Strategies](./consensus-strategies.md): The `alignmentWeightedMargin` algorithm
- [Human Primacy](./human-primacy.md): Why human decisions are alignment = 1.0
- [Specialists](./specialists.md): How alignment scores are earned
- [Decision Cycle](./decision-cycle.md): The arbiter's solicitation sequence
