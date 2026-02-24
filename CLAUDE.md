# CLAUDE.md — Instructions for AI Coding Agents

## Project Overview

DIAL (Dynamic Integration between AI and Labor) is a TypeScript framework for coordinating AI and human specialists making decisions within state machines. It implements progressive collapse — the idea that multi-agent deliberation structures can collapse into deterministic execution as AI alignment with human decisions is empirically demonstrated.

## Repository Structure

```
src/dialai/          # Core library source
  engine.ts          # Core DIAL engine (session lifecycle, tick loop)
  types.ts           # All TypeScript type definitions
  store.ts           # Store interface
  store-memory.ts    # In-memory store implementation
  store-postgres.ts  # PostgreSQL store (Kysely)
  alignment.ts       # Alignment tracking
  evaluation.ts      # Consensus evaluation
  strategies.ts      # Built-in specialist strategies
  exemplars.ts       # Exemplar management
  api.ts             # Programmatic API
  http-server.ts     # HTTP server
  mcp.ts             # Model Context Protocol server
  cli.ts             # CLI entry point
  llm.ts             # LLM integration
  config.ts          # Configuration
  migrations/        # PostgreSQL migrations
tests/
  unit/              # Unit tests
  integration/       # Integration tests
  e2e/               # End-to-end tests
  fixtures/          # Test fixtures (machine definitions)
examples/            # Example machines and usage
website/             # Docusaurus documentation site
```

## Key Commands

```bash
npm run build        # Build with TypeScript compiler
npm test             # Run all tests (vitest)
npm run typecheck    # Type check without emitting
npm run lint         # ESLint
npm run ci           # Full CI pipeline (typecheck + lint + test + build)
```

## Architecture Notes

- **Single package** published as `dialai` on npm with subpath exports for `dialai/store-postgres` and `dialai/migrations`
- **Store interface** (`Store` in `store.ts`) is the abstraction over persistence — in-memory and PostgreSQL implementations exist
- **Engine** (`engine.ts`) orchestrates the decision cycle: solicit proposals → evaluate consensus → execute transition
- **Specialists** are either proposers (suggest state transitions) or arbiters (evaluate consensus)
- **Alignment** is a 0-1 score tracking how well a specialist's proposals match human decisions
- **Progressive collapse** means high-alignment specialists eventually run autonomously

## Conventions

- ESM-only (`"type": "module"` in package.json)
- Strict TypeScript with no explicit any
- Tests colocated in `src/` (unit) and `tests/` (integration, e2e)
- Prettier for formatting, ESLint for linting
- Pre-commit hooks via Husky
