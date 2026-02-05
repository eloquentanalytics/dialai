---
sidebar_position: 6
---

# Related Work

DIAL solves a different problem than most AI frameworks. Understanding the distinction helps clarify what DIAL is — and what it isn't.

## What DIAL Is

DIAL is a **measurement and delegation harness**. It answers the question: *can this AI specialist reliably predict what this human would choose, in this specific context?* When the answer is yes (empirically demonstrated over repeated decisions), DIAL progressively delegates. When alignment degrades, it reverts.

DIAL is not an agent framework, an alignment technique, or a model architecture. It can **wrap** any of them.

## How DIAL Relates to Other Approaches

The key dimension of comparison is **where ground truth comes from** — the signal used to judge whether AI behavior is correct.

| Approach | Ground truth source | When trust is established | Can trust change at runtime? |
|----------|---------------------|---------------------------|------------------------------|
| LangGraph / LangChain | Designer's predefined graph | Before deployment | No |
| Multi-agent debate | Human judges per decision | Each decision | No (static) |
| Constitutional AI / RLHF | Offline training signal | Training time | No |
| Mixture of Experts | Gating network | Training time | No |
| **DIAL** | **Human's actual runtime choices** | **Empirically, per decision cycle** | **Yes (progressive collapse + trip line)** |

### Agent Frameworks (LangGraph, LangChain, CrewAI)

Agent frameworks define **how** an AI system operates — the graph of states, tools, and control flow. DIAL defines **whether** an AI system should be trusted to operate autonomously at each decision point.

These are complementary. A DIAL specialist can *be* a LangGraph agent. DIAL wraps the agent and measures whether its decisions match human choices. The agent framework handles execution; DIAL handles trust calibration.

### Multi-Agent Debate

Multi-agent debate uses multiple AI models to argue and a human to judge. DIAL's voting mechanism is superficially similar, but the purpose differs: debate aims to improve answer quality through adversarial argument; DIAL aims to measure which specialist best predicts the human, with the goal of eventually removing the human from routine decisions.

### Constitutional AI / RLHF

Constitutional AI and RLHF train models against offline signals — a constitution document or human preference data collected in advance. The trust relationship is fixed at training time. DIAL's ground truth is the human's live, runtime choices in a specific operational context. Trust evolves continuously, per-specialist, per-state. A constitutionally-trained model can serve as a DIAL specialist — DIAL then measures whether the training generalizes to this particular human's preferences.

### Mixture of Experts (MoE)

MoE architectures route inputs to specialized sub-networks via a learned gating function. The analogy to DIAL's specialist selection is real but shallow: MoE routing is learned at training time and frozen; DIAL's trust in specialists updates at runtime based on human feedback. MoE optimizes for task performance; DIAL optimizes for human prediction.

## Using DIAL with Other Systems

DIAL is designed to be wrapped around existing AI systems, not to replace them:

- **Your agent framework** handles task execution, tool calls, and control flow
- **Your model** handles reasoning, generation, and tool use
- **DIAL** handles the question: *should this agent/model be trusted to act autonomously here, or does a human need to decide?*

The specialist interface is intentionally minimal — anything that can propose a state transition and compare two proposals can participate in DIAL's decision cycle.
