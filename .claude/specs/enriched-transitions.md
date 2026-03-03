# Enriched Transitions

## Spec Weaknesses Found (from original draft)

1. **Code sample typos throughout** — `tnsName` for `transName`, `inace` for `interface`, `constrMessage` for `const userMessage`, `systemMes` for `systemMessage`, `resu.reasoning` for `result.reasoning`, `OpenAIToolDefinitionl` for `OpenAIToolDefinition[] | null`, `detions` for `definitions`, `rseModelId` for `parseModelId`, `stringstring` for `string, string`. Ralph would copy these verbatim and waste time debugging.
2. **Phase 8 tests are numbered paragraphs, not testable code** — no file locations, no assertion details, no permutation matrix for the callLlm/callLlmWithTools decision tree.
3. **Missing: `classifyArbitration` type signature update** — its `currentStateTransitions` parameter is typed `Record<string, string> | undefined`. After this change, callers pass `Record<string, string | TransitionDefinition>`. The function itself reads `currentStateTransitions[transitionName]` to get a toState string. This is a type error after enrichment unless `classifyArbitration` is updated or receives only pre-extracted data.
4. **Missing: export declarations** — `TransitionDefinition` must be exported from `types.ts`. `ToolCallResult`, `NoToolCallError`, `callLlmWithTools` must be exported from `llm.ts`. The spec never says this.
5. **Missing: `submitProposal` stores `metaJson` from opts only** — line 708 in `api.ts` uses `metaJson` (the destructured opts value), not `finalMetaJson`. Strategy-returned `metaJson` would never reach the proposal without changing this line.
6. **Duplication of `callLlm` in `callLlmWithTools`** — 80% of the code is identical (fetch, audit, error handling). Spec acknowledges this in Failure Rule 3 but gives no guidance. Decision: extract a shared `callLlmRaw` helper or accept duplication. This must be decided upfront.
7. **Silent fallthrough on HTTP errors** — if `callLlmWithTools` gets a 500, the spec catches it and falls through to make a *second* HTTP call via `callLlm`. This doubles cost on transient failures. The fallback should only trigger on `NoToolCallError`, not on HTTP/network errors.
8. **`executeProposerLlm` existing test uses `transitions: { approve: "approved", reject: "rejected" }`** — after this change, `ProposerContext.transitions` is `Record<string, TransitionDefinition>`. That existing test breaks unless updated.

## Executive Summary

Change `StateDefinition.transitions` from `Record<string, string>` to `Record<string, string | TransitionDefinition>` so that each transition can carry a description and parameter schema alongside its target state. When a transition has parameters, DIAL builds OpenAI-compatible tool definitions and uses native function calling via a new `callLlmWithTools` function. The shorthand form (`"closed"`) remains valid and is normalized to `{ target: "closed" }` internally. `callLlm` is unchanged.

## Objective

Let transitions carry enough metadata to become tool calls, so that `executeProposerLlm` can convert them into native OpenAI `tools` automatically without a separate `tools` field or any manual construction by the consumer.

## In Scope

- New `TransitionDefinition` type with `target`, `description`, and `parameters`
- `StateDefinition.transitions` accepts both `string` (shorthand) and `TransitionDefinition` (enriched)
- `normalizeMachine` converts all shorthand transitions to `TransitionDefinition`
- `validateMachine` validates enriched transitions (target state exists, parameters is valid object)
- Internal DIAL code updated to read `.target` from normalized transitions
- `ProposerContext.transitions` changes to `Record<string, TransitionDefinition>` (normalized form)
- New `callLlmWithTools` function with dedicated `ToolCallResult` return type
- New `NoToolCallError` class thrown when model responds with text instead of a tool call
- `callLlm` is **completely unchanged**
- `executeProposerLlm` builds tools from enriched transitions and tries `callLlmWithTools` first
- `executeProposerLlm` catches `NoToolCallError` and falls back to `callLlm` text path
- `modelId[tools=no]` flag to skip tool attempt for models known not to support tools
- `ProposerStrategyResult` gets optional `metaJson` field (tool arguments)
- `submitProposal` merges strategy-returned `metaJson` into the proposal
- `classifyArbitration` parameter type updated for enriched transitions
- Existing `executeProposerLlm` test updated for new `ProposerContext.transitions` shape
- Unit tests for normalization, tool building, tool calling, text fallback, and opt-out

## Out of Scope

- Parallel tool calls (only first `tool_call` used)
- Streaming / SSE tool call responses
- Any changes to `callLlm`
- Webhook tool execution
- `tool_choice` configuration beyond the `"auto"` default
- Extracting shared HTTP/audit logic from `callLlm` and `callLlmWithTools` (accepted duplication for now)

## Assumptions and Constraints

- The shorthand form `uber_ride: "closed"` must keep working everywhere. Backward compatibility is mandatory.
- `normalizeMachine` is the single normalization point. After normalization, all runtime code sees `TransitionDefinition` objects.
- Consumer `strategyFn` implementations that access `ctx.transitions[name]` will get a `TransitionDefinition` object instead of a string. This is a **breaking change** to `ProposerContext`. Migration: `ctx.transitions[name]` becomes `ctx.transitions[name].target`.
- `callLlm` must not be modified in any way.
- `callLlmWithTools` is a separate function with its own clean return type. No union types.
- This spec depends on the operational metrics spec (`proposal-metadata-update.md`) for `latencyMsec`, `numInputTokens`, `numOutputTokens` on `ProposerStrategyResult`.
- HTTP/network errors from `callLlmWithTools` should **not** fall through to the text path. Only `NoToolCallError` triggers the fallback. This avoids doubling API cost on transient failures.
- Code duplication between `callLlm` and `callLlmWithTools` is accepted. Do not refactor shared logic.

