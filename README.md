<div align="center">
  <img src="website/static/img/logo.svg" alt="DIAL" width="120" height="120">
  <h1>DIAL</h1>
  <p><strong>Dynamic Integration between AI and Labor</strong></p>
  <p>A coordination framework for AI and human specialists making<br>decisions together within state machines.</p>
  <br>

  [![MIT License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
  [![npm version](https://img.shields.io/npm/v/dialai.svg)](https://www.npmjs.com/package/dialai)
  [![CI](https://github.com/eloquentanalytics/dialai/actions/workflows/ci.yml/badge.svg)](https://github.com/eloquentanalytics/dialai/actions/workflows/ci.yml)

  <a href="https://eloquentanalytics.github.io/dialai/"><strong>Documentation</strong></a> · <a href="https://eloquentanalytics.github.io/dialai/docs/getting-started/installation"><strong>Get Started</strong></a> · <a href="https://github.com/eloquentanalytics/dialai/releases"><strong>Releases</strong></a> · <a href="https://github.com/eloquentanalytics/dialai/issues"><strong>Issues</strong></a>
  <br><br>
</div>

## Overview

DIAL provides a framework for answering a fundamental question: *Given any task modeled as a state machine, how do you know — in dollars, time, and quality — exactly what it would cost to turn that task over to a minimally competent AI decision-maker?*

DIAL starts from a deliberately pessimistic assumption: **AI has no role.** The default is that the task is too difficult for AI and only humans can navigate it. DIAL then provides the mechanism to prove otherwise, one decision at a time.

## Key Principles

- **Human Primacy**: The human is always right — not because humans are infallible, but because humans have context that AI cannot access.
- **Progressive Collapse**: Over repeated decision cycles, measuring how well AI predicts human choices causes the multi-agent deliberation structure to progressively collapse into deterministic execution.
- **Empirical Trust**: Trust is earned through demonstrated alignment with human decisions, not assumed.

## Install

```bash
npm install dialai
```

## Quick Start

```typescript
import { createSession, registerSpecialist } from "dialai";

// Create a session with a state machine
const session = createSession({
  machineName: "my-task",
  initialState: "idle",
});

// Register an AI specialist
await registerSpecialist({
  specialistId: "specialist.my-task.proposer.gpt-4",
  machineName: "my-task",
  specialistRole: "proposer",
  modelId: "gpt-4",
});
```

## Packages

| Package | Description |
|---|---|
| `dialai` | Core library — engine, types, in-memory store, CLI, MCP server |
| `dialai/store-postgres` | PostgreSQL store implementation (Kysely) |
| `dialai/migrations` | Database migration runner for PostgreSQL |

## Documentation

Full documentation is available at [https://eloquentanalytics.github.io/dialai/](https://eloquentanalytics.github.io/dialai/).

## Development

```bash
npm install          # Install dependencies
npm test             # Run tests
npm run build        # Build
npm run typecheck    # Type check
npm run lint         # Lint
npm run ci           # Full CI pipeline
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development workflow and guidelines.

## License

[MIT](LICENSE)
