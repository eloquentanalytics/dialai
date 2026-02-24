---
sidebar_position: 5
---

# Progressive Collapse

This guide walks through the complete journey from cold start to collapsed execution — the exact algorithms, worked examples, and cost data at every stage. For the high-level overview, see the [Core Concepts](/docs/concepts/intro).

## Stage 0: The Decision Cycle

Every round at every state is orchestrated by the **arbiter** — a deterministic, built-in component. The arbiter is **asynchronous by nature**. It solicits proposals from all enabled proposers at a steady pace and maintains a **proposal count per transition** that updates continuously as contributions arrive.

### Core Algorithm: Alignment Margin

Every proposal is an endorsement of its transition, weighted by the proposer's alignment score. The arbiter groups proposals by **transition** and scores each group by the **sum of alignment scores**. If two proposers both chose the same transition, their alignment scores combine.

Consensus is reached when the alignment-weighted margin exceeds the threshold:

```
groupScore(T) = sum(alignmentScore for each proposer endorsing T)
margin = (leaderScore − runnerUpScore) / totalAlignment
consensus when: margin >= threshold
```

The **consensus threshold** is a float (0–1). Higher = "more alignment-weighted dominance required." Setting threshold = 1 requires unanimity — all proposals must agree on the same transition.

### The Solicitation Flow

The arbiter works through these steps, checking for consensus after every arriving proposal:

1. **Soliciting Proposals** — The arbiter calls `submitProposal` on each enabled proposer. Proposals arrive asynchronously. As each valid proposal arrives, the arbiter clusters it by transition, updates the alignment-weighted score, and checks the margin against the threshold. If proposers all chose the same transition, the group score grows — consensus when the margin exceeds the threshold.

2. **Exhausted — Waiting for Human** — The arbiter has solicited every enabled proposer. No transition's lead crossed the threshold. The task blocks until a human submits a proposal, which always wins immediately, creating ground truth and generating new alignment data.

**Humans participate throughout, not just at the end.** While the arbiter is working through its sequence, humans can submit proposals at any time. A human proposal always wins — it bypasses the alignment margin tally entirely and short-circuits the process.

### Proposal Clustering

If two highly-aligned proposers both chose the same transition with nearly identical reasoning, the arbiter clusters them as supporting the same outcome. Their proposals count together for that transition. But this is not necessarily strong consensus — it could be either proposal. Over time, two specialists that always produce identical proposals are **redundant**, and one should be pruned. You're paying twice for the same answer.

### Validation and Self-Healing

The arbiter **validates every proposal** as it arrives. Invalid proposals are rejected, not counted. If the only enabled proposer submits an invalid proposal, the arbiter re-enables all disabled proposers and solicits them. If re-enabling proposers still can't produce consensus, it blocks for the human. This self-healing ensures pruning never creates a blind spot.

### Key Insight: Cost Scales with Difficulty

Easy decisions resolve quickly — aligned proposers agree on the same transition, the lead reaches k, done. Harder decisions block for the human. Over time, as specialists improve through exemplar-driven few-shot learning, more decisions resolve from proposals alone, and the system gets cheaper automatically.

## Stage 1: Cold Start

**Day 0.** A state machine is defined with states, transitions, and decision prompts. AI specialists are registered as proposers. The arbiter is always present. A human is available as the ultimate authority.

| Component | Status |
|-----------|--------|
| Proposers | 3 (all enabled) |
| Arbiter | Orchestrating |
| Human | Required when proposers disagree |
| Alignment Data | None |

The first round begins. The arbiter solicits all enabled proposers. The responses come back — two say `approve`, one says `reject`. The arbiter validates all three. It clusters them by transition: two proposals for "approve," one for "reject."

But at cold start, all alignment scores are 0 — `totalAlignment = 0`. **The system blocks for human input.** Alignment data is required for the margin to be computed, so no consensus is possible until human decisions have established alignment baselines.

> **Cold start always blocks.** The alignment-weighted margin requires at least some alignment evidence. The first human decisions generate exemplars and start building alignment scores. Once alignment data exists, consensus becomes possible.

## Stage 2: The Human Decides

The human reviews the proposals. All are visible — the transition each proposer chose, their reasoning, and their structured metadata. The human reads them and decides: `reject` is the right call — there's a factual error the proposer caught.

The human submits a proposal for "reject." A human proposal always wins immediately.

Three things happen when the human submits:

**1. The transition executes.** The session moves to the next state. The decision cycle is complete.