## Files to Modify

| File | Action |
|------|--------|
| `src/dialai/types.ts` | Add `TransitionDefinition`, update `StateDefinition.transitions`, update `ProposerContext.transitions`, add `metaJson` to `ProposerStrategyResult` |
| `src/dialai/utils.ts` | Update `normalizeMachine` to normalize transitions, update `validateMachine` to handle both forms |
| `src/dialai/api.ts` | Update `buildProposerContext`, `submitProposal`, `executeTransition`, `classifyArbitration` to read `.target` |
| `src/dialai/llm.ts` | Add `callLlmWithTools`, `NoToolCallError`, `ToolCallResult`, `buildToolsFromTransitions`, `parseModelId`; update `executeProposerLlm` and `assembleProposerPrompt` |
| `src/dialai/utils.test.ts` | Add normalization tests for shorthand, enriched, and mixed transitions |
| `src/dialai/llm.test.ts` | Update existing `executeProposerLlm` test; add `callLlmWithTools` and tool-path tests |
| `src/dialai/llm-audit.test.ts` | Add audit test for `callLlmWithTools` |
| `tests/unit/submit-proposal.test.ts` | Add metaJson merging tests |
| `tests/unit/machine-validation.test.ts` | Add enriched transition validation tests |
| `tests/unit/execute-transition.test.ts` | Verify existing tests still pass with normalized transitions |

## Files to Read (do not modify)

| File | Why |
|------|-----|
| `src/dialai/store.ts` | Understand `Proposal` storage and `appendLlmAuditEntry` |
| `src/dialai/strategies.ts` | Check if any built-in strategies access `transitions` directly |

## Implementation Plan

### Phase 1: Types

**`types.ts` — new `TransitionDefinition` (export it):**

```typescript
/** A transition with optional tool-calling metadata. */
export interface TransitionDefinition {
  /** Target state this transition leads to */
  target: string;
  /** Description of what this transition/tool does (used as tool description in LLM calls) */
  description?: string;
  /** JSON Schema for the transition's parameters (used as tool parameters in LLM calls) */
  parameters?: Record<string, unknown>;
}
```

**`types.ts` — `StateDefinition.transitions`:**

```typescript
transitions?: Record<string, string | TransitionDefinition>;
```

**`types.ts` — `ProposerContext.transitions`:**

```typescript
/** Normalized transitions — always TransitionDefinition after normalization */
transitions: Record<string, TransitionDefinition>;
```

**`types.ts` — `ProposerStrategyResult.metaJson`:**

```typescript
/** Structured metadata — tool arguments land here */
metaJson?: Record<string, unknown>;
```

**Validate:** `npm run typecheck` — expect type errors in files that read `transitions` as strings. These are fixed in Phase 3.

### Phase 2: Normalization and Validation

**`utils.ts` — `normalizeMachine`:**

Add transition normalization after the existing `defaultState` migration:

```typescript
// Normalize transitions: string shorthand -> TransitionDefinition
if (normalized.states) {
  const normalizedStates: Record<string, StateDefinition> = {};
  for (const [stateName, stateDef] of Object.entries(normalized.states)) {
    if (stateDef?.transitions) {
      const normalizedTransitions: Record<string, TransitionDefinition> = {};
      for (const [transName, value] of Object.entries(stateDef.transitions)) {
        if (typeof value === "string") {
          normalizedTransitions[transName] = { target: value };
        } else {
          normalizedTransitions[transName] = value;
        }
      }
      normalizedStates[stateName] = {
        ...stateDef,
        transitions: normalizedTransitions,
      };
    } else {
      normalizedStates[stateName] = stateDef;
    }
  }
  normalized.states = normalizedStates;
}
```

Import `TransitionDefinition` and `StateDefinition` from `types.js` in `utils.ts`.

**`utils.ts` — `validateMachine`:**

Update the transition validation loop to handle both forms:

```typescript
for (const [transitionName, value] of Object.entries(transitions)) {
  const targetState = typeof value === "string" ? value : value.target;
  if (!(targetState in states)) {
    throw new Error(
      `Invalid machine definition: transition "${transitionName}" in state `
      + `"${stateName}" points to non-existent state "${targetState}"`
    );
  }
}
```

**Validate:** `npm run typecheck` after Phase 2. Some errors will remain in api.ts and llm.ts (fixed in Phase 3).

### Phase 3: Internal Code Migration

Every place that reads a transition value expecting a string must read `.target` instead.

**`api.ts` — `buildProposerContext`:**

```typescript
function buildProposerContext(session: Session): ProposerContext {
  const currentStatedef = session.machine.states[session.currentState];
  const rawTransitions = currentStatedef?.transitions ?? {};

  // Normalize for context (should already be normalized, but be safe)
  const transitions: Record<string, TransitionDefinition> = {};
  for (const [name, value] of Object.entries(rawTransitions)) {
    transitions[name] = typeof value === "string" ? { target: value } : value;
  }

  return {
    sessionId: session.sessionId,
    currentState: session.currentState,
    prompt: currentStatedef?.prompt ?? "",
    transitions,
    history: [...session.history],
    metaJson: session.metaJson,
  };
}
```

**`api.ts` — `submitProposal` line 696:**

```typescript
// Before:
finalToState = currentStateDef.transitions[finalTransitionName];

// After:
const transitionDef = currentStateDef.transitions[finalTransitionName];
finalToState = typeof transitionDef === "string" ? transitionDef : transitionDef.target;
```

**`api.ts` — `submitProposal` metaJson merging:**

