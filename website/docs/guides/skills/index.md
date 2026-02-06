---
sidebar_position: 5
title: Agent Skills
description: Modular skills for AI agents using DIAL
---

# Agent Skills for DIAL

This directory contains modular skills that AI agents can download and use to interact with DIAL. Each skill is a self-contained instruction set following the [Agent Skills](https://agentskills.io) open standard.

## Available Skills

| Skill | Description |
|-------|-------------|
| [run-machine](./run-machine/SKILL.md) | Execute a DIAL state machine from the CLI |
| [create-machine](./create-machine/SKILL.md) | Create a state machine definition JSON |
| [add-specialists](./add-specialists/SKILL.md) | Configure AI and human specialists |
| [decision-cycles](./decision-cycles/SKILL.md) | Understand Propose, Vote, Arbitrate, Execute |
| [programmatic-usage](./programmatic-usage/SKILL.md) | Use DIAL in TypeScript/JavaScript code |
| [mcp-server](./mcp-server/SKILL.md) | Run DIAL as an MCP server |
| [troubleshooting](./troubleshooting/SKILL.md) | Debug common issues |

## For AI Agents

Each skill directory contains a `SKILL.md` file with:

- **Frontmatter**: Name, description, and invocation hints
- **Instructions**: Step-by-step guidance for the task
- **Examples**: Concrete code and command examples
- **Patterns**: Common usage patterns and best practices

### Importing Skills

**Option 1: Fetch from docs site**

Point your AI agent at the skills index or individual skills:

```bash
# Fetch the skills index to discover available skills
curl https://dialai.dev/docs/guides/skills/

# Fetch a specific skill
curl https://dialai.dev/docs/guides/skills/run-machine/SKILL.md
```

**Option 2: Install as Claude Code skills**

Copy skills to your personal or project skills directory:

```bash
# Personal skills (available in all projects)
mkdir -p ~/.claude/skills/dial-run-machine
curl -o ~/.claude/skills/dial-run-machine/SKILL.md \
  https://dialai.dev/docs/guides/skills/run-machine/SKILL.md

# Project skills (available in this project only)
mkdir -p .claude/skills/dial-run-machine
curl -o .claude/skills/dial-run-machine/SKILL.md \
  https://dialai.dev/docs/guides/skills/run-machine/SKILL.md
```

**Option 3: Clone the repository**

```bash
git clone https://github.com/your-org/dialai.git
# Skills are in website/docs/guides/skills/
```

**Option 4: Use in agent system prompt**

Include the skill content directly in your agent's context:

```
You have access to the following DIAL skills:

[Paste SKILL.md content here]
```

### Telling Your Agent About Skills

When configuring an AI agent to use DIAL, include this in your system prompt or context:

```
DIAL skills are available at: https://dialai.dev/docs/guides/skills/

To learn how to perform a DIAL task, fetch the relevant SKILL.md file:
- Run machines: /skills/run-machine/SKILL.md
- Create machines: /skills/create-machine/SKILL.md
- Add specialists: /skills/add-specialists/SKILL.md
- Use programmatically: /skills/programmatic-usage/SKILL.md
- Run MCP server: /skills/mcp-server/SKILL.md
- Debug issues: /skills/troubleshooting/SKILL.md
```

### Skill Format

Skills use YAML frontmatter:

```yaml
---
name: dial-run-machine
description: Run a DIAL state machine from the CLI
argument-hint: [machine.json] [--verbose] [--human]
---
```

| Field | Purpose |
|-------|---------|
| `name` | Unique identifier for the skill |
| `description` | When to use this skill |
| `argument-hint` | Expected arguments |
| `user-invocable` | Whether users can invoke directly (default: true) |

## Quick Start

1. **Run a machine**: Use [run-machine](./run-machine/SKILL.md)
2. **Create your own**: Use [create-machine](./create-machine/SKILL.md)
3. **Add participants**: Use [add-specialists](./add-specialists/SKILL.md)
4. **Integrate in code**: Use [programmatic-usage](./programmatic-usage/SKILL.md)

## Skill Compatibility

These skills are designed for:

- **Claude Code** - Load as project or personal skills
- **Gemini CLI** - Compatible with Agent Skills standard
- **GitHub Copilot** - Works with Copilot's skill system
- **Other AI agents** - Any agent that can parse markdown instructions