**2. An exemplar is created.** The full context available to the proposers at that moment — the state, the prompt, the session history — along with the human's chosen transition, reasoning, and metadata, is captured as an exemplar. This is ground truth: "given this situation, the human chose this."

**3. Alignment scores begin.** Every specialist's most recent proposal is compared to the human's choice. Did the proposer choose the same transition? Each comparison is recorded.

### Alignment Measurement

Alignment is computed using the **Wilson score lower bound** — the lower bound of a 95% confidence interval for the true match rate:

```
alignmentScore = wilsonLowerBound(matchingChoices, totalComparisons, z=1.96)
```

After round 1, a proposer that chose the same transition as the human has alignment ~0.21 (Wilson lower bound of 1/1, not 1.0). A proposer that chose differently has 0.0. The Wilson score naturally penalizes small samples — confidence requires multiple observations. After 19 matches out of 20, alignment is ~0.85. Alignment scores inform pruning decisions and weight consensus calculations.

## Stage 3: The Calibration Loop

The session loops back to the same state (or hits the same state in a new session). The same decision cycle runs again. Proposers propose, if they agree the system proceeds, if they disagree the system blocks for the human. This repeats.

But now something is different: the specialists have **exemplars** in their context. When the proposers are solicited, their context includes: "In a similar situation, the human chose `reject` because of a factual error." This is few-shot learning from human ground truth — and it makes the specialists better at predicting what the human would choose.

After 20 rounds, alignment scores have accumulated:

| Specialist | Role | Alignment |
|-----------|------|-----------|
| GPT-4o-mini | Proposer | 18/20 — alignment 0.70 |
| Llama-3-8B | Proposer | 12/20 — alignment 0.39 |
| Claude-3.5-sonnet | Proposer | 19/20 — alignment 0.76 |

Patterns are emerging. GPT-4o-mini and Claude-3.5-sonnet almost always propose what the human would choose. Llama-3-8B is wrong 40% of the time.

> **The exemplar flywheel.** Each human decision creates an exemplar. Each exemplar improves specialist context. Better context leads to better proposals. Better proposals mean faster consensus (proposers agree more often). The human is building the training data for their own replacement at this task — one decision at a time.

## Stage 4: Autonomous Consensus

As specialists improve through exemplar-driven learning, they agree more often. When all three proposers choose the same transition, consensus is immediate from proposals alone.

**Round 21 begins.** The arbiter solicits all enabled proposers. All three propose "approve." Their alignment scores (e.g., 0.85, 0.72, 0.31) all flow into one group. With no runner-up, the margin is 1.0 — well above the default threshold of 0.5. Consensus declared from proposals alone. No human needed.

**But what about rounds where they disagree?** Say two propose "approve" (alignment 0.85 + 0.72 = 1.57) and one proposes "reject" (alignment 0.31). totalAlignment = 1.88. margin = (1.57 - 0.31) / 1.88 = 0.67. With threshold=0.5: 0.67 >= 0.5. Consensus on "approve."

With threshold=0.8: margin 0.67 < 0.8. No consensus. Block for human. The higher threshold demands stronger alignment-weighted agreement.

### What Changed

The algorithm didn't change. The threshold didn't change. What changed is that specialists **improved through exemplar-driven learning** — they agree more often because they've seen what the human would choose. Consensus gets easier because the proposers converge on the same answer.

## Stage 5: Pruning

After 50 rounds, the alignment data is conclusive. Some specialists are consistently useful. Others are not. Pruning doesn't delete specialists — it **disables** them. They remain registered, with their alignment history intact. The arbiter can re-enable them at any time.

| Specialist | Alignment (Wilson) | Action |
|-----------|----------------------|--------|
| GPT-4o-mini (proposer) | alignment 0.81 | Enabled |
| Llama-3-8B (proposer) | alignment 0.44 | Disabled — proposals frequently wrong |
| Claude-3.5-sonnet (proposer) | alignment 0.87 | Enabled |

### Pruning Criteria

- **Low alignment** — frequently disagrees with human choices. Their proposals add noise.
- **Redundant** — always agrees with another specialist who has equal or better alignment. Two highly-aligned proposers that consistently choose the same transition aren't providing deliberation — they're providing duplication.

Disabled specialists stop receiving requests (and stop costing money), but they remain available for re-enablement.

With fewer proposers, each round costs less. And because the remaining proposers tend to agree, consensus is reached quickly.

### Automatic Re-enablement on Failure