Change line 708 from `metaJson,` to `metaJson: metaJson ?? finalMetaJson,` and add `let finalMetaJson: Record<string, unknown> | undefined;` alongside the other `final*` declarations. Inside the strategy invocation block, add `finalMetaJson = result.metaJson;`.

**`api.ts` — `executeTransition` line 1079:**

```typescript
// Before:
const expectedToState = currentStateDef.transitions[transitionName];

// After:
const transitionDef = currentStateDef.transitions[transitionName];
const expectedToState = typeof transitionDef === "string" ? transitionDef : transitionDef.target;
```

**`api.ts` — `classifyArbitration`:**

Update parameter type from `Record<string, string> | undefined` to `Record<string, string | TransitionDefinition> | undefined`. Update the two lines that read transition values:

```typescript
// Line 788 — existence check is unchanged (truthy check on object or string both work)
if (!currentStateTransitions?.[transitionName]) { ... }

// Line 797 — extract target
const raw = currentStateTransitions[transitionName];
const toState = typeof raw === "string" ? raw : raw.target;
return { type: "humanOverride", transitionName, toState };
```

The `ArbitrationPath` type's `humanOverride` variant has `toState: string`, which is unchanged.

**`llm.ts` — `assembleProposerPrompt`:**

```typescript
// Before:
const transitions = Object.entries(ctx.transitions)
  .map(([name, target]) => `  - "${name}" -> "${target}"`)
  .join("\n");

// After:
const transitions = Object.entries(ctx.transitions)
  .map(([name, def]) => `  - "${name}" -> "${def.target}"`)
  .join("\n");
```

**Validate:** `npm run typecheck` — should now pass. `npm test` — existing tests may fail due to `ProposerContext.transitions` shape change in `llm.test.ts`. Fix in Phase 8.

### Phase 4: Tool Building Helper

**`llm.ts` — types and helper (not exported):**

```typescript
interface OpenAIToolDefinition {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * Builds OpenAI-compatible tool definitions from enriched transitions.
 * Returns null if no transitions have descriptions or parameters.
 */
function buildToolsFromTransitions(
  transitions: Record<string, TransitionDefinition>,
): OpenAIToolDefinition[] | null {
  const tools: OpenAIToolDefinition[] = [];

  for (const [name, def] of Object.entries(transitions)) {
    if (def.description || def.parameters) {
      tools.push({
        type: "function",
        function: {
          name,
          description: def.description ?? name,
          parameters: def.parameters ?? { type: "object", properties: {} },
        },
      });
    }
  }

  return tools.length > 0 ? tools : null;
}
```

Key behavior: only transitions with `description` or `parameters` become tools. Plain `{ target: "closed" }` transitions produce no tools. If `buildToolsFromTransitions` returns `null`, there are no enriched transitions and the text path is used.

Export `buildToolsFromTransitions` for testing purposes (or use `@visibleForTesting` pattern — export it).

### Phase 5: `callLlmWithTools`

**`llm.ts` — `ToolCallResult` (export it):**

```typescript
/** Result from a successful tool-calling LLM request. */
export interface ToolCallResult {
  /** The function the model chose to call */
  name: string;
  /** Parsed arguments object */
  arguments: Record<string, unknown>;
  /** Text content from the model alongside the tool call, if any */
  reasoning: string;
  /** Token usage */
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
}
```

**`llm.ts` — `NoToolCallError` (export it):**

```typescript
/** Thrown when callLlmWithTools gets a response without tool_calls. */
export class NoToolCallError extends Error {
  /** The text content the model returned instead */
  content: string;
  usage?: { prompt_tokens?: number; completion_tokens?: number };

  constructor(
    content: string,
    usage?: { prompt_tokens?: number; completion_tokens?: number },
  ) {
    super("Model did not return a tool call");
    this.name = "NoToolCallError";
    this.content = content;
    this.usage = usage;
  }
}
```

**`llm.ts` — `callLlmWithTools` (export it):**

Follows the same structure as `callLlm` (fetch, audit, error handling) but adds `tools` and `tool_choice` to the request body and parses `tool_calls` from the response. Code is intentionally duplicated from `callLlm` — do not refactor shared logic.

The function:
1. Throws `Error` if no API token
2. Sends POST with `tools` and `tool_choice: "auto"` in the body
3. On HTTP error: throws `Error` (not `NoToolCallError`)
4. On success with `tool_calls`: returns `ToolCallResult`
5. On success without `tool_calls`: throws `NoToolCallError` with the text content
6. Writes audit entry in `finally` block (identical pattern to `callLlm`)

### Phase 6: `executeProposerLlm` with Try/Fallback

**`llm.ts` — `parseModelId`:**

```typescript
function parseModelId(raw: string): { modelId: string; useTools: boolean } {
  const match = raw.match(/^(.+?)(?:\[(.+)\])?$/);
  const modelId = match?.[1] ?? raw;
  const flags = match?.[2] ?? "";
  const useTools = !flags.includes("tools=no");
  return { modelId, useTools };
}
```

**`llm.ts` — updated `executeProposerLlm`:**

