---
sidebar_position: 1
---

# Core Concepts

DIAL orchestrates **specialists** — both AI and human — that compete and collaborate to navigate **state machines** through **decision cycles**. An **arbiter** drives each cycle, maintaining a unified **consensus score** that determines when one proposal is clearly superior to the rest.

## The Big Picture

### Task Specialists, Not Agents

DIAL does not guide a single agent toward completing a task. It simultaneously solicits proposals from an arbitrary number of models, prompts, and strategies — all competing at the same decision point. Each registered proposer independently analyzes the current state and suggests a transition. The arbiter maintains a running consensus score and declares a winner when the margin of superiority crosses the threshold.

This is mass simultaneous solicitation, not sequential A/B testing. Specialists are interchangeable and compete on the quality of their contributions, measured against human ground truth.

A DIAL "specialist" is scoped to a specific role in a specific decision. A proposer suggests the best transition; the arbiter orchestrates the entire process. Specialists can be AI models, webhooks, local functions, or humans.

[Learn more about Specialists →](./specialists.md)

### Sessions

A **session** is an instance of a state machine. It starts in an initial state and progresses toward a goal state through decision cycles.

[Learn more about Sessions →](./sessions.md)

### Specialists

**Specialists** are the pluggable actors that participate in sessions. They fill two roles:

| Role | Description | Can be AI? | Can be Human? |
|------|-------------|------------|---------------|
| **Proposer** | Analyzes state, suggests transitions | Yes | Yes |
| **Arbiter** | Counts proposals per transition, evaluates ahead-by-k consensus (built-in) | No | No |

Specialists can be **enabled** or **disabled**. Disabled specialists remain registered (with their alignment history intact) but stop receiving requests. The arbiter can re-enable disabled specialists when needed — for example, if an enabled proposer submits an invalid proposal.

[Learn more about Specialists →](./specialists.md)

### The Decision Cycle

When a session needs to progress, the **arbiter** works through a sequence of solicitations at a steady pace:

1. **Solicit Proposals**: Call each enabled proposer. Validate and cluster proposals by transition.
2. **Block for Human** *(if no consensus)*: All specialists have responded, no consensus. Wait for a human-forced decision.

After every arriving proposal, the arbiter re-evaluates the **consensus score**. If one transition's margin of superiority crosses the threshold, consensus is declared immediately — the arbiter doesn't wait for all responses.

[Learn more about the Decision Cycle →](./decision-cycle.md)

### The Consensus Score

Every contribution — a proposal — adds the specialist's **alignment score** to the consensus score of the transition it supports. Alignment is a simple measurement: `matching choices / total comparisons` with human ground truth.

The arbiter groups proposals by **transition** (not individual proposal). Two proposers that chose the same transition with similar reasoning are supporting the same outcome — their alignment scores combine.

Consensus is reached when the leading transition's score is sufficiently ahead of the runner-up:

```
margin = (score(leader) − score(runner_up)) / Σ alignment
consensus when: margin ≥ threshold
```

The **risk dial** controls the threshold. At 0.0, the arbiter requires human participation in every round. As the dial is raised, autonomous consensus becomes possible.

[Learn more about Arbitration →](./arbitration.md)

### Human Primacy

The fundamental principle underlying DIAL:

> **Humans have context that AI cannot access.** AI specialists are judged on their ability to predict what humans would choose. When consensus cannot be reached, only a human can force a decision.

Human alignment is always **1.0** — they are the ground truth. A human proposal always wins consensus immediately. A human forcing a proposal bypasses the score entirely.

Every human-forced decision creates an **exemplar**: a capture of the full context plus the human's choice. Exemplars are the training data that drive progressive collapse — they improve specialist context through few-shot learning and provide ground truth for alignment measurement.

[Learn more about Human Primacy →](./human-primacy.md)

### Progressive Collapse

As alignment improves, the system naturally collapses:

1. **Cold start**: All alignment = 0. Every contribution is multiplied by 0. System blocks for human.
2. **Calibration**: Humans decide, exemplars accumulate, alignment scores grow.
3. **Autonomous consensus**: Aligned specialists' contributions cross the threshold without human participation.
4. **Pruning**: Low-alignment and redundant specialists are disabled. Cost drops.
5. **Champion**: One specialist handles decisions alone with periodic human spot-checks.
6. **Collapsed**: A fine-tuned cheap model runs at a fraction of the original cost.

If alignment degrades, the **trip line** fires: the arbiter reverts to a more deliberative configuration, re-enables disabled specialists, and the calibration loop begins again.

[See the full process →](/process) · [Implementation details →](/docs/guides/progressive-collapse)

## Concepts in This Section

- [Sessions](./sessions.md): State machine instances
- [Specialists](./specialists.md): AI and human actors
- [Decision Cycle](./decision-cycle.md): The arbiter's async solicitation sequence
- [Arbitration](./arbitration.md): The unified consensus score
- [Consensus Strategies](./consensus-strategies.md): The default algorithm and alternatives
- [Human Primacy](./human-primacy.md): The foundational principle
- [Related Work](./related-work.md): How DIAL relates to other approaches
