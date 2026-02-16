---
sidebar_position: 5
---

# Arbitration

The **arbiter** is the orchestrator of every decision cycle. It solicits contributions from specialists, maintains the unified consensus score, and declares consensus when one transition demonstrates a clear margin of superiority.

## The Arbiter as Orchestrator

The arbiter is a fully deterministic, built-in component — never an AI model or a human. It drives the decision cycle by:

1. **Soliciting** proposers, then selection voters, then pairwise voters — at a steady pace
2. **Validating** proposals — rejecting invalid transitions
3. **Clustering** proposals by transition — combining support for the same transition
4. **Computing** the consensus score continuously as contributions arrive
5. **Declaring consensus** when the margin threshold is met
6. **Blocking** for human input when all specialists are exhausted without consensus
7. **Self-healing** when anomalies occur (re-enabling disabled specialists)

The arbiter does not wait for all responses before evaluating. It re-evaluates after every contribution.

## The Unified Consensus Score

### How It Works

Every specialist contribution adds to the score of the **transition** it supports. The contribution amount is the specialist's **alignment score** — a measure of how often their past choices matched the human's.

```
score(T) = Σ alignment_i × support_i(T)
```

Where:
- `T` is a transition (e.g., "approve", "reject", "request_changes")
- `alignment_i` is specialist *i*'s alignment score (0.0 to 1.0)
- `support_i(T)` is 1 if specialist *i* supports transition T, 0 otherwise (0.5 each for BOTH votes)

### Margin of Superiority

The arbiter doesn't just look at which transition has the highest score. It measures how far the **leader** is ahead of the **runner-up**, normalized by total alignment in play:

```
margin = (score(leader) − score(runner_up)) / Σ alignment_i
```

Consensus is reached when:

```
margin ≥ consensus_threshold
```

The **consensus threshold** is controlled by the **risk dial**, a state-level parameter between 0.0 and 1.0:
- **threshold = 1.0**: Maximum caution. Requires overwhelming superiority. Practically guarantees human involvement.
- **threshold = 0.5**: Moderate. The leader must have roughly twice the support of the runner-up.
- **threshold = 0.1**: Aggressive. A modest lead is sufficient.
- **threshold = 0.0**: Any lead counts. Fastest delegation, lowest safety margin.

### Worked Example

Three proposers submit proposals for a code review task. Two propose "approve" and one proposes "request_changes":

| Specialist | Transition | Alignment |
|------------|-----------|-----------|
| Proposer A (GPT-4) | approve | 0.85 |
| Proposer B (Claude) | approve | 0.78 |
| Proposer C (Llama) | request_changes | 0.45 |

Scores after proposals:
- **approve**: 0.85 + 0.78 = **1.63**
- **request_changes**: 0.45

```
margin = (1.63 − 0.45) / (0.85 + 0.78 + 0.45)
       = 1.18 / 2.08
       = 0.567
```

With `consensus_threshold = 0.5`: ✅ Consensus reached on "approve".

No voters were solicited — proposals alone were sufficient.

## Proposal Clustering

Proposals are grouped by **transition**, not by individual proposal. If two proposers both select "approve," they are supporting the same outcome, even if their reasoning differs.

This is critical for the consensus score: the question isn't "which proposal is best?" but "which transition has the most support from aligned specialists?"

When proposals target the same transition with semantically similar reasoning, their alignment scores **combine**. This means:
- Two moderately-aligned specialists proposing the same transition can outweigh one highly-aligned specialist proposing a different one
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

If re-enabling proposers doesn't resolve the issue (no valid proposals from anyone), the arbiter escalates:

1. Re-enable all disabled **selection voters** and proceed to selection voting
2. If still no consensus, re-enable all disabled **pairwise voters** and proceed to pairwise voting
3. If still no consensus, block for human intervention

```
Invalid from sole proposer
  → Re-enable all proposers
    → Still stuck? Re-enable all selection voters
      → Still stuck? Re-enable all pairwise voters
        → Still stuck? Block for human
```

This ensures that pruning is aggressive in the happy path but cannot create permanent dead ends. The arbiter can always recover by broadening the specialist pool.

## Alignment Score Updates

After every human-forced decision, the arbiter updates alignment scores for all specialists who participated in that round:

```
alignment = matching_choices / total_comparisons
```

A "matching choice" means the specialist's proposal or vote aligned with the transition the human ultimately chose. Over time, this simple fraction converges on each specialist's reliability at predicting human judgment.

### Why Alignment = 0 Blocks Consensus

At cold start, every AI specialist has alignment = 0.0. This means:
- Every proposal contributes 0 to the consensus score
- Every vote contributes 0 to the consensus score
- The margin of superiority is always 0/0 (undefined, treated as 0)
- Consensus is impossible without human participation

This is the designed behavior: the system cannot delegate until humans have provided enough ground truth to calibrate alignment scores. Delegation is *earned*, not configured.

## Configuring the Risk Dial

The risk dial is the primary configuration knob for each state:

| Setting | Behavior | Use When |
|---------|----------|----------|
| **High (0.8–1.0)** | Requires near-unanimous aligned support | High-stakes, irreversible decisions |
| **Moderate (0.4–0.6)** | Balanced deliberation | Standard decisions with adequate training data |
| **Low (0.1–0.3)** | Quick consensus from aligned specialists | Low-stakes, reversible decisions |
| **Zero (0.0)** | Any aligned support wins | Testing, development only |

The threshold can be set at the **machine level** (applies to all states) or **per-state** (overrides the default for specific decision points).

## Best Practices

### 1. Start with a High Threshold

Begin with `consensus_threshold` near 1.0. This forces human participation, which generates exemplars and calibrates alignment. Lower the threshold only after alignment scores demonstrate reliable human prediction.

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
