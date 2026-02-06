---
name: dial-add-specialists
description: Add AI or human specialists to a DIAL machine. Use when configuring proposers and voters.
---

# Add Specialists

Configure AI and human participants in a decision process.

## Specialist Types

| Strategy | Description |
|----------|-------------|
| `llm` | AI specialist using a language model |
| `human` | Human specialist with CLI prompts |
| `deterministic` | Always takes the same action |

## AI Proposer

```json
{
  "id": "ai-proposer",
  "strategy": "llm",
  "config": {
    "model": "claude-sonnet-4-20250514",
    "systemPrompt": "You are a code review specialist. Propose transitions based on code quality."
  }
}
```

### Config Options

| Field | Required | Description |
|-------|----------|-------------|
| `model` | Yes | Model identifier (e.g., `claude-sonnet-4-20250514`) |
| `systemPrompt` | No | Custom instructions for the specialist |
| `temperature` | No | Sampling temperature (default: 0.7) |

## AI Voter

```json
{
  "id": "ai-voter",
  "strategy": "llm",
  "config": {
    "model": "claude-sonnet-4-20250514",
    "systemPrompt": "Vote for the proposal that best serves the project goals."
  }
}
```

## Human Specialist

```json
{
  "id": "human-reviewer",
  "strategy": "human"
}
```

Requires `--human` flag when running:
```bash
npx dialai machine.json --human
```

## Deterministic Specialist

Always proposes or votes for a specific action:

```json
{
  "id": "always-approve",
  "strategy": "deterministic",
  "config": {
    "action": "approve"
  }
}
```

Useful for testing or default behaviors.

## Patterns

### Human Override

AI proposes, human decides:

```json
{
  "specialists": {
    "proposers": [
      { "id": "ai", "strategy": "llm", "config": {"model": "claude-sonnet-4-20250514"} }
    ],
    "voters": [
      { "id": "human", "strategy": "human" }
    ]
  }
}
```

### AI Consensus

Multiple AI voters must agree:

```json
{
  "specialists": {
    "proposers": [
      { "id": "ai-proposer", "strategy": "llm", "config": {"model": "claude-sonnet-4-20250514"} }
    ],
    "voters": [
      { "id": "ai-voter-1", "strategy": "llm", "config": {"model": "claude-sonnet-4-20250514"} },
      { "id": "ai-voter-2", "strategy": "llm", "config": {"model": "claude-sonnet-4-20250514"} },
      { "id": "ai-voter-3", "strategy": "llm", "config": {"model": "claude-sonnet-4-20250514"} }
    ]
  },
  "arbiter": {
    "strategy": "supermajority",
    "threshold": 0.66
  }
}
```

### Mixed Panel

AI and human voters together:

```json
{
  "specialists": {
    "proposers": [
      { "id": "ai-proposer", "strategy": "llm", "config": {"model": "claude-sonnet-4-20250514"} }
    ],
    "voters": [
      { "id": "ai-voter", "strategy": "llm", "config": {"model": "claude-sonnet-4-20250514"} },
      { "id": "human-voter", "strategy": "human" }
    ]
  }
}
```

Human votes override AI votes due to human primacy.
