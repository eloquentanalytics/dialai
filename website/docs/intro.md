---
sidebar_position: 1
---

# Introduction to DIAL

**DIAL** (Dynamic Integration between AI and Labor) is a coordination framework for AI and human specialists making decisions together within state machines.

## Why DIAL?

The promise of AI is efficiency: faster, cheaper execution of narrow tasks. But the question organizations face isn't "Can AI do this?" It's:

> **How do you know, in dollars, time, and quality, exactly what it would cost to turn any task over to a minimally competent AI decision-maker? And how involved should humans remain as quality control?**

DIAL provides the answer through **empirical measurement**, not speculation.

## The Core Insight

An AI model operates on a bounded context window. A human operates on a **lifetime of embodied experience**, tacit knowledge, institutional context, and real-time sensory input that no model has access to. The human knows things they cannot tell the machine.

## Three Foundational Principles

### 1. Human Primacy

The human is always right, not because humans are infallible, but because humans have context that AI cannot access.

An AI specialist is judged on alignment with human choices. The standard is distributional: output should match the distribution a population of competent humans would produce for the same decision.

### 2. Progressive Collapse

Over repeated decision cycles, measuring how well AI predicts human choices causes the multi-agent deliberation structure to **progressively collapse into deterministic execution**.

This collapse is emergent, not designed. As AI specialists prove their alignment with human judgment through accumulated data, the expensive deliberation process naturally simplifies.

### 3. Empirical Trust

Trust is earned through demonstrated alignment with human decisions and through continued sampling of human preferences. Specialists prove their value one decision at a time.

## What DIAL Is Not

DIAL is not about AI replacing humans. It targets decisions that humans already make well and measures whether AI specialists can replicate those decisions cheaply enough to justify delegation, with precise cost data on ongoing human quality-control. The value of AI is not superiority. **It is efficiency.** AI is faster and cheaper at narrow tasks where the required context fits within the model's window.

## How It Works

```mermaid
graph LR
    A[Propose] --> B[Vote]
    B --> C[Arbitrate]
    C --> D[Execute]
    D --> A
```

1. **Model the task as a state machine**: Define states, transitions, and decision prompts
2. **Register proposers and voters**: AI and human specialists that propose transitions and vote on them
3. **Run decision cycles**: Propose → Vote → Arbitrate → Execute
4. **Reach completion**: The session completes when it reaches its default state

## Documentation Structure

This documentation is organized into two main sections:

### [Concepts](/docs/concepts/intro)

The theory and philosophy behind DIAL. No code—just ideas:
- What sessions, specialists, and decision cycles are
- How arbitration and consensus work
- Why human primacy matters
- How DIAL relates to other approaches

### [Implementation](/docs/getting-started/installation)

How to use the `dialai` library:
- Installation and quick start
- API reference
- Guides for building state machines and registering specialists
- Examples and deployment patterns

## Key Terminology

| Term | Definition |
|------|------------|
| **Session** | An instance of a state machine being navigated by specialists |
| **Specialist** | A pluggable actor (AI or human) that proposes transitions or votes |
| **Decision Cycle** | The repeating process: Propose → Vote → Arbitrate → Execute |
| **Arbiter** | The built-in logic that evaluates consensus and determines when a proposal wins |
| **Default State** | The state where the session is complete |
