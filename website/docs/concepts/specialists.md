---
sidebar_position: 3
---

# Specialists

Specialists are the pluggable actors that participate in sessions. They can be AI models or humans.

## Roles

| Role | Description | Can be AI? | Can be Human? |
|------|-------------|------------|---------------|
| **Proposer** | Analyzes state, suggests transitions | Yes | Yes |
| **Voter** | Compares proposals, expresses preferences | Yes | Yes |
| **Arbiter** | Evaluates consensus (built-in) | No | No |

### Proposers

Proposers analyze the current state and suggest what transition should happen next. Any number of proposers can participate. Each proposer receives the current state, available transitions, and decision prompt, then returns a proposed transition with reasoning.

### Voters

Voters evaluate proposals and express preferences between them. For strategies that use voting, voters compare pairs of proposals and express a preference: **A**, **B**, **BOTH**, or **NEITHER**. See [Decision Cycle — Vote](./decision-cycle.md#2-vote-strategy-dependent) for details.

### Arbiters

The arbiter is always a **fully deterministic, built-in component**—never an AI model or a human. This is a deliberate safety constraint: the mechanism that decides whether consensus has been reached must be predictable and auditable.

See [Arbitration](./arbitration.md) for details on how consensus is evaluated.

## Human vs AI Specialists

The key distinction between human and AI specialists is **what they can do**:

**Human specialists** have special privileges:
- Can provide explicit decisions (which transition to propose, which proposal to vote for)
- Can force a transition when consensus isn't reached (human override)
- Their decisions serve as ground truth for evaluating AI specialists

**AI specialists** operate through strategies:
- Must use strategy invocation (an LLM, webhook, or local function decides for them)
- Cannot provide explicit decisions directly
- Cannot force transitions—they can only check for consensus

This asymmetry is intentional. It implements [Human Primacy](./human-primacy.md): humans are the ultimate authority, and AI specialists are evaluated on how well they predict human decisions.

## Specialist Strategies

Specialists execute their role through **strategies**—functions that determine what they propose or how they vote. Strategies can be:

1. **Local functions**: Code that runs in-process
2. **Webhooks**: Remote services that receive context and return decisions
3. **LLM-based**: Context is assembled and sent to a language model
4. **Hybrid**: A local function provides context, then an LLM makes the decision

This flexibility allows specialists to range from simple deterministic logic to sophisticated AI agents.

## Multiple Specialists

DIAL supports any number of specialists per role:

- **Multiple proposers**: Each may propose a different transition. The [arbitration strategy](./consensus-strategies.md) determines which wins—through voting, similarity scoring, or other mechanisms.
- **Multiple voters**: For strategies that use voting, more voters can provide stronger consensus signals.

This design enables:
- **Redundancy**: Multiple perspectives on the same decision
- **Specialization**: Different specialists optimized for different aspects
- **Competition**: Specialists are evaluated on alignment with human decisions

## Related Concepts

- [Decision Cycle](./decision-cycle.md): How specialists participate
- [Arbitration](./arbitration.md): How their votes are tallied
- [Human Primacy](./human-primacy.md): The foundation for human/AI distinction
