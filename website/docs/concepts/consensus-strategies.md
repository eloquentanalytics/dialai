---
sidebar_position: 12
---

# Consensus Strategies

DIAL's consensus mechanism is **Ahead-by-k** — a simple counting approach where each proposal acts as an endorsement of its transition. The first transition to pull ahead of all others by k endorsements wins. DIAL also ships with `firstProposal` as a convenience strategy for testing and single-proposer setups.

## Overview

In DIAL, every proposal is an endorsement. When a specialist proposes a transition, that counts as one endorsement for that transition. There is no separate evaluation or scoring step — the proposals themselves are the signal.

Consensus is reached when one transition has accumulated k more endorsements than any other transition. The winning proposal is the **first proposal submitted** for the winning transition.

## `aheadByK` *(Default)*

The default strategy. Each proposal endorses a transition. The arbiter counts endorsements per transition. Consensus is reached when one transition leads all others by at least k endorsements.

### When to Use

- **Always**, unless you have a specific reason to use `firstProposal`
- Production systems with multiple specialists
- Any scenario where progressive collapse is desired
- When you want the system to naturally converge as specialists are pruned

### How It Works

#### Step 1: Count Endorsements Per Transition

As proposals arrive, the arbiter counts how many proposals endorse each transition:

```
endorsements(T) = number of proposals for transition T
```

Every proposal adds exactly one endorsement to its transition.

#### Step 2: Calculate Lead

```
lead = endorsements(leader) - endorsements(runner_up)
```

The lead is the difference in endorsement count between the most-endorsed transition and the second-most-endorsed transition.

#### Step 3: Check Threshold

```
consensus when: lead >= k
```

The parameter **k** controls how decisive the lead must be. A higher k requires more agreement before the system will act autonomously.

### Algorithm

```
function aheadByK(ctx) -> ConsensusResult:
    if len(ctx.proposals) == 0:
        return { consensusReached: false, reasoning: "No proposals" }

    # Count endorsements per transition
    endorsements = {}
    for proposal in ctx.proposals:
        T = proposal.transitionName
        endorsements[T] = endorsements.get(T, 0) + 1

    # Find leader and runner-up
    sorted_transitions = sorted(endorsements.items(), by: value, desc: true)
    leader_name, leader_count = sorted_transitions[0]
    runner_up_count = sorted_transitions[1][1] if len(sorted_transitions) > 1 else 0

    lead = leader_count - runner_up_count

    if lead >= ctx.k:
        # Winner is the first proposal submitted for the leading transition
        first_proposal = earliest_proposal(ctx.proposals, leader_name)
        return {
            consensusReached: true,
            winningProposalId: first_proposal.proposalId,
            reasoning: f"Lead {lead} >= k={ctx.k}"
        }

    return {
        consensusReached: false,
        reasoning: f"Lead {lead} < k={ctx.k}"
    }
```

### Proposal Clustering

When multiple specialists propose the same transition, their endorsements **add up**. This is a natural consequence of counting by transition: a proposal for "approve" from Specialist A and a proposal for "approve" from Specialist B both increment `endorsements("approve")`.

This has important implications:
- Two specialists agreeing on a transition move the system closer to consensus faster than one specialist alone
- Agreement among specialists is rewarded — it is a signal that the transition is correct
- Disagreement is informative — two specialists proposing different transitions keeps the lead low, surfacing genuine ambiguity

### The Cold Start Problem

When there are no proposals:
- All endorsement counts are zero
- The lead is zero, which is less than any k >= 1
- Consensus is impossible
- The system blocks for a human decision

This is intentional: the system cannot delegate until specialists begin proposing.

### Worked Example: Progressive Consensus

**Round 1** (cold start — single specialist, k=2):

| Specialist | Proposal | Endorsements for "approve" |
|-----------|----------|---------------------------|
| Specialist A | propose "approve" | 1 |

Lead = 1 - 0 = 1. Less than k=2. **Blocked.** Human forces "approve."

**Round 5** (multiple specialists agree, k=2):

| Specialist | Proposal | Endorsements for "approve" |
|-----------|----------|---------------------------|
| Specialist A | propose "approve" | 1 |
| Specialist B | propose "approve" | 2 |
| Specialist C | propose "approve" | 3 |

Lead = 3 - 0 = 3. Greater than or equal to k=2. Consensus reached. The winning proposal is Specialist A's (the first submitted for "approve").

**Round 50** (champion mode, k=1):

| Specialist | Proposal | Endorsements for "approve" |
|-----------|----------|---------------------------|
| Specialist A | propose "approve" | 1 |

All other specialists have been disabled (pruned). With k=1, a single proposal is sufficient.

Lead = 1 - 0 = 1. Equals k=1. Consensus reached immediately.

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

1. **Cold start**: No specialists or untrained specialists. Few proposals arrive. Lead stays below k. System blocks for human. Human decisions generate exemplars.
2. **Calibration**: More specialists are added. Multiple proposals per round start arriving. If specialists agree, the lead grows and consensus becomes possible.
3. **Autonomous consensus**: Specialists consistently agree on transitions. The lead reaches k quickly, and the system acts without human intervention.
4. **Pruning**: Redundant and underperforming specialists are disabled. Fewer proposals per round, but the remaining specialists agree. Cost drops.
5. **Champion**: One specialist handles the task solo. With k=1, consensus is immediate from a single proposal.
6. **Collapsed**: A fine-tuned, cheap model replaces the original specialist. Same accuracy, fraction of the cost.

The strategy never changes — the same `aheadByK` algorithm handles every stage. What changes is **how many specialists propose** and **how much they agree**.

## Related Concepts

- [Arbitration](./arbitration.md): The arbiter's role in evaluating consensus
- [Specialists](./specialists.md): How specialists participate
- [Human Primacy](./human-primacy.md): Why human gold examples are ground truth
- [Decision Cycle](./decision-cycle.md): Where consensus evaluation fits