```typescript
export async function executeProposerLlm(
  contextFn: (ctx: ProposerContext) => Promise<string>,
  modelId: string,
  ctx: ProposerContext,
  auditContext?: LlmAuditContext
): Promise<ProposerStrategyResult> {
  const { modelId: actualModelId, useTools } = parseModelId(modelId);
  const context = await contextFn(ctx);
  const start = Date.now();

  // Attempt tool calling if transitions are enriched and model not opted out
  const tools = useTools ? buildToolsFromTransitions(ctx.transitions) : null;

  if (tools) {
    const systemMessage = "You are a function-calling AI assistant. "
      + "Use the provided tools to respond to the user's request.";
    const userMessage = ctx.prompt ? `${ctx.prompt}\n\n${context}` : context;

    try {
      const result = await callLlmWithTools(
        actualModelId, systemMessage, userMessage, tools, auditContext,
      );
      const latencyMsec = Date.now() - start;

      const transitionDef = ctx.transitions[result.name];
      if (!transitionDef) {
        throw new Error(
          `Tool call "${result.name}" does not match any transition from `
          + `state "${ctx.currentState}". Available: `
          + `${Object.keys(ctx.transitions).join(", ")}`,
        );
      }

      return {
        transitionName: result.name,
        toState: transitionDef.target,
        reasoning: result.reasoning,
        metaJson: Object.keys(result.arguments).length > 0 ? result.arguments : undefined,
        latencyMsec,
        numInputTokens: result.usage?.prompt_tokens,
        numOutputTokens: result.usage?.completion_tokens,
      };
    } catch (e) {
      if (e instanceof NoToolCallError) {
        // Model returned text instead of tool call.
        // Try parsing it as DIAL JSON before falling through to text path.
        try {
          const parsed = JSON.parse(e.content) as Record<string, unknown>;
          if (parsed.transitionName && parsed.toState) {
            return {
              transitionName: parsed.transitionName as string,
              toState: parsed.toState as string,
              reasoning: (parsed.reasoning as string) ?? "",
              metaJson: parsed.metaJson as Record<string, unknown> | undefined,
              latencyMsec: Date.now() - start,
              numInputTokens: e.usage?.prompt_tokens,
              numOutputTokens: e.usage?.completion_tokens,
            };
          }
        } catch { /* not parseable, fall through to text path */ }
        // Fall through to text path below
      } else {
        // HTTP errors, network errors, invalid tool name, etc.
        // Re-throw — do NOT fall through to text path for these.
        throw e;
      }
    }
  }

  // ---- TEXT PATH (existing behavior) ----
  const systemMessage = "You are a decision-making specialist in a state machine. "
    + "You must choose the best transition based on the context provided. "
    + "Respond only with valid JSON.";
  const userMessage = assembleProposerPrompt(ctx, context);

  const result = await callLlm(actualModelId, systemMessage, userMessage, auditContext);
  const latencyMsec = Date.now() - start;

  try {
    const parsed = JSON.parse(result.content) as Record<string, unknown>;
    if (!parsed.transitionName || !parsed.toState) {
      throw new Error("Missing required fields in LLM response");
    }
    return {
      transitionName: parsed.transitionName as string,
      toState: parsed.toState as string,
      reasoning: (parsed.reasoning as string) ?? "",
      metaJson: parsed.metaJson as Record<string, unknown> | undefined,
      latencyMsec,
      numInputTokens: result.usage?.prompt_tokens,
      numOutputTokens: result.usage?.completion_tokens,
    };
  } catch {
    throw new Error(`Failed to parse LLM proposer response: ${result.content}`);
  }
}
```

**Fallback sequence (corrected from original):**

1. Transitions have `description`/`parameters` + model not opted out -> call `callLlmWithTools`
2. Model returns `tool_calls` -> map to `{ transitionName, metaJson }` -> done
3. Model returns text (`NoToolCallError`) -> try parsing as DIAL JSON -> if valid, done
4. Not parseable -> fall through to fresh `callLlm` call with text-mode prompt -> done
5. HTTP/network error from `callLlmWithTools` -> **re-throw** (do NOT fall through)
6. `[tools=no]` or no enriched transitions -> skip to text path directly

### Phase 7: Update Existing Test

**`src/dialai/llm.test.ts` — fix existing `executeProposerLlm` test:**

Change `transitions: { approve: "approved", reject: "rejected" }` to `transitions: { approve: { target: "approved" }, reject: { target: "rejected" } }` to match the new `ProposerContext.transitions` type.

**Validate:** `npm run typecheck && npm test`

### Phase 8: Tests

All tests below are organized by the decision tree that `executeProposerLlm` and `callLlmWithTools` follow. Each test name includes the path it exercises.

#### Test file: `src/dialai/utils.test.ts` (normalization and validation)

**Test 1: `normalizeMachine` converts shorthand transitions to TransitionDefinition**

```
Input:  machine with transitions: { close: "closed" }
Assert: after normalizeMachine, transitions.close is { target: "closed" }
Assert: transitions.close.description is undefined
Assert: transitions.close.parameters is undefined
```

**Test 2: `normalizeMachine` preserves enriched transitions unchanged**

```
Input:  machine with transitions: { uber_ride: { target: "closed", description: "Book an Uber", parameters: { type: "object", properties: { destination: { type: "string" } } } } }
Assert: after normalizeMachine, transitions.uber_ride.target is "closed"
Assert: transitions.uber_ride.description is "Book an Uber"
Assert: transitions.uber_ride.parameters deep-equals the input parameters
```

**Test 3: `normalizeMachine` handles mixed shorthand and enriched in one state**

```
Input:  machine with transitions: { close: "closed", uber_ride: { target: "riding", description: "Book ride" } }
Assert: transitions.close is { target: "closed" }
Assert: transitions.uber_ride is { target: "riding", description: "Book ride" }
```

**Test 4: `normalizeMachine` handles states with no transitions**

```
Input:  machine with state "terminal" that has no transitions field
Assert: normalizeMachine does not throw
Assert: state "terminal" has no transitions field (or empty)
```

**Test 5: `validateMachine` accepts enriched transition pointing to valid state**

```
Input:  machine with transitions: { go: { target: "done" } }, states has "done"
Assert: validateMachine does not throw
```

**Test 6: `validateMachine` rejects enriched transition pointing to nonexistent state**

```
Input:  machine with transitions: { go: { target: "nonexistent" } }
Assert: validateMachine throws "non-existent state"
```