If the sole enabled proposer submits an **invalid proposal**, the arbiter detects the problem: it has zero valid proposals and cannot proceed. It automatically re-enables all disabled proposers for this round, solicits them, and tries again. If re-enabled proposers reach consensus, great — but the pruning clock resets. If they still can't agree, the arbiter blocks for the human.

> **Cost reduction is dramatic.** Cold start: 3 proposals per round. After pruning: 1–2 proposals per round. Same quality. Lower cost.

## Stage 6: The Champion Emerges

After 100 rounds, Claude-3.5-sonnet has alignment 0.90 (96/100 match rate). Its proposals have been accepted in 47 of the last 50 rounds (alignment 0.84) without human intervention. It is the **champion** — the specialist that best predicts what the human would choose at this state.

The arbiter enters **champion mode**:

- The arbiter solicits only Claude-3.5-sonnet (the sole enabled proposer). With a single proposal and no competing proposals, it is auto-approved immediately.
- The human participates every 50 rounds as a spot-check, generating new exemplars and feeding the trip line.
- If the champion submits an invalid proposal, the arbiter immediately re-enables all disabled proposers and escalates.

### Champion Selection

The arbiter selects the champion: the proposer with the highest alignment score that exceeds `CHAMPION_THRESHOLD = 0.8`. If no proposer qualifies, the arbiter stays in full solicitation mode. Champion status is not permanent — the arbiter re-evaluates continuously.

## Stage 7: Collapsed Execution

After several hundred rounds, the system reaches its most efficient state. The champion's prompt has been optimized through iterative exemplar-driven learning — reviewing cases where it diverged from the human and revising its approach. The exemplar corpus is large and high-quality.

Optionally, the exemplar corpus is used to **fine-tune a smaller, cheaper model** — like Llama-3-8B or even Llama-7B — purpose-built for this specific decision at this specific state. The fine-tuned model is registered as a new specialist, tested against human choices, and if its alignment matches or exceeds the champion, it replaces the champion at a fraction of the cost.

**This is the collapsed state.** What began as a multi-specialist, fully-deliberated, human-required process has collapsed into a single function call. One model, one prompt, one decision. The arbiter still orchestrates every round — it just doesn't need to escalate. All other specialists remain registered but disabled.

> **The economics.** Cold start cost: ~$0.015/decision (3 LLM calls + human time). Collapsed cost: ~$0.0001/decision (1 cheap LLM call). For a decision made 1,000 times/month, that's a reduction from $15/month + human salary to $0.10/month + one human spot-check per month.

## Safety: The Trip Line

The collapsed state is not permanent. The arbiter continuously monitors the system and enforces two safety mechanisms: **the trip line** (alignment degradation over time) and **automatic re-enablement** (immediate response to invalid proposals).

### Alignment Degradation

The human still participates periodically — every 50 or 100 rounds — and each participation is scored. If the champion's recent alignment drops below `CHAMPION_THRESHOLD` (0.8), the **trip line fires**.

Why would alignment drop?

- **The domain shifted.** New policies, new content types, new edge cases that the exemplar corpus doesn't cover.
- **The model changed.** The upstream model provider updated the model (fine-tuned models are immune to this, but API-based models are not).
- **The humans changed.** New team members with different judgment, or evolving standards.

When the trip line fires, the arbiter reverts to a more deliberative configuration. Disabled specialists are re-enabled. Human participation increases. New alignment data is collected. The calibration loop begins again — but faster, because the exemplar corpus and prompt optimizations are retained.

### Trip Line Mechanism

Track the champion's alignment over the last N human-participated rounds (e.g., N=10). If alignment drops below `CHAMPION_THRESHOLD` (0.8), the arbiter reverts: re-enables disabled specialists, increases human participation frequency. The revert is automatic and immediate.

### Immediate Self-Healing

The trip line handles gradual drift. But what about a single bad proposal in a collapsed system? The arbiter handles this in real-time:

1. **Re-enable all proposers** — The champion submitted an invalid proposal. The arbiter re-enables all disabled proposers, solicits them. If a valid proposal reaches consensus, it is accepted.
2. **Block for human** — All proposers re-enabled, still no consensus. The system is back to its fully-deliberative state.

> **Autonomy is a lease, not a grant.** The champion earned its position through demonstrated alignment. One invalid proposal reverts to full solicitation. One period of degraded alignment triggers the trip line. The arbiter ensures the system never silently drifts away from human judgment — and never gets stuck because it pruned too aggressively.
