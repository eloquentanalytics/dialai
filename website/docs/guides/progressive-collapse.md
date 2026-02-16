---
sidebar_position: 5
---

# Progressive Collapse

This guide walks through the complete journey from cold start to collapsed execution — the exact algorithms, worked examples, and cost data at every stage. For the high-level overview, see [How It Works](/process).

## Stage 0: The Decision Cycle

Every round at every state is orchestrated by the **arbiter** — a deterministic, built-in component. The arbiter is **asynchronous by nature**. It works through a sequence of solicitations at a steady pace — first proposers, then selection voters, then pairwise voters — and maintains a **unified consensus score** that updates continuously as contributions arrive.

### Core Algorithm: Alignment-Weighted Margin of Superiority

Every contribution — a proposal, a selection vote, a pairwise win — adds the specialist's **alignment score** to the consensus score of the proposal it supports. A specialist with 0.92 alignment contributes 0.92. A specialist with 0.60 alignment contributes 0.60. A specialist with no alignment data contributes 0.

The arbiter groups proposals by **transition**. If two proposers chose the same transition with similar reasoning, their scores combine — they're supporting the same outcome.

Consensus is reached when the leading transition's score is sufficiently ahead of the runner-up:

```
margin = (score(leader) − score(runner_up)) / Σ alignment
consensus when: margin ≥ threshold
```

The **risk dial** controls the threshold. High threshold = "the lead must be decisive." Low threshold = "a modest lead is enough."

### The Solicitation Cascade

The arbiter works through these phases, checking for consensus after every arriving contribution:

1. **Soliciting Proposals** — The arbiter calls `submitProposal` on each enabled proposer. Proposals arrive asynchronously. As each valid proposal arrives, the arbiter clusters it by transition, updates the consensus score, and checks the margin. If proposers all chose the same transition, the leader's margin is 1.0 — instant consensus, no voters needed.

2. **Soliciting Selection Voters** — If proposals haven't reached consensus, the arbiter solicits enabled selection voters. Each voter sees all valid proposals and picks one. Each vote adds that voter's alignment score to the chosen proposal's consensus score. A single highly-aligned voter can swing the margin decisively.

3. **Soliciting Pairwise Voters** — If selection voting hasn't resolved it, the arbiter solicits enabled pairwise voters. Each evaluates head-to-head matchups. Pairwise wins add the voter's alignment score to the winning proposal.

4. **Exhausted — Waiting for Human** — The arbiter has solicited every enabled specialist. No proposal's margin crossed the threshold. The task blocks until a human forces a decision, creating ground truth and generating new alignment data.

**Humans participate throughout, not just at the end.** While the arbiter is working through its sequence, humans can submit proposals and votes at any time. A human's alignment is always 1.0 — they are the ground truth — so a human vote contributes the maximum possible amount to the consensus score. A human forcing a proposal bypasses the score entirely and short-circuits the process.

### Proposal Clustering

If two highly-aligned proposers both chose the same transition with nearly identical reasoning, the arbiter clusters them as supporting the same outcome. Their alignment scores combine on that transition. But this is not necessarily strong consensus — it could be either proposal. Over time, two specialists that always produce identical proposals are **redundant**, and one should be pruned. You're paying twice for the same answer.

### Validation and Self-Healing

The arbiter **validates every proposal** as it arrives. Invalid proposals are rejected, not scored. If the only enabled proposer submits an invalid proposal, the arbiter re-enables all disabled proposers and solicits them. If re-enabling proposers still can't produce valid consensus, it continues to voters. If all voters are enabled and can't resolve it, it blocks for the human. This self-healing ensures pruning never creates a blind spot.

### Key Insight: Cost Scales with Difficulty

Easy decisions resolve during proposal solicitation — aligned proposers agree on the same transition, margin = 1.0, no voting needed. Harder decisions pull in voters. The hardest decisions wait for the human. Over time, as alignment improves, more decisions resolve early, and the system gets cheaper automatically.

## Stage 1: Cold Start

**Day 0.** A state machine is defined with states, transitions, and decision prompts. AI specialists are registered: proposers that suggest which transition to take, and voters that compare proposals. The arbiter is always present. A human is available as the ultimate authority.