#### Test file: `src/dialai/llm.test.ts` (tool building, callLlmWithTools, executeProposerLlm paths)

**Decision tree for `executeProposerLlm`:**

```
Has enriched transitions (description/parameters)?
  NO  -> TEXT PATH (callLlm)
  YES -> Is [tools=no] set?
    YES -> TEXT PATH (callLlm)
    NO  -> TOOL PATH (callLlmWithTools)
      -> Model returns tool_calls?
        YES -> tool name matches a transition?
          YES -> RETURN (with metaJson from arguments)
          NO  -> THROW (invalid tool name)
        NO  -> NoToolCallError
          -> Text content is valid DIAL JSON?
            YES -> RETURN (parsed from text)
            NO  -> TEXT PATH (callLlm, fresh call)
      -> HTTP/network error?
        -> RE-THROW (do not fall through)
```

##### Group: `buildToolsFromTransitions`

**Test 7: returns OpenAI tool array for enriched transitions**

```
Input:  { book: { target: "booked", description: "Book a ride", parameters: { type: "object", properties: { dest: { type: "string" } } } } }
Assert: returns array of length 1
Assert: result[0].type is "function"
Assert: result[0].function.name is "book"
Assert: result[0].function.description is "Book a ride"
Assert: result[0].function.parameters deep-equals the input parameters
```

**Test 8: returns null for plain transitions (no description, no parameters)**

```
Input:  { close: { target: "closed" }, reopen: { target: "open" } }
Assert: returns null
```

**Test 9: returns tools only for enriched transitions in a mixed set**

```
Input:  { close: { target: "closed" }, book: { target: "booked", description: "Book" } }
Assert: returns array of length 1 (only "book")
Assert: result[0].function.name is "book"
```

**Test 10: uses transition name as description when description is omitted but parameters present**

```
Input:  { book: { target: "booked", parameters: { type: "object", properties: {} } } }
Assert: result[0].function.description is "book"
```

##### Group: `callLlmWithTools`

**Test 11: callLlmWithTools returns ToolCallResult when model uses a tool**

```
Mock fetch: returns 200 with { choices: [{ message: { tool_calls: [{ function: { name: "book", arguments: '{"dest":"airport"}' } }], content: "reasoning text" } }], usage: { prompt_tokens: 50, completion_tokens: 20 } }
Assert: result.name is "book"
Assert: result.arguments deep-equals { dest: "airport" }
Assert: result.reasoning is "reasoning text"
Assert: result.usage.prompt_tokens is 50
Assert: result.usage.completion_tokens is 20
```

**Test 12: callLlmWithTools throws NoToolCallError when model returns text only**

```
Mock fetch: returns 200 with { choices: [{ message: { content: "I chose to close" } }], usage: { prompt_tokens: 30, completion_tokens: 10 } }
Assert: throws NoToolCallError
Assert: error.content is "I chose to close"
Assert: error.usage.prompt_tokens is 30
Assert: error.usage.completion_tokens is 10
```

**Test 13: callLlmWithTools throws NoToolCallError when tool_calls is empty array**

```
Mock fetch: returns 200 with { choices: [{ message: { tool_calls: [], content: "no tools" } }] }
Assert: throws NoToolCallError
Assert: error.content is "no tools"
```

**Test 14: callLlmWithTools throws Error (not NoToolCallError) on HTTP 500**

```
Mock fetch: returns 500 with body "Internal Server Error"
Assert: throws Error with message containing "LLM API error (500)"
Assert: error is NOT instanceof NoToolCallError
```

**Test 15: callLlmWithTools throws Error on network failure**

```
Mock fetch: rejects with Error("ECONNREFUSED")
Assert: throws Error with message "ECONNREFUSED"
Assert: error is NOT instanceof NoToolCallError
```

**Test 16: callLlmWithTools handles unparseable tool arguments gracefully**

```
Mock fetch: returns 200 with { choices: [{ message: { tool_calls: [{ function: { name: "book", arguments: "not json" } }] } }] }
Assert: result.name is "book"
Assert: result.arguments deep-equals {} (empty object fallback)
```

**Test 17: callLlmWithTools handles null content alongside tool call**

```
Mock fetch: returns 200 with { choices: [{ message: { tool_calls: [{ function: { name: "book", arguments: '{}' } }], content: null } }] }
Assert: result.reasoning is "" (empty string, not null)
```

**Test 18: callLlmWithTools handles missing usage field**

```
Mock fetch: returns 200 with { choices: [{ message: { tool_calls: [{ function: { name: "book", arguments: '{}' } }] } }] } (no usage field)
Assert: result.usage is undefined
```

**Test 19: callLlmWithTools includes tools in request body**

```
Mock fetch: capture request body
Assert: body.tools is the array passed to callLlmWithTools
Assert: body.tool_choice is "auto"
```

##### Group: `callLlmWithTools` audit

**Test 20: callLlmWithTools writes audit entry on success**

```
Mock fetch: returns 200 with tool_calls
Assert: store.getLlmAuditEntries() has 1 entry
Assert: entry.requestBody contains "tools" key
Assert: entry.error is null
Assert: entry.responseStatus is 200
```

**Test 21: callLlmWithTools writes audit entry on NoToolCallError**

```
Mock fetch: returns 200 with text only (no tool_calls)
Catch the NoToolCallError (it's expected)
Assert: store.getLlmAuditEntries() has 1 entry
Assert: entry.error is null (NoToolCallError is not an "error" from the HTTP perspective)
Assert: entry.responseStatus is 200
```

**Test 22: callLlmWithTools writes audit entry on HTTP error**

