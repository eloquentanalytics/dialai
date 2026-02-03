---
sidebar_position: 1
---

# Concepts Overview

DialAI is built on a few core concepts that work together to enable human-AI coordination.

## Sessions

A session is an instance of a state machine. The machine defines a default state, other possible states, and transitions between them. When a session is not in its default state, specialists work together to return it there.

## Specialists

Specialists are the "pluggable" actors that participate in sessions. They can be AI models or humans. There are four roles:

- **Proposers** - Analyze the current state and suggest what transition should happen next
- **Voters** - Evaluate proposals and express preferences between them
- **Arbiters** - Evaluate consensus and determine when sufficient agreement has been reached
- **Tools** - Perform synchronous function-like transitions when requested

## The Decision Cycle

When a session is not in its default state, the system progresses through a repeating cycle:

1. **Proposal Solicitation** — Ask proposers what transition should happen next
2. **Proposal Submission** — Proposers submit their recommendations with reasoning
3. **Vote Solicitation** — Voters compare pairs of proposals
4. **Arbitration** — Arbiters aggregate votes to determine if a proposal has sufficient support
5. **Transition Execution** — If consensus is reached, execute the winning proposal's transition

## Human Primacy

The foundational principle of DialAI is that humans possess context that AI specialists cannot access. The AI specialist operates on a bounded context window, while a human specialist has access to a lifetime of embodied experience, institutional knowledge, and real-time sensory input.

This asymmetry is why alignment with the human sits at the top of the priority hierarchy. The specialist will be judged against the human's choice, and that judgment is correct, because the human's broader context makes the human's decision the more reliable one.
