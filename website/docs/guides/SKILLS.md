---
sidebar_position: 4
title: DIAL Skills Reference
description: Complete skill reference for AI agents using DIAL
---

# DIAL Skills Reference

This is a consolidated reference for AI agents learning to use DIAL. For modular, downloadable skills, see the [skills directory](./skills/index.md).

## Quick Reference

```bash
# Install DIAL
npm install dialai

# Run a state machine
npx dialai machine.json

# Run with human interaction enabled
npx dialai machine.json --human

# Run with verbose output
npx dialai machine.json --verbose

# Run as MCP server
npx dialai --mcp
```

## Modular Skills

Each skill below is available as a standalone file that agents can download:

| Skill | File | Description |
|-------|------|-------------|
| Run Machine | [SKILL.md](./skills/run-machine/SKILL.md) | Execute state machines from CLI |
| Create Machine | [SKILL.md](./skills/create-machine/SKILL.md) | Define state machine JSON |
| Add Specialists | [SKILL.md](./skills/add-specialists/SKILL.md) | Configure AI and human participants |
| Decision Cycles | [SKILL.md](./skills/decision-cycles/SKILL.md) | Understand the decision cycle |
| Programmatic Usage | [SKILL.md](./skills/programmatic-usage/SKILL.md) | TypeScript/JavaScript integration |
| MCP Server | [SKILL.md](./skills/mcp-server/SKILL.md) | Run as MCP server for AI assistants |
| Troubleshooting | [SKILL.md](./skills/troubleshooting/SKILL.md) | Debug common issues |

## Core Concepts

### The Decision Cycle

```
Propose -> Arbitrate -> Execute -> (repeat until goalState)
```

1. **Propose**: Proposers submit transition proposals (each proposal endorses a transition)
2. **Arbitrate**: Arbiter counts proposals per transition, applies alignment margin consensus
3. **Execute**: Winning transition is applied

### Specialist Types

| Strategy | Description |
|----------|-------------|
| `llm` | AI specialist using a language model |
| `human` | Human specialist with CLI prompts |
| `deterministic` | Always takes the same action |

### Human Primacy

When consensus cannot be reached, only a specialist registered with `isHuman: true` can force a decision via `submitArbitration`.

## Machine Definition Template

```json
{
  "machineName": "my-task",
  "initialState": "pending",
  "goalState": "done",
  "states": {
    "pending": {
      "prompt": "Should we complete this task?",
      "transitions": { "complete": "done" }
    },
    "done": {}
  }
}
```

For machines with embedded specialists, see [State Machines](./state-machines.md#full-machine-json-structure).

## API Functions

| Function | Purpose |
|----------|---------|
| `createSession` | Start a new decision process |
| `getSession` | Check session state |
| `registerProposer` | Add a proposer |
| `submitProposal` | Submit a transition proposal (with roundId) |
| `submitArbitration` | Evaluate consensus and execute |
| `executeTransition` | Apply a transition directly |

## Common Patterns

### Human Override
```json
{
  "specialists": [
    { "specialistId": "ai", "role": "proposer", "strategyFnName": "firstAvailable" },
    { "specialistId": "human", "role": "proposer", "isHuman": true }
  ]
}
```
Human proposals always win consensus immediately.

### AI Consensus
```json
{
  "specialists": [
    { "specialistId": "ai-1", "role": "proposer", "strategyFnName": "firstAvailable" },
    { "specialistId": "ai-2", "role": "proposer", "strategyFnName": "firstAvailable" },
    { "specialistId": "ai-3", "role": "proposer", "strategyFnName": "firstAvailable" },
    { "specialistId": "arbiter", "role": "arbiter", "strategyFnName": "alignmentMargin", "threshold": 2 }
  ]
}
```

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| Invalid machine | `cat machine.json \| jq .` |
| Stuck in state | Run with `--verbose` |
| No human prompts | Add `--human` flag |
| API key error | `export ANTHROPIC_API_KEY=sk-...` |

## Further Reading

- [Modular Skills](./skills/index.md) - Individual downloadable skills
- [State Machines](./state-machines.md) - Deep dive into definitions
- [Registering Specialists](./registering-specialists.md) - All specialist types
- [Implementing Strategies](./implementing-strategies.md) - Custom strategies
- [API Reference](/docs/api/createSession) - Complete documentation