```
Mock fetch: returns 500
Catch the Error
Assert: store.getLlmAuditEntries() has 1 entry
Assert: entry.error contains "LLM API error (500)"
```

**Test 23: callLlmWithTools redacts Authorization header in audit**

```
Mock fetch: returns 200 with tool_calls
Assert: audit entry requestHeaders.Authorization is "[REDACTED]"
```

##### Group: `callLlm` unchanged

**Test 24: existing callLlm tests pass without modification**

No new test needed. The existing tests in `llm.test.ts` and `llm-audit.test.ts` must continue to pass unchanged. Verify by running `npm test`.

##### Group: `executeProposerLlm` — TOOL PATH: model returns tool_calls

**Test 25: enriched transitions + model returns tool_call -> returns transitionName and metaJson**

```
Setup:
  ctx.transitions = {
    book_ride: { target: "riding", description: "Book a ride", parameters: { type: "object", properties: { destination: { type: "string" } } } },
    cancel: { target: "cancelled", description: "Cancel the request" }
  }
  modelId = "test-model" (no [tools=no])
Mock fetch: returns 200 with tool_calls: [{ function: { name: "book_ride", arguments: '{"destination":"airport"}' } }]
  usage: { prompt_tokens: 100, completion_tokens: 30 }

Assert: result.transitionName is "book_ride"
Assert: result.toState is "riding"
Assert: result.metaJson deep-equals { destination: "airport" }
Assert: result.latencyMsec is a number >= 0
Assert: result.numInputTokens is 100
Assert: result.numOutputTokens is 30
Assert: fetch was called exactly once (no fallback to callLlm)
```

**Test 26: enriched transitions + model returns tool_call with empty arguments -> metaJson is undefined**

```
Setup: same as Test 25 but tool_call arguments is '{}'
Assert: result.metaJson is undefined (empty args not stored)
Assert: result.transitionName is "book_ride"
```

**Test 27: enriched transitions + model returns tool_call with unknown tool name -> throws**

```
Setup: ctx.transitions has "book_ride" and "cancel"
Mock fetch: returns tool_calls with name: "nonexistent_tool"
Assert: throws Error containing "does not match any transition"
Assert: fetch was called exactly once (no fallback)
```

##### Group: `executeProposerLlm` — TOOL PATH: NoToolCallError with parseable DIAL JSON

**Test 28: enriched transitions + NoToolCallError + valid DIAL JSON -> returns parsed result**

```
Setup: ctx.transitions = { book: { target: "booked", description: "Book" } }
Mock fetch: returns 200 with NO tool_calls, content is '{"transitionName":"book","toState":"booked","reasoning":"chose book"}'
  usage: { prompt_tokens: 40, completion_tokens: 15 }

Assert: result.transitionName is "book"
Assert: result.toState is "booked"
Assert: result.reasoning is "chose book"
Assert: result.numInputTokens is 40
Assert: result.numOutputTokens is 15
Assert: fetch was called exactly once (no second callLlm call)
```

**Test 29: enriched transitions + NoToolCallError + valid DIAL JSON with metaJson -> metaJson preserved**

```
Mock fetch: returns content '{"transitionName":"book","toState":"booked","reasoning":"ok","metaJson":{"key":"val"}}'
Assert: result.metaJson deep-equals { key: "val" }
```

##### Group: `executeProposerLlm` — TOOL PATH: NoToolCallError with unparseable text -> full fallback

**Test 30: enriched transitions + NoToolCallError + unparseable text -> falls back to callLlm**

```
Setup: ctx.transitions = { book: { target: "booked", description: "Book" } }
Mock fetch:
  - First call: returns 200 with NO tool_calls, content is "I think you should book" (not JSON)
  - Second call: returns 200 with content '{"transitionName":"book","toState":"booked","reasoning":"fallback"}'

Assert: result.transitionName is "book"
Assert: result.toState is "booked"
Assert: result.reasoning is "fallback"
Assert: fetch was called exactly twice (one for callLlmWithTools, one for callLlm)
```

**Test 31: enriched transitions + NoToolCallError + partial DIAL JSON (missing toState) -> falls back to callLlm**

```
Mock fetch:
  - First call: returns content '{"transitionName":"book"}' (missing toState)
  - Second call: returns content '{"transitionName":"book","toState":"booked","reasoning":"ok"}'

Assert: fetch was called exactly twice
Assert: result.toState is "booked"
```

##### Group: `executeProposerLlm` — TOOL PATH: HTTP error -> re-throw (no fallback)

**Test 32: enriched transitions + HTTP 500 from callLlmWithTools -> re-throws, does not fall back**

```
Setup: ctx.transitions = { book: { target: "booked", description: "Book" } }
Mock fetch: returns 500

Assert: throws Error containing "LLM API error (500)"
Assert: fetch was called exactly once (no second call)
```

**Test 33: enriched transitions + network error from callLlmWithTools -> re-throws, does not fall back**

```
Mock fetch: rejects with Error("ECONNREFUSED")
Assert: throws Error("ECONNREFUSED")
Assert: fetch was called exactly once
```

##### Group: `executeProposerLlm` — TEXT PATH: [tools=no] opt-out

**Test 34: modelId is "test-model[tools=no]" + enriched transitions -> skips tool path, uses callLlm**

```
Setup: ctx.transitions = { book: { target: "booked", description: "Book" } }
  modelId = "test-model[tools=no]"
Mock fetch: returns 200 with content '{"transitionName":"book","toState":"booked","reasoning":"text path"}'

Assert: result.transitionName is "book"
Assert: result.reasoning is "text path"
Assert: fetch was called exactly once
Assert: request body does NOT contain "tools" key (text path, not tool path)
Assert: request body model is "test-model" (brackets stripped)
```

