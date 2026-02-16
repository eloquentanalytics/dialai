---
sidebar_position: 3
---

# Specialists

Specialists are the pluggable actors that participate in sessions. They can be AI models, webhooks, local functions, or humans.

## Roles

| Role | Description | Can be AI? | Can be Human? |
|------|-------------|------------|---------------|
| **Proposer** | Analyzes state, suggests transitions | Yes | Yes |
| **Selection Voter** | Sees all proposals, picks the strongest | Yes | Yes |
| **Pairwise Voter** | Compares two proposals head-to-head (A, B, BOTH, NEITHER) | Yes | Yes |
| **Arbiter** | Orchestrates the decision cycle, evaluates consensus (built-in) | No | No |

### Proposers

Proposers analyze the current state and available transitions, then submit a proposed transition with:
- **Transition name**: Which transition to take (maps to a state machine edge)
- **Reasoning**: Natural language explanation of the choice
- **MetaJSON**: Structured data describing the state after taking the transition

Multiple proposers may propose the same transition with different reasoning (their contributions are **clustered** by the arbiter), or different transitions entirely.

### Selection Voters

Selection voters receive **all valid proposals** and pick the one they believe is strongest. This is a "pick the best from the field" evaluation — the voter sees every option and selects one.

Selection votes contribute to the consensus score with the voting specialist's alignment score as the multiplier.

### Pairwise Voters

Pairwise voters evaluate **exactly two proposals** head-to-head and express a preference:

| Vote | Meaning |
|------|---------|
| **A** | Prefer proposal A |
| **B** | Prefer proposal B |
| **BOTH** | Both are acceptable |
| **NEITHER** | Neither is acceptable |

Pairwise comparisons provide richer signal than selection voting. Each pairwise vote contributes the voter's alignment score to the chosen proposal's consensus score (split evenly for BOTH, nothing for NEITHER).

### The Arbiter

The arbiter is a **fully deterministic, built-in component** — never an AI model or a human. It serves as the orchestrator of the entire decision cycle:

1. **Solicits contributions** from proposers, selection voters, and pairwise voters in sequence
2. **Validates proposals** — rejects invalid transitions
3. **Clusters proposals** by transition — proposals for the same transition combine rather than compete
4. **Calculates the consensus score** continuously as contributions arrive
5. **Declares consensus** when one transition's margin of superiority crosses the threshold
6. **Blocks for human** when all specialists have been exhausted without consensus
7. **Self-heals** by re-enabling disabled specialists when anomalies are detected

See [Arbitration](./arbitration.md) for the full algorithm and self-healing mechanics.

## Alignment Score

Every specialist has an **alignment score**: the fraction of its past choices that matched what the human chose.

```
alignment = matching_choices / total_comparisons
```

- **Humans** always have alignment = 1.0 (they are the ground truth)
- **New AI specialists** start with alignment = 0.0 (no demonstrated alignment)
- **Alignment grows** as the specialist's choices match human decisions

The alignment score is **the multiplier applied to every contribution a specialist makes** to the consensus score. A specialist with alignment 0.0 contributes nothing to consensus. A specialist with alignment 0.9 contributes 90% of a full vote. A human contributes 100%.

This is the core mechanism that drives progressive collapse: as specialists demonstrate alignment, their contributions carry more weight in the consensus calculation, eventually reaching thresholds that previously required human participation.

## Semantic Isolation

LLMs that serve as specialists are **deliberately unaware** of DIAL's internal mechanics. They do not know about proposers, voters, consensus scores, or the framework itself. They receive:

- The current state description (the decision prompt)
- Available transitions (presented as tool calls)
- **Exemplar history**: past human decisions presented as domain-native history ("In this situation, the transition was X, with this reasoning")

The LLM sees a domain-native decision problem, not a framework coordination problem. This semantic isolation prevents the LLM from gaming the consensus mechanism or optimizing for framework artifacts rather than decision quality.

## Enable / Disable

Specialists can be **enabled** or **disabled** at any time:

- **Enabled**: Actively receiving solicitations and contributing to consensus
- **Disabled**: Paused — not solicited, but registration and alignment history are preserved

This is important for two reasons:

1. **Pruning**: The system disables low-alignment or redundant specialists to reduce cost and latency without losing their history.
2. **Self-healing**: The arbiter can re-enable disabled specialists when anomalies occur (e.g., the sole enabled proposer submits an invalid proposal).

Disabling is preferred over removing because alignment history is expensive to rebuild.

## Human vs AI Specialists

**Human specialists** have special privileges:
- Can provide explicit decisions (propose, vote)
- Can **force** a transition — bypassing consensus entirely
- Their decisions serve as **ground truth** for alignment measurement
- Forcing a decision creates an **exemplar** (context + decision) for future few-shot learning
- Alignment is always 1.0

**AI specialists** operate through strategies:
- Must use strategy invocation (an LLM, webhook, or local function decides for them)
- Cannot force transitions — they can only contribute to the consensus score
- Their alignment score starts at 0.0 and grows through demonstrated alignment with human choices

This asymmetry implements [Human Primacy](./human-primacy.md): humans are the ultimate authority, and AI specialists earn influence through empirical alignment.

## Specialist Strategies

Specialists execute their role through **strategies** — functions that determine what they propose or how they vote. Strategies can be:

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

DIAL supports any number of specialists per role:

- **Multiple proposers**: May propose different transitions or the same transition with different reasoning. Proposals for the same transition are clustered and their alignment scores combine.
- **Multiple selection voters**: Each sees all proposals and independently selects the best.
- **Multiple pairwise voters**: Each evaluates head-to-head matchups independently.

This design enables:
- **Redundancy**: Multiple perspectives on the same decision
- **Specialization**: Different specialists optimized for different aspects
- **Competition**: Specialists compete on alignment with human decisions
- **Progressive pruning**: Redundant or low-alignment specialists are disabled over time

## Related Concepts

- [Decision Cycle](./decision-cycle.md): How the arbiter solicits specialists
- [Arbitration](./arbitration.md): The unified consensus score
- [Human Primacy](./human-primacy.md): Why humans are ground truth
