---
sidebar_position: 5
---

# Arbitration

The **arbiter** is the orchestrator of every decision cycle. It solicits proposals from specialists, counts endorsements per transition, and declares consensus when one transition is ahead of all others by k proposals.

## The Arbiter as Orchestrator

The arbiter is a fully deterministic, built-in component — never an AI model or a human. It drives the decision cycle by:

1. **Soliciting** proposers at a steady pace
2. **Validating** proposals — rejecting invalid transitions
3. **Clustering** proposals by transition — combining endorsements for the same transition
4. **Counting** proposals per transition continuously as contributions arrive
5. **Declaring consensus** when the ahead-by-k threshold is met
6. **Blocking** for human input when all specialists are exhausted without consensus
7. **Self-healing** when anomalies occur (re-enabling disabled specialists)

The arbiter does not wait for all responses before evaluating. It re-evaluates after every contribution.

## Ahead-by-k Consensus

### How It Works

Every proposal is an endorsement of a transition. The arbiter counts proposals per transition and declares consensus when one transition is ahead of all others by k proposals.

```
count(T) = number of proposals endorsing transition T
```

### The Ahead-by-k Rule

Consensus is reached when:

```
count(leader) − count(runner_up) ≥ k
```

Where k is the **ahead-by-k threshold**, a state-level parameter (default k=1):
- **k = 1**: A single-proposal lead is sufficient. Fast consensus when proposers agree.
- **k = 2**: The leader must be ahead by two proposals. More deliberation required.
- **k = 3+**: Higher thresholds require stronger agreement among proposers.

### Worked Example

Three proposers submit proposals for a code review task. Two propose "approve" and one proposes "request_changes":

| Specialist | Transition |
|------------|-----------|
| Proposer A (GPT-4) | approve |
| Proposer B (Claude) | approve |
| Proposer C (Llama) | request_changes |

Counts after proposals:
- **approve**: 2
- **request_changes**: 1

```
lead = count(approve) − count(request_changes) = 2 − 1 = 1
```

With `k = 1`: ✅ Consensus reached on "approve". The winning proposal is the first proposal submitted for "approve" (Proposer A's).

## Proposal Clustering

Proposals are grouped by **transition**, not by individual proposal. If two proposers both select "approve," they are supporting the same outcome, even if their reasoning differs.

This is critical for the consensus score: the question isn't "which proposal is best?" but "which transition has the most support from aligned specialists?"

When proposals target the same transition, each endorsement counts equally toward that transition's tally. This means:
- Two specialists proposing the same transition contribute two endorsements, moving closer to the ahead-by-k threshold
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

After every human-forced decision, the arbiter updates alignment scores for all specialists who participated in that round:

```
alignment = matching_choices / total_comparisons
```

A "matching choice" means the specialist's proposal aligned with the transition the human ultimately chose. Over time, this simple fraction converges on each specialist's reliability at predicting human judgment.

### Cold Start

At cold start, the ahead-by-k mechanism still functions normally — if proposers agree on a transition, consensus can be reached regardless of alignment scores. Alignment scores are tracked separately for evaluation and pruning purposes but do not affect the proposal counting mechanism.

The system blocks for human input when proposers disagree and no transition achieves the required lead.

## Configuring the Ahead-by-k Threshold

The k threshold is the primary configuration knob for each state:

| Setting | Behavior | Use When |
|---------|----------|----------|
| **k = 1** | Any single-proposal lead wins | Standard decisions, single-proposer setups |
| **k = 2** | Leader must be ahead by 2 proposals | Multi-proposer setups where some deliberation is desired |
| **k = 3+** | Requires strong agreement among proposers | High-stakes decisions with many proposers |

The threshold can be set at the **machine level** (applies to all states) or **per-state** (overrides the default for specific decision points).

## Best Practices

### 1. Start with a High Threshold

Begin with a higher k value (e.g., k=3). This requires stronger agreement among proposers, which increases the likelihood of human participation, generates exemplars, and calibrates alignment. Lower the threshold only after alignment scores demonstrate reliable human prediction.

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