##### Group: `executeProposerLlm` — TEXT PATH: no enriched transitions

**Test 35: plain transitions only (no description/parameters) -> uses callLlm directly**

```
Setup: ctx.transitions = { close: { target: "closed" }, reopen: { target: "open" } }
  modelId = "test-model" (no opt-out)
Mock fetch: returns 200 with content '{"transitionName":"close","toState":"closed","reasoning":"done"}'

Assert: result.transitionName is "close"
Assert: result.toState is "closed"
Assert: fetch was called exactly once
Assert: request body does NOT contain "tools" key
```

**Test 36: text path returns metaJson from LLM response when present**

```
Setup: plain transitions
Mock fetch: returns content '{"transitionName":"close","toState":"closed","reasoning":"done","metaJson":{"key":"val"}}'

Assert: result.metaJson deep-equals { key: "val" }
```

**Test 37: text path returns undefined metaJson when LLM response omits it**

```
Setup: plain transitions
Mock fetch: returns content '{"transitionName":"close","toState":"closed","reasoning":"done"}'

Assert: result.metaJson is undefined
```

##### Group: `parseModelId`

**Test 38: parses plain model ID**

```
Input: "openai/gpt-4"
Assert: { modelId: "openai/gpt-4", useTools: true }
```

**Test 39: parses model ID with [tools=no]**

```
Input: "openai/gpt-4[tools=no]"
Assert: { modelId: "openai/gpt-4", useTools: false }
```

**Test 40: parses model ID with unknown flags (useTools defaults true)**

```
Input: "openai/gpt-4[streaming=yes]"
Assert: { modelId: "openai/gpt-4", useTools: true }
```

#### Test file: `tests/unit/submit-proposal.test.ts` (metaJson merging)

**Test 41: strategy-returned metaJson flows to proposal**

```
Setup: register proposer with strategyFn that returns { transitionName: "t", toState: "s", reasoning: "r", metaJson: { key: "from-strategy" } }
Call: submitProposal({ sessionId, specialistId }) — no transitionName, no metaJson in opts
Assert: stored proposal.metaJson deep-equals { key: "from-strategy" }
```

**Test 42: caller-provided metaJson takes precedence over strategy metaJson**

```
Setup: same strategyFn returning metaJson: { key: "from-strategy" }
Call: submitProposal({ sessionId, specialistId, metaJson: { key: "from-caller" } })
Assert: stored proposal.metaJson deep-equals { key: "from-caller" }
```

**Test 43: proposal works when neither caller nor strategy provides metaJson**

```
Setup: strategyFn returns { transitionName: "t", toState: "s", reasoning: "r" } (no metaJson)
Call: submitProposal({ sessionId, specialistId })
Assert: stored proposal.metaJson is undefined
Assert: no crash
```

#### Test file: `tests/unit/execute-transition.test.ts` (backward compat)

**Test 44: existing execute-transition tests pass without modification**

No new test needed. Existing tests use string transitions which are now normalized by `normalizeMachine` called in `createSession`. Verify by running `npm test`.

#### Test file: `tests/unit/machine-validation.test.ts`

**Test 45: validateMachine accepts machine with mixed shorthand and enriched transitions**

```
Input: machine with state "a" having transitions: { go: "b", ride: { target: "b", description: "Take a ride" } }
Assert: validateMachine does not throw
```

#### Summary: Path coverage matrix

| # | Enriched? | [tools=no]? | Tool path taken? | Model response | Fallback? | Result |
|---|-----------|-------------|------------------|----------------|-----------|--------|
| 25 | Yes | No | Yes | tool_calls with valid name | No | transitionName + metaJson |
| 26 | Yes | No | Yes | tool_calls with empty args | No | transitionName, metaJson undefined |
| 27 | Yes | No | Yes | tool_calls with unknown name | No | Throws |
| 28 | Yes | No | Yes | Text (valid DIAL JSON) | No | Parsed from text |
| 29 | Yes | No | Yes | Text (valid DIAL JSON + metaJson) | No | Parsed with metaJson |
| 30 | Yes | No | Yes | Text (not JSON) | Yes (callLlm) | From second call |
| 31 | Yes | No | Yes | Text (partial JSON) | Yes (callLlm) | From second call |
| 32 | Yes | No | Yes | HTTP 500 | No (re-throw) | Throws |
| 33 | Yes | No | Yes | Network error | No (re-throw) | Throws |
| 34 | Yes | Yes | No | Text (JSON) | N/A | From callLlm directly |
| 35 | No | No | No | Text (JSON) | N/A | From callLlm directly |
| 36 | No | No | No | Text (JSON + metaJson) | N/A | metaJson preserved |
| 37 | No | No | No | Text (JSON, no metaJson) | N/A | metaJson undefined |

## Acceptance Criteria

### Functional

- `TransitionDefinition` type exists with `target`, optional `description`, optional `parameters`
- `TransitionDefinition` is exported from `types.ts`
- `StateDefinition.transitions` accepts `Record<string, string | TransitionDefinition>`
- `normalizeMachine` converts all string transitions to `{ target: string }`
- `validateMachine` validates both shorthand and enriched transitions
- `ProposerContext.transitions` is `Record<string, TransitionDefinition>` (normalized)
- `buildToolsFromTransitions` builds OpenAI tools from enriched transitions, returns `null` for plain transitions
- `callLlmWithTools` sends tools in API request, returns `ToolCallResult` on success, throws `NoToolCallError` on text response
- `callLlmWithTools` throws `Error` (not `NoToolCallError`) on HTTP errors
- `callLlmWithTools` writes audit entry for every call
- `callLlm` is completely unchanged (no diff in `callLlm` function)
- `executeProposerLlm` tries `callLlmWithTools` when enriched transitions present and model not opted out
- `executeProposerLlm` maps `ToolCallResult.name` to `transitionName`, `.arguments` to `metaJson`, validates transition exists
- `executeProposerLlm` falls back to `callLlm` text path only on `NoToolCallError` (not on HTTP errors)
- `executeProposerLlm` re-throws HTTP/network errors from `callLlmWithTools` without fallback
- `modelId[tools=no]` skips the tool attempt
- `ProposerStrategyResult.metaJson` carries tool arguments into proposal
- `submitProposal` merges `metaJson` from strategy result; caller-provided `metaJson` takes precedence
- `classifyArbitration` parameter type updated for enriched transitions

