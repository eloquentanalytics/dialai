# DIAL Reference Implementation Architecture

This document provides implementation guidance for generating the `src/` and `tests/` directories from scratch. Read this alongside `website/docs/` which contains the authoritative specification for types, API behavior, and concepts.

---

## File Structure

```
src/dialai/
  index.ts          # Public exports (re-export from api.ts, types.ts)
  types.ts          # All type definitions (from docs/api/types.md)
  store.ts          # In-memory state (Maps)
  api.ts            # Core API functions
  engine.ts         # runSession convenience function
  strategies.ts     # Built-in consensus strategy implementations
  cli.ts            # CLI entry point
  mcp.ts            # MCP server implementation
  http-server.ts    # HTTP transport wrapper
  proxy-client.ts   # Client for remote servers
  config.ts         # Environment variable handling
  utils.ts          # File loading utilities

tests/
  integration/      # End-to-end decision cycle tests
  fixtures/         # Test machine definitions
  examples/         # Example machine tests
```

---

## Store Design

Simple in-memory Maps with no business logic:

```typescript
export const sessions: Map<string, Session> = new Map();
export const specialists: Map<string, Specialist | Arbiter> = new Map();
export const proposals: Map<string, Proposal> = new Map();
export const votes: Map<string, Vote> = new Map();

export function clear(): void { /* clear all maps */ }
```

All API functions read from and write to these maps. No persistence layer.

---

## Implementation Order

1. **types.ts** - Translate docs/api/types.md to TypeScript
2. **store.ts** - Four Maps + clear()
3. **strategies.ts** - Implement four consensus strategies from docs/concepts/consensus-strategies.md
4. **api.ts** - Implement each function per its docs/api/*.md spec
5. **engine.ts** - runSession loops: propose -> vote (if 2+ proposals) -> arbitrate -> execute
6. **Unit tests** - Co-located as `*.test.ts`, use Vitest, call `clear()` in beforeEach
7. **cli.ts** - Argument parsing, mode detection, output formatting
8. **mcp.ts** - Wrap API functions as MCP tools using @modelcontextprotocol/sdk
9. **http-server.ts** - StreamableHTTPServerTransport + Bearer auth
10. **proxy-client.ts** - HTTP client that implements same API interface

---

## Testing Strategy

**Unit tests**: `src/dialai/*.test.ts` (co-located)
- Framework: Vitest
- Pattern: `beforeEach(() => clear())` for isolation
- Cover each API function's documented behavior

**Integration tests**: `tests/integration/`
- Full decision cycles through example machines
- CLI execution tests
- MCP tool invocation tests

**Examples as tests**: `examples/*.json` should all run successfully via CLI

---

## Key Implementation Notes

### Strategy Invocation
When `submitProposal`/`submitVote` called without explicit values, look up specialist's execution mode and invoke appropriately. The five modes are documented in docs/api/types.md.

### Round ID Staleness
- Sessions track `roundId` (starts at 1)
- Proposals/votes record their roundId at submission
- Increment roundId on state transition
- Arbitration marks stale if roundId mismatch

### Error Handling
- Return descriptive messages, don't throw for expected conditions (no consensus, staleness)
- Validate execution mode fields match exactly one of the five patterns

### Dependencies
- `@modelcontextprotocol/sdk` for MCP/HTTP transport
- Node stdlib only otherwise
- TypeScript strict mode

---

## CLI Mode Detection

```
npx dialai machine.json           # Run mode: load JSON, runSession(), output results
npx dialai --mcp                  # MCP mode: stdio transport
DIALAI_PORT=3000 npx dialai --mcp # HTTP mode: StreamableHTTPServerTransport
DIALAI_BASE_URL=... npx dialai --mcp # Proxy mode: forward to remote server
```

The CLI registers a built-in proposer using `firstProposal` strategy for simple execution.
