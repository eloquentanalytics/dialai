---
name: dial-add-specialists
description: Add AI or human specialists to a DIAL machine. Use when configuring proposers.
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

Always proposes a specific action:

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

AI proposes, human has final say:

```json
{
  "specialists": {
    "proposers": [
      { "id": "ai", "strategy": "llm", "config": {"model": "claude-sonnet-4-20250514"} },
      { "id": "human", "strategy": "human" }
    ]
  }
}
```

Human proposals always win. AI specialists must use strategy invocation.

### AI Consensus

Multiple AI proposers with ahead-by-k:

```json
{
  "specialists": {
    "proposers": [
      { "id": "ai-proposer-1", "strategy": "llm", "config": {"model": "claude-sonnet-4-20250514"} },
      { "id": "ai-proposer-2", "strategy": "llm", "config": {"model": "claude-sonnet-4-20250514"} },
      { "id": "ai-proposer-3", "strategy": "llm", "config": {"model": "claude-sonnet-4-20250514"} }
    ]
  },
  "arbiter": {
    "strategy": "ahead-by-k",
    "k": 2
  }
}
```