### Quality

- No `any` types introduced (except in JSON parsing where unavoidable)
- All existing tests pass unchanged (except the one `executeProposerLlm` test updated for new `ProposerContext.transitions` shape)
- `npm run typecheck` passes
- `npm run lint` passes

### Operational

- `npm run build` produces a clean build
- `npm run ci` passes end to end
- Existing machine definitions using string transitions work without modification

## Validation and Tests

- Run: `npm run typecheck`
- Run: `npm run lint`
- Run: `npm test`
- Run: `npm run build`
- Run: `npm run ci`
- Verify: all commands exit with code 0
- Verify: a machine with `{ close: "closed" }` still works through `runSession`
- Verify: a machine with `{ uber_ride: { target: "closed", description: "...", parameters: {...} } }` triggers native tool calling

## Failure and Recovery Rules

1. Run `npm run typecheck` after Phases 1-3. Run `npm test` after each subsequent phase.
2. If the `transitions` type change causes widespread type errors, ensure `normalizeMachine` runs before any runtime access. The defensive `typeof` checks in `api.ts` handle unnormalized input.
3. If `callLlmWithTools` implementation feels like too much copy-paste from `callLlm`, that is expected. Do not refactor shared logic. The spec explicitly accepts duplication.
4. If existing machines break, the normalization in Phase 2 is incomplete. Check that `createSession` calls `normalizeMachine` and that `normalizeMachine` processes transitions.
5. The existing `executeProposerLlm` test in `llm.test.ts` will break after Phase 1 because `ProposerContext.transitions` changes type. Fix it in Phase 7 before running tests.
6. Do not declare completion while any acceptance criterion is unmet.

## Completion Signal

Output exactly `COMPLETE` only when:
- All acceptance criteria are met
- `npm run ci` passes
- No blocking errors remain
- Existing machine definitions with string transitions work without modification

## Ralph Prompt Draft

```
Implement enriched transitions for DIAL.

Spec location: .claude/specs/enriched-transitions.md

Read the spec thoroughly before starting. It contains exact code changes, a decision
tree for executeProposerLlm, and 45 specific tests with expected inputs and assertions.

Constraints:
- callLlm must not be modified in any way
- String shorthand { close: "closed" } must keep working everywhere
- normalizeMachine converts shorthand to { target: "closed" } at creation time
- After normalization all runtime code sees TransitionDefinition objects
- Defensive typeof checks in api.ts for unnormalized input
- HTTP/network errors from callLlmWithTools must re-throw, NOT fall through to text path
- Only NoToolCallError triggers the text-path fallback
- Code duplication between callLlm and callLlmWithTools is accepted — do not refactor

Required deliverables:
- TransitionDefinition type in types.ts (exported)
- Updated StateDefinition.transitions type
- Updated ProposerContext.transitions to Record<string, TransitionDefinition>
- ProposerStrategyResult gains optional metaJson field
- normalizeMachine converts string transitions
- validateMachine handles both forms
- All internal .transitions[name] reads updated to use .target
- classifyArbitration parameter type updated
- assembleProposerPrompt updated to read .target
- buildToolsFromTransitions helper (returns null for plain transitions)
- callLlmWithTools function with ToolCallResult return type (exported)
- NoToolCallError class with content and usage fields (exported)
- parseModelId for [tools=no] opt-out
- executeProposerLlm try/fallback: callLlmWithTools -> NoToolCallError -> callLlm text path
- submitProposal merges metaJson from strategy result (caller-provided takes precedence)
- Update existing executeProposerLlm test for new transitions shape
- 45 tests covering all paths per the spec's test section

Acceptance criteria:
- Existing machines with string transitions work without modification
- Enriched transitions with description/parameters trigger native tool calling
- callLlm is completely unchanged (zero diff)
- callLlmWithTools has a clean ToolCallResult return type (no union)
- NoToolCallError thrown when model responds with text instead of tool_calls
- HTTP errors from callLlmWithTools re-throw without fallback
- executeProposerLlm falls back to text path only on NoToolCallError
- modelId[tools=no] skips tool attempt entirely
- Audit entries capture tool requests and responses
- submitProposal merges strategy metaJson; caller-provided metaJson wins
- npm run ci passes

Execution rules:
1. Start with types and normalization (Phase 1-2). Run typecheck.
2. Update internal code to use .target (Phase 3). Run typecheck.
3. Add buildToolsFromTransitions helper (Phase 4). Run typecheck.
4. Implement callLlmWithTools and NoToolCallError (Phase 5). Run tests.
5. Update executeProposerLlm with try/fallback (Phase 6). Run tests.
6. Fix existing executeProposerLlm test for new transitions shape (Phase 7). Run tests.
7. Write all unit tests per the spec's Phase 8 section (45 tests). Run full ci.
8. If blocked after repeated attempts, report the blocker and smallest needed decision.
9. Do not claim completion until every acceptance criterion is satisfied.

Output exactly COMPLETE when all criteria are met.
```

## Open Questions

None. All resolved.