| Component | Status |
|-----------|--------|
| Proposers | 2 (all enabled) |
| Selection Voters | 4 (all enabled) |
| Pairwise Voters | 4 (all enabled) |
| Arbiter | Orchestrating |
| Human | Required every round |
| Alignment Data | None |

The first round begins. The arbiter starts its sequence: it calls `submitProposal` on both enabled proposers. The responses come back — one says `approve`, the other says `reject`. The arbiter validates both. It clusters them by transition: two different transitions, each supported by one proposer.

But both proposers have alignment = 0 (no history). So the consensus score for "approve" is 0. The score for "reject" is 0. The margin between leader and runner-up is 0. No proposal is clearly superior.

The arbiter moves through its sequence, soliciting the 4 enabled selection voters. They see both proposals and vote. But their alignment scores are also 0. Every vote adds 0 to the consensus score. The margin stays at 0.

The arbiter continues to the 4 enabled pairwise voters. Same story — alignment is 0, pairwise wins add 0. The margin is still 0.

The arbiter has worked through its entire sequence. Every specialist has responded. The margin never budged because every contribution was multiplied by 0 alignment. It **blocks**, waiting for the human.

> **This is by design.** With no alignment data, every specialist's contribution is zero. It doesn't matter how many agree — without demonstrated alignment with human choices, no opinion carries any score. The blocked state is the correct outcome on day 0.

## Stage 2: The Human Decides

The human reviews the proposals. Both are visible — the transition each proposer chose, their reasoning, and their structured metadata. The human reads them and decides: `reject` is the right call — there's a factual error the proposer caught.

The human **forces the arbiter** to accept the "reject" proposal. This is the human primacy override: when a human decides, the arbiter accepts it as final. No vote count can override it.

Three things happen when the human forces a decision:

**1. The transition executes.** The session moves to the next state. The decision cycle is complete.

**2. An exemplar is created.** The full context available to the proposers at that moment — the state, the prompt, the session history — along with the human's chosen transition, reasoning, and metadata, is captured as an exemplar. This is ground truth: "given this situation, the human chose this."

**3. Alignment scores begin.** Every specialist's most recent proposal or vote is compared to the human's choice. Did the proposer choose the same transition? Did the voter vote for the proposal the human picked? Each comparison is recorded.

### Alignment Measurement

```
alignment = matching choices / total comparisons
```

After round 1, a proposer that chose the same transition as the human has alignment 1/1 = 1.0. A proposer that chose differently has 0/1 = 0.0. This score directly determines how much that specialist's future proposals and votes contribute to the consensus score. High alignment = strong contribution. Zero alignment = no contribution.

## Stage 3: The Calibration Loop

The session loops back to the same state (or hits the same state in a new session). The same decision cycle runs again. Proposers propose, voters vote, the system is still blocked, the human decides. This repeats.

But now something is different: the specialists have **exemplars** in their context. When the proposers are solicited, their context includes: "In a similar situation, the human chose `reject` because of a factual error." This is few-shot learning from human ground truth — and it makes the specialists better at predicting what the human would choose.

After 20 rounds, alignment scores have accumulated:

| Specialist | Role | Alignment |
|-----------|------|-----------|
| GPT-4o-mini | Proposer | 18/20 — 90% |
| Llama-3-8B | Proposer | 12/20 — 60% |
| Claude-3.5-sonnet | Selection Voter | 19/20 — 95% |
| GPT-4-turbo | Selection Voter | 17/20 — 85% |
| Gemini-1.5-flash | Pairwise Voter | 16/20 — 80% |
| Llama-3-70B | Pairwise Voter | 14/20 — 70% |

Patterns are emerging. GPT-4o-mini almost always proposes what the human would choose. Llama-3-8B is wrong 40% of the time. Claude-3.5-sonnet is an excellent voter. Llama-3-70B adds noise.

But the system is still blocked every round because the **risk dial** is at 0.0 — the arbiter requires human participation in every round regardless of alignment data. The data is growing, but the arbiter hasn't been given permission to act on it yet.

> **The exemplar flywheel.** Each human decision creates an exemplar. Each exemplar improves specialist context. Better context leads to better proposals. Better proposals mean faster consensus once the risk dial is raised. The human is building the training data for their own replacement at this task — one decision at a time.

## Stage 4: First Autonomous Consensus

