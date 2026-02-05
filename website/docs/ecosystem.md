---
sidebar_position: 7
---

# Ecosystem

DIAL measures whether AI specialists can reliably replicate human decisions, then progressively delegates when alignment is demonstrated. Several open-source projects share overlapping goals. This page lists the 10 closest.

For conceptual comparisons (agent frameworks, RLHF, MoE), see [Related Work](./concepts/related-work.md).

## Optimization

### DSPy

**[github.com/stanfordnlp/dspy](https://github.com/stanfordnlp/dspy)** · Stanford NLP · MIT

A framework for *programming*, not prompting, language models. Optimizers like MIPROv2 automatically search over instructions, demonstrations, and weights to maximize a metric. The closest philosophical match to DIAL: both treat LLM behavior as tunable against measurable objectives, with DSPy optimizing at the prompt level and DIAL at the decision level.

### TensorZero

**[github.com/tensorzero/tensorzero](https://github.com/tensorzero/tensorzero)** · Apache 2.0

Unifies an LLM gateway, observability, and optimization. Collects human feedback in production to optimize prompts and models with built-in A/B testing. Its optimization loop (inference, feedback, optimize) mirrors DIAL's cycle (propose, vote, consensus, refine).

### TextGrad

**[github.com/zou-group/textgrad](https://github.com/zou-group/textgrad)** · Stanford / Zou Group

Backpropagates textual feedback from LLMs to improve components of compound AI systems, using PyTorch-like abstractions on natural language. Like DIAL, it iteratively improves outputs using feedback signals: TextGrad via "textual gradients," DIAL via vote results and alignment scores.

## Evaluation

### Inspect AI

**[github.com/UKGovernmentBEIS/inspect_ai](https://github.com/UKGovernmentBEIS/inspect_ai)** · UK AI Safety Institute

Structured, reproducible LLM evaluations with opinionated primitives (Dataset, Task, Solver, Scorer) and 100+ built-in evals. Its Solver/Scorer pattern parallels DIAL's Specialist/Vote pattern, and both support multi-turn agent workflows with customizable scoring.

### promptfoo

**[github.com/promptfoo/promptfoo](https://github.com/promptfoo/promptfoo)** · MIT

Test-driven LLM evaluation with declarative YAML config, assertions from string matching to LLM-as-judge, and comparison across 50+ providers. Like DIAL, it compares multiple configurations against expected outputs with structured scoring, with a focus on CI/CD integration.

### DeepEval

**[github.com/confident-ai/deepeval](https://github.com/confident-ai/deepeval)** · Confident AI

14+ built-in metrics including hallucination, faithfulness, and conversational metrics like knowledge retention. DIAL's consensus mechanism can use these kinds of alignment metrics to drive delegation decisions.

## Multi-Agent

### AutoGen

**[github.com/microsoft/autogen](https://github.com/microsoft/autogen)** · Microsoft · MIT

Multi-agent cooperation via automated chat, with AgentOptimizer for iteratively improving agent behavior from historical performance. The strongest multi-agent overlap with DIAL: both use multi-specialist architectures and historical performance to guide optimization toward trust-calibrated delegation.

### CrewAI

**[github.com/crewAIInc/crewAI](https://github.com/crewAIInc/crewAI)**

Role-based multi-agent orchestration with "Crews" and "Flows." Its role-based design parallels DIAL's proposer/voter roles, and a CrewAI agent can serve as a DIAL specialist.

## Agent Training

### Agent Lightning

**[github.com/microsoft/agent-lightning](https://github.com/microsoft/agent-lightning)** · Microsoft · MIT

Makes agents trainable via reinforcement learning with hierarchical credit assignment, determining how much each LLM call contributed to the outcome. Like DIAL, it decomposes multi-step behavior into individually evaluable decisions, using RL rewards where DIAL uses human-alignment votes.

### ADAS

**[github.com/ShengranHu/ADAS](https://github.com/ShengranHu/ADAS)** · ICLR 2025

A meta-agent iteratively programs new agents, tests them, and archives successful designs to inform future iterations. Both ADAS and DIAL use iterative optimization over agent configurations guided by empirical performance, with ADAS searching over architectures and DIAL optimizing specialist strategy, prompts, and model mix.

## Summary

| Tool | Focus | Overlap with DIAL |
|------|-------|-------------------|
| **DSPy** | Prompt/weight optimization | Iterative optimization against measurable objectives |
| **TensorZero** | Production LLM optimization | Human feedback-driven improvement loop |
| **TextGrad** | Textual backpropagation | Feedback-driven component optimization |
| **Inspect AI** | Safety/capability evaluation | Structured scoring, multi-turn workflows |
| **promptfoo** | Test-driven LLM evaluation | Comparing configurations against expected outputs |
| **DeepEval** | LLM metrics | Customizable scoring with conversational metrics |
| **AutoGen** | Multi-agent collaboration | Multi-agent architecture + iterative optimization |
| **CrewAI** | Multi-agent orchestration | Role-based specialist coordination |
| **Agent Lightning** | RL-based agent training | Per-decision credit assignment |
| **ADAS** | Automated agent design | Meta-optimization of agent configurations |

These tools are complementary. Many can serve as DIAL specialists or provide the underlying infrastructure that DIAL wraps. DIAL's unique contribution is combining **runtime human-alignment measurement** with **progressive delegation**, continuously deciding *who should decide* based on empirical evidence.
