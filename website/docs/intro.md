---
sidebar_position: 1
---

# Introduction

DialAI (Dynamic Integration between AI and Labor) is a coordination framework for AI and human specialists making decisions together within state machines.

## The Question DialAI Answers

Given any task modeled as a state machine: **how do you know — in dollars, time, and quality — exactly what it would cost to turn that task over to a minimally competent AI decision-maker?** And how involved should humans remain in performing those tasks over the long term as a form of quality control?

## Starting from the Worst Case

DialAI starts from a deliberately pessimistic assumption: **AI has no role.** LLM specialists begin with weight 0.0. The default assumption is that the task is too difficult for AI and only humans can navigate it. DialAI then provides the mechanism to prove otherwise, one decision at a time.

## Key Principles

### Human Primacy

The human is always right — not because humans are infallible, but because humans have context that AI cannot access. An AI model operates on a bounded context window, while a human operates on a lifetime of embodied experience, tacit knowledge, institutional context, and real-time sensory input.

### Progressive Collapse

Over repeated decision cycles, measuring how well AI predicts human choices causes the multi-agent deliberation structure to progressively collapse into deterministic execution. This collapse is emergent, not designed.

### Empirical Trust

Trust is earned through demonstrated alignment with human decisions. Specialists are evaluated on their ability to predict what the human would choose, not on their independent correctness.

## What's Next?

- [Getting Started](/docs/getting-started/installation) - Install and set up DialAI
- [Concepts](/docs/concepts/intro) - Learn about sessions, specialists, and decision cycles
- [Guides](/docs/guides/state-machines) - Build your first state machine
