---
sidebar_position: 3
---

# Specialists

Specialists are the pluggable actors that participate in sessions. They can be AI models, webhooks, local functions, or humans.

## Roles

| Role | Description | Can be AI? | Can be Human? |
|------|-------------|------------|---------------|
| **Proposer** | Analyzes state, suggests transitions | Yes | Yes |
| **Arbiter** | Evaluates consensus via alignment-weighted margin (built-in) | No | No |

### Proposers

Proposers analyze the current state and available transitions, then submit a proposed transition with:
- **Transition name**: Which transition to take (maps to a state machine edge)
- **Reasoning**: Natural language explanation of the choice
- **MetaJSON**: Structured data describing the state after taking the transition

Multiple proposers may propose the same transition with different reasoning (their contributions are **clustered** by the arbiter), or different transitions entirely. Each proposal acts as an endorsement of that transition.

### The Arbiter

The arbiter is a **fully deterministic, built-in component** — never an AI model or a human. It groups proposals by transition and applies an alignment-weighted margin to determine consensus:

1. **Solicits proposals** from all enabled proposers
2. **Validates proposals** — rejects invalid transitions
3. **Clusters proposals** by transition — proposals for the same transition combine rather than compete
4. **Counts endorsements** continuously as proposals arrive
5. **Declares consensus** when one transition's endorsement count leads the next-best by at least k
6. **Blocks for human** when all specialists have been exhausted without consensus
7. **Self-heals** by re-enabling disabled specialists when anomalies are detected

See [Arbitration](./arbitration.md) for the full algorithm and self-healing mechanics.

## Alignment Score

Every specialist has an **alignment score** computed using the **Wilson score lower bound** — the lower bound of a 95% confidence interval for the true match rate between the specialist's proposals and human decisions.

```
alignmentScore = wilsonLowerBound(matchingChoices, totalComparisons, z=1.96)
```

- **Humans** always have alignment = 1.0 (they are the ground truth)
- **New AI specialists** start with alignment = 0.0 (no demonstrated alignment)
- **Alignment grows** as the specialist's choices match human decisions
- **Small samples are penalized**: 1 match out of 1 comparison yields ~0.21, not 1.0 — confidence requires evidence

The alignment score tracks how well a specialist's proposals match human decisions over time. It is used for evaluation and progressive collapse decisions — determining when a specialist has demonstrated enough alignment to operate without human oversight.

## Semantic Isolation

LLMs that serve as specialists are **deliberately unaware** of DIAL's internal mechanics. They do not know about proposers, consensus scores, or the framework itself. They receive:

- The current state description (the decision prompt)
- Available transitions (presented as tool calls)
- **Exemplar history**: past human decisions presented as domain-native history ("In this situation, the transition was X, with this reasoning")

The LLM sees a domain-native decision problem, not a framework coordination problem. This semantic isolation prevents the LLM from gaming the consensus mechanism or optimizing for framework artifacts rather than decision quality.

## Enable / Disable

Specialists can be **enabled** or **disabled** at any time:

- **Enabled**: Actively receiving solicitations and contributing proposals
- **Disabled**: Paused — not solicited, but registration and alignment history are preserved

This is important for two reasons:

1. **Pruning**: The system disables low-alignment or redundant specialists to reduce cost and latency without losing their history.
2. **Self-healing**: The arbiter can re-enable disabled specialists when anomalies occur (e.g., the sole enabled proposer submits an invalid proposal).

Disabling is preferred over removing because alignment history is expensive to rebuild.

## Human vs AI Specialists

**Human specialists** have special privileges:
- Can provide explicit proposals for transitions
- Their proposals **always win** — a human proposal is treated as the decisive endorsement, equivalent to an override
- Their decisions serve as **ground truth** for alignment measurement
- A human proposal creates an **exemplar** (context + decision) for future few-shot learning
- Alignment is always 1.0

**AI specialists** operate through strategies:
- Must use strategy invocation (an LLM, webhook, or local function decides for them)
- Cannot override — they can only contribute proposals that are counted toward consensus
- Their alignment score starts at 0.0 and grows through demonstrated alignment with human choices

This asymmetry implements [Human Primacy](./human-primacy.md): humans are the ultimate authority, and AI specialists earn influence through empirical alignment.

## Specialist Strategies

Specialists execute their role through **strategies** — functions that determine what they propose. Strategies can be:

1. **Local functions**: Code that runs in-process
2. **Webhooks**: Remote services that receive context and return decisions
3. **LLM-based**: Context is assembled and sent to a language model
4. **Hybrid**: A local function provides context, then an LLM makes the decision

A specialist's configuration includes:
- **Strategy function**: How the specialist makes its decision
- **Context function**: Provides domain-specific context (optional)
- **Prompt**: A string that frames the decision for this specialist
- **Model ID**: For LLM-based strategies, the model to use (e.g., via OpenRouter)

## Multiple Specialists

DIAL supports any number of proposers:

- **Multiple proposers**: May propose different transitions or the same transition with different reasoning. Proposals for the same transition are clustered and their endorsements combine.

This design enables:
- **Redundancy**: Multiple perspectives on the same decision
- **Specialization**: Different specialists optimized for different aspects
- **Competition**: Specialists compete on alignment with human decisions
- **Progressive pruning**: Redundant or low-alignment specialists are disabled over time

## Related Concepts

- [Decision Cycle](./decision-cycle.md): How the arbiter solicits specialists
- [Arbitration](./arbitration.md): The unified consensus score
- [Human Primacy](./human-primacy.md): Why humans are ground truth