The operator reviews the alignment data. GPT-4o-mini has 0.90 alignment over 20 rounds. The data is strong enough to start testing autonomous operation. The operator raises the **risk dial** from 0.0 to 0.5 — setting the consensus threshold to 0.5. The arbiter can now declare consensus when one transition's margin of superiority reaches 0.5.

**Round 21 begins.** The arbiter solicits both enabled proposers. Let's trace the consensus score:

| Event | Score: approve | Score: reject | Margin |
|-------|---------------|--------------|--------|
| GPT-4o-mini proposes "approve" (alignment 0.90) | 0.90 | 0 | 0.90 / 1.50 = 0.60 |
| Llama-3-8B proposes "approve" (alignment 0.60) | 1.50 | 0 | 1.50 / 1.50 = 1.0 ✓ |

Both proposers chose the same transition. The arbiter clusters them as supporting "approve." Combined score: 0.90 + 0.60 = 1.50. Runner-up score: 0. Margin: 1.0 — well above the 0.5 threshold. **Consensus declared during proposal solicitation.** No voters solicited. Cost: just two proposals.

**But what about rounds where they disagree?** Say GPT-4o-mini proposes "approve" (score: 0.90) and Llama-3-8B proposes "reject" (score: 0.60). Margin: (0.90 − 0.60) / 1.50 = 0.20 — below the 0.5 threshold. No consensus yet. The arbiter continues to selection voters.

Claude-3.5-sonnet (alignment 0.95) votes for "approve." The "approve" score jumps to 0.90 + 0.95 = 1.85. Margin: (1.85 − 0.60) / 2.45 = 0.51. **Threshold crossed.** One highly-aligned voter was enough to make "approve" clearly superior. The arbiter declares consensus — no pairwise voting needed.

### What Changed

The algorithm didn't change. The threshold didn't change. What changed is that specialists **earned alignment scores** through demonstrated agreement with the human. Those scores now give their contributions real influence in the consensus score. A 0.95-aligned voter's single vote can swing the margin more than three 0.30-aligned voters combined. Consensus gets easier because the players earned the right to be heard.

## Stage 5: Pruning

After 50 rounds, the alignment data is conclusive. Some specialists are consistently useful. Others are not. Pruning doesn't delete specialists — it **disables** them. They remain registered, with their alignment history intact. The arbiter can re-enable them at any time.

| Specialist | Alignment (50 rounds) | Action |
|-----------|----------------------|--------|
| GPT-4o-mini (proposer) | 92% | Enabled |
| Llama-3-8B (proposer) | 58% | Disabled — proposals never win |
| Claude-3.5-sonnet (voter) | 96% | Enabled |
| GPT-4-turbo (voter) | 88% | Enabled |
| Gemini-1.5-flash (voter) | 82% | Disabled — redundant with above |
| Llama-3-70B (voter) | 68% | Disabled — adds noise |

### Pruning Criteria

- **Low alignment** — frequently disagrees with human choices. Their contributions barely move the consensus score. They add cost without influence.
- **Never decisive** — their vote never changes the outcome. The margin already crossed the threshold before their response arrived. They're paying for a vote that doesn't matter.
- **Redundant** — always agrees with another specialist who has equal or better alignment. Two highly-aligned proposers that consistently choose the same transition aren't providing deliberation — they're providing duplication.

Disabled specialists stop receiving requests (and stop costing money), but they remain available for re-enablement.

With one enabled proposer and two voters, each round costs a fraction of what it did at cold start. And because there's only one proposer, only one transition has any score — the margin is automatically 1.0. The arbiter can declare consensus from the proposal alone, without soliciting voters.

### Automatic Re-enablement on Failure

If the sole enabled proposer submits an **invalid proposal**, the arbiter detects the problem: it has zero valid proposals and cannot proceed. It automatically re-enables all disabled proposers for this round, solicits them, and tries again. If the re-enabled proposers reach consensus among themselves, great — but the pruning clock resets. If they still can't agree, the arbiter escalates to selection voting, then pairwise, then human. The cascade continues as normal.

> **Cost reduction is dramatic.** Cold start: 2 proposals + up to 8 votes = 10 LLM calls per round. After pruning: 1 proposal + 0–1 votes = 1–2 LLM calls per round. Same alignment quality. 80% lower cost.

## Stage 6: The Champion Emerges

