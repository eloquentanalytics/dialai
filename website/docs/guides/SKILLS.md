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
| Decision Cycles | [SKILL.md](./skills/decision-cycles/SKILL.md) | Understand Propose, Vote, Arbitrate, Execute |
| Programmatic Usage | [SKILL.md](./skills/programmatic-usage/SKILL.md) | TypeScript/JavaScript integration |
| MCP Server | [SKILL.md](./skills/mcp-server/SKILL.md) | Run as MCP server for AI assistants |
| Troubleshooting | [SKILL.md](./skills/troubleshooting/SKILL.md) | Debug common issues |

## Core Concepts

### The Decision Cycle

```
Propose -> Vote -> Arbitrate -> Execute -> (repeat until goal state)
```

1. **Propose**: Proposers submit transition proposals
2. **Vote**: Voters compare proposals pairwise
3. **Arbitrate**: Arbiter evaluates consensus
4. **Execute**: Winning transition is applied

### Specialist Types

| Strategy | Description |
|----------|-------------|
| `llm` | AI specialist using a language model |
| `human` | Human specialist with CLI prompts |
| `deterministic` | Always takes the same action |

### Human Primacy

Human votes override AI votes. A single human vote for proposal A beats any number of AI votes for proposal B.

## Machine Definition Template

```json
{
  "machine": {
    "id": "machine-id",
    "description": "What this machine does",
    "defaultState": "goal-state",
    "states": {
      "initial": {
        "type": "initial",
        "transitions": {
          "action": { "target": "next", "prompt": "Decision prompt?" }
        }
      },
      "goal-state": { "type": "default" }
    }
  },
  "specialists": {
    "proposers": [
      { "id": "ai", "strategy": "llm", "config": { "model": "claude-sonnet-4-20250514" } }
    ],
    "voters": [
      { "id": "human", "strategy": "human" }
    ]
  }
}
```

## API Functions

| Function | Purpose |
|----------|---------|
| `createSession` | Start a new decision process |
| `getSession` | Check session state |
| `registerProposer` | Add a proposer |
| `registerVoter` | Add a voter |
| `submitProposal` | Submit a transition proposal |
| `submitVote` | Cast a vote |
| `evaluateConsensus` | Check for agreement |
| `executeTransition` | Apply the winning proposal |

## Common Patterns

### Human Override
```json
{
  "proposers": [{ "id": "ai", "strategy": "llm", "config": {...} }],
  "voters": [{ "id": "human", "strategy": "human" }]
}
```

### AI Consensus
```json
{
  "proposers": [{ "id": "ai", "strategy": "llm", "config": {...} }],
  "voters": [
    { "id": "ai-1", "strategy": "llm", "config": {...} },
    { "id": "ai-2", "strategy": "llm", "config": {...} },
    { "id": "ai-3", "strategy": "llm", "config": {...} }
  ],
  "arbiter": { "strategy": "supermajority", "threshold": 0.66 }
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
- [API Reference](/docs/api/create-session) - Complete documentation
