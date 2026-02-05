---
sidebar_position: 1
---

# Introduction to DIAL

**DIAL** (Dynamic Integration between AI and Labor) is a coordination framework for AI and human specialists making decisions together within state machines.

## Why DIAL?

The promise of AI is efficiency—faster, cheaper execution of narrow tasks. But the question organizations face isn't "Can AI do this?" It's:

> **How do you know — in dollars, time, and quality — exactly what it would cost to turn any task over to a minimally competent AI decision-maker? And how involved should humans remain as quality control?**

DIAL provides the answer through **empirical measurement**, not speculation.

## The Core Insight

AI models are created by us. Their works are based on our works. They cannot be better than us because they can never have as large a context as we do.

An AI model operates on a bounded context window—thousands or millions of tokens. A human operates on a **lifetime of embodied experience**, tacit knowledge, institutional context, and real-time sensory input that no model has access to.

The human knows things they cannot tell the machine.

## Three Foundational Principles

### 1. Human Primacy

The human is always right—not because humans are infallible, but because humans have context that AI cannot access.

It is always safer for the AI to assume the human had reasons, just as it is safer for a child to defer to a parent—not because the parent is infallible, but because the parent has context the child cannot access.

An AI specialist should choose what the human would choose, even if its own reasoning disagrees. It will be judged on alignment with the human, and that judgment is correct. The standard is distributional: a specialist's output probabilities should match the distribution a population of competent humans would produce for the same decision—including the natural variance in that distribution.

### 2. Progressive Collapse

Over repeated decision cycles, measuring how well AI predicts human choices causes the multi-agent deliberation structure to **progressively collapse into deterministic execution**.

This collapse is emergent, not designed. As AI specialists prove their alignment with human judgment through accumulated data, the expensive deliberation process naturally simplifies.

### 3. Empirical Trust

Trust is earned through demonstrated alignment with human decisions, not assumed.

- **Human specialists** are identified by including "human" in their `specialistId` — their votes override all AI votes immediately
- **AI specialists** participate through voting
- Trust is built through alignment with human choices over time

## What DIAL Is Not

DIAL is not about AI replacing humans. It's about discovering—with precise cost data—which decisions are narrow enough for AI to handle, and what the ongoing human quality-control cost is to maintain that delegation over time.

The value of AI is not superiority. **It is efficiency.** AI is faster and cheaper at narrow tasks where the required context fits within the model's window.

## How It Works

1. **Model the task as a state machine** — Define states, transitions, and decision prompts
2. **Register specialists** — Both AI and humans that can propose transitions and vote
3. **Run decision cycles** — Propose → Vote → Arbitrate → Execute
4. **Reach the goal state** — The session completes when it reaches its `defaultState`

```mermaid
graph LR
    A[Propose] --> B[Vote]
    B --> C[Arbitrate]
    C --> D[Execute]
    D --> A
```

## What's Next?

<div className="row">
  <div className="col col--6">
    <div className="card margin-bottom--md">
      <div className="card__header">
        <h3>🚀 Get Started</h3>
      </div>
      <div className="card__body">
        <p>Install DIAL and run your first state machine with AI and human specialists.</p>
        <a href="/docs/getting-started/installation" className="button button--primary">Installation Guide →</a>
      </div>
    </div>
  </div>
  <div className="col col--6">
    <div className="card margin-bottom--md">
      <div className="card__header">
        <h3>📚 Learn Concepts</h3>
      </div>
      <div className="card__body">
        <p>Understand sessions, specialists, decision cycles, and arbitration strategies.</p>
        <a href="/docs/concepts/intro" className="button button--secondary">Explore Concepts →</a>
      </div>
    </div>
  </div>
</div>

## Key Terminology

| Term | Definition |
|------|------------|
| **Session** | An instance of a state machine being navigated by specialists |
| **Specialist** | A pluggable actor (AI or human) that proposes transitions or votes |
| **Decision Cycle** | The repeating process: Propose → Vote → Arbitrate → Execute |
| **Arbiter** | The built-in logic that evaluates consensus and determines when a proposal wins |
| **Default State** | The goal state — the session is complete when it reaches this state |