After 100 rounds, GPT-4o-mini has 94% alignment. Its proposals have been accepted by the arbiter in 47 of the last 50 rounds without human intervention. It is the **champion** — the specialist that best predicts what the human would choose at this state.

The operator raises the risk dial to 0.9. The arbiter enters **champion mode**:

- The arbiter solicits only GPT-4o-mini (the sole enabled proposer). Its proposal is accepted unless a guardrail voter objects.
- One cheap enabled voter does a sanity check. If it agrees with the champion, the arbiter accepts. If it disagrees, the round is flagged for human review.
- The human participates every 50 rounds as a spot-check, generating new exemplars and feeding the trip line.
- If the champion submits an invalid proposal, the arbiter immediately re-enables all disabled proposers and escalates.

### Champion Selection

The arbiter selects the champion: the proposer with the highest alignment score that exceeds the risk dial setting. At risk=0.9, a champion needs ≥ 90% alignment. If no proposer qualifies, the arbiter stays in full deliberation mode. Champion status is not permanent — the arbiter re-evaluates continuously.

## Stage 7: Collapsed Execution

After several hundred rounds, the system reaches its most efficient state. The champion's prompt has been optimized through [counseling](/docs/concepts/intro) — specialist reflection sessions where it reviews cases where it diverged from the human and revises its approach. The exemplar corpus is large and high-quality.

Optionally, the exemplar corpus is used to **fine-tune a smaller, cheaper model** — like Llama-3-8B or even Llama-7B — purpose-built for this specific decision at this specific state. The fine-tuned model is registered as a new specialist, tested against human choices, and if its alignment matches or exceeds the champion, it replaces the champion at a fraction of the cost.

**This is the collapsed state.** What began as a 10-specialist, fully-deliberated, human-required process has collapsed into a single function call. One model, one prompt, one decision. The arbiter still orchestrates every round — it just doesn't need to escalate. All other specialists remain registered but disabled.

> **The economics.** Cold start cost: ~$0.05/decision (10 LLM calls + human time). Collapsed cost: ~$0.0001/decision (1 cheap LLM call). For a decision made 1,000 times/month, that's a reduction from $50/month + human salary to $0.10/month + one human spot-check per month.

## Safety: The Trip Line

The collapsed state is not permanent. The arbiter continuously monitors the system and enforces two safety mechanisms: **the trip line** (alignment degradation over time) and **automatic re-enablement** (immediate response to invalid proposals).

### Alignment Degradation

The human still participates periodically — every 50 or 100 rounds — and each participation is scored. If the champion's recent alignment drops below the risk dial threshold, the **trip line fires**.

Why would alignment drop?

- **The domain shifted.** New policies, new content types, new edge cases that the exemplar corpus doesn't cover.
- **The model changed.** The upstream model provider updated the model (fine-tuned models are immune to this, but API-based models are not).
- **The humans changed.** New team members with different judgment, or evolving standards.

When the trip line fires, the arbiter reverts to a more deliberative configuration. The risk dial drops. Disabled specialists are re-enabled. Human participation increases. New alignment data is collected. The calibration loop begins again — but faster, because the exemplar corpus and prompt optimizations are retained.

### Trip Line Mechanism

Track the champion's alignment over the last N human-participated rounds (e.g., N=10). If alignment drops below the risk dial threshold, the arbiter reverts: lowers the risk dial, re-enables disabled specialists, increases human participation frequency. The revert is automatic and immediate.

### Immediate Self-Healing

The trip line handles gradual drift. But what about a single bad proposal in a collapsed system? The arbiter handles this in real-time:

1. **Re-enable all proposers** — The champion submitted an invalid proposal. The arbiter re-enables all disabled proposers, solicits them. If a valid proposal reaches consensus, it is accepted.
2. **Escalate to selection voting** — If re-enabled proposers still can't produce consensus, the arbiter re-enables disabled selection voters.
3. **Escalate to pairwise voting** — If selection voting can't resolve it, the arbiter re-enables disabled pairwise voters.
4. **Block for human** — All specialists re-enabled, still no consensus. The system is back to its fully-deliberative state.

> **Autonomy is a lease, not a grant.** The champion earned its position through demonstrated alignment. One invalid proposal reverts to full deliberation. One period of degraded alignment triggers the trip line. The arbiter ensures the system never silently drifts away from human judgment — and never gets stuck because it pruned too aggressively.
