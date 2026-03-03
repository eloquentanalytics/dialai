# Strategy Result Operational Metrics

## Executive Summary

Extend `ProposerStrategyResult` with optional operational fields (`costUSD`, `latencyMsec`, `numInputTokens`, `numOutputTokens`) so that when `submitProposal` invokes a strategy internally, the resulting proposal carries the same cost and latency data it would carry if the caller had submitted explicitly.

## Objective

Close the data gap between the two `submitProposal` paths so both produce proposals with full operational metrics.

## In Scope

- Extend `ProposerStrategyResult` in `types.ts` with four optional fields
- Update `executeProposerLlm` in `llm.ts` to capture timing and token usage from `callLlm`
- Update `invokeProposerStrategy` in `api.ts` to use `ProposerStrategyResult` as its return type
- Update `submitProposal` in `api.ts` to merge strategy-returned metrics into the proposal
- Unit tests for the new behavior
- Verify all existing tests still pass

## Out of Scope

- Changing `callLlm`'s return type or signature
- Changing `ArbiterStrategyResult`
- Adding `costUSD` calculation to `executeProposerLlm`
- Webhook proposer timing (`executeProposerWebhook`)
- Changes to `executeContextWebhookProposer` (it delegates to `executeProposerLlm`; metrics cascade automatically)

## Assumptions and Constraints

- `callLlm` returns `{ content: string; usage?: { prompt_tokens?: number; completion_tokens?: number } }` — confirmed at `llm.ts:110-115`
- `executeProposerLlm` currently discards `usage` and does not measure wall-clock time
- `submitProposal` opts values (`costUSD`, `latencyMsec`, etc.) take precedence over strategy-returned values when both present
- `ProposerStrategyResult` is the return type for `strategyFn`, `executeProposerLlm`, `executeProposerWebhook`, and `executeContextWebhookProposer`
- Custom `strategyFn` implementations are not required to return the new fields (they are optional)
- `invokeProposerStrategy` is a private function in `api.ts` with explicit return type that must be updated

## Files to Modify

| File | Action |
|------|--------|
| `src/dialai/types.ts` | Add 4 optional fields to `ProposerStrategyResult` |
| `src/dialai/llm.ts` | Update `executeProposerLlm` to capture timing + usage |
| `src/dialai/api.ts` | Update `invokeProposerStrategy` return type; update `submitProposal` to merge metrics |
| `tests/unit/submit-proposal.test.ts` | Add 3 new tests |
| `src/dialai/llm.test.ts` | Add 1 new test |

## Files to Read (do not modify)

| File | Why |
|------|-----|
| `src/dialai/llm-audit.test.ts` | Mock patterns for `callLlm` |
| `src/dialai/store.ts` | Understand `Proposal` storage |

## Implementation Plan

### Phase 1: Extend the type

In `src/dialai/types.ts`, add four optional fields to `ProposerStrategyResult` (after `reasoning`):

```typescript
export interface ProposerStrategyResult {
  transitionName: string;
  toState: string;
  reasoning: string;
  /** Cost in USD to produce this result, if known */
  costUSD?: number;
  /** Wall-clock time in milliseconds, if measured */
  latencyMsec?: number;
  /** Input tokens consumed, if known */
  numInputTokens?: number;
  /** Output tokens consumed, if known */
  numOutputTokens?: number;
}
```

**Validate:** Run `npm run typecheck`. This is backward-compatible; expect no errors.

### Phase 2: Update `executeProposerLlm`

In `src/dialai/llm.ts`, the function currently (lines 238-259) calls `callLlm`, parses the JSON, and returns the parsed result directly. Update it to:

1. Record `Date.now()` before calling `callLlm`
2. Compute `latencyMsec` after `callLlm` returns
3. Extract `usage.prompt_tokens` and `usage.completion_tokens` from the result
4. Return an explicit object with the three existing fields plus the three new measurement fields

The try/catch structure must be preserved. The `as ProposerStrategyResult` cast on the parsed JSON should be removed in favor of explicit field extraction (to avoid casting an object that lacks the metric fields into the type that now declares them).

**Validate:** Run `npm test`. All existing tests must pass.

### Phase 3: Update `invokeProposerStrategy` and `submitProposal`

**Step 3a:** In `src/dialai/api.ts`, change the return type of `invokeProposerStrategy` (line 569) from `Promise<{ transitionName: string; toState: string; reasoning: string }>` to `Promise<ProposerStrategyResult>`. Import `ProposerStrategyResult` if not already imported. No other changes to this function are needed — it already delegates to functions that return `ProposerStrategyResult`.

**Step 3b:** In `submitProposal`, update the strategy-invocation branch. Before the `if (!finalTransitionName)` block, declare:

```typescript
let finalCostUSD = costUSD;
let finalLatencyMsec = latencyMsec;
let finalNumInputTokens = numInputTokens;
let finalNumOutputTokens = numOutputTokens;
```

Inside the block, after setting `finalReasoning`, add:

```typescript
finalCostUSD = finalCostUSD ?? result.costUSD;
finalLatencyMsec = finalLatencyMsec ?? result.latencyMsec;
finalNumInputTokens = finalNumInputTokens ?? result.numInputTokens;
finalNumOutputTokens = finalNumOutputTokens ?? result.numOutputTokens;
```

Then use the `final*` variables in the proposal construction object instead of the raw `costUSD`, `latencyMsec`, `numInputTokens`, `numOutputTokens`.

**Validate:** Run `npm run typecheck && npm test`. All must pass.

### Phase 4: Tests

Add these tests:

**In `src/dialai/llm.test.ts`:**

1. **`executeProposerLlm` returns metrics.** Mock `callLlm` to return `{ content: '{"transitionName":"close","toState":"closed","reasoning":"test"}', usage: { prompt_tokens: 100, completion_tokens: 50 } }`. Assert the result includes `latencyMsec` (a number > 0), `numInputTokens` (100), `numOutputTokens` (50).

**In `tests/unit/submit-proposal.test.ts`:**

2. **Strategy metrics flow to proposal.** Register a proposer with a `strategyFn` that returns `{ transitionName: "t", toState: "s", reasoning: "r", latencyMsec: 500, numInputTokens: 200, numOutputTokens: 80 }`. Call `submitProposal({ sessionId, specialistId })` without `transitionName`. Assert the stored proposal has `latencyMsec: 500`, `numInputTokens: 200`, `numOutputTokens: 80`.

3. **Opts override strategy metrics.** Same setup as test 2, but call `submitProposal({ sessionId, specialistId, latencyMsec: 999 })`. Assert proposal has `latencyMsec: 999` (opts wins), `numInputTokens: 200` (strategy fills gap).

4. **Backward compat — no metrics from strategy.** Register a proposer with a `strategyFn` that returns `{ transitionName: "t", toState: "s", reasoning: "r" }` (no metric fields). Call `submitProposal` without `transitionName`. Assert the proposal is created with `latencyMsec: undefined`, `numInputTokens: undefined`. No crash.

**Validate:** Run `npm run ci`. All must pass (typecheck + lint + test + build).

## Acceptance Criteria

### Functional

- `ProposerStrategyResult` has optional `costUSD`, `latencyMsec`, `numInputTokens`, `numOutputTokens` fields
- `executeProposerLlm` returns `latencyMsec` and token counts from the underlying `callLlm` response
- `invokeProposerStrategy` return type is `ProposerStrategyResult`
- `submitProposal` populates proposal metrics from strategy result when caller does not provide them via opts
- Caller-provided opts values always take precedence over strategy-returned values

### Quality

- Existing `strategyFn` implementations that do not return the new fields continue to work
- All existing tests pass without modification
- New tests cover: metrics flow, opts precedence, backward compat

### Operational

- `npm run ci` passes (typecheck + lint + test + build)

## Failure and Recovery Rules

1. Run `npm run typecheck` after Phase 1. Run `npm test` after Phases 2 and 3. Run `npm run ci` after Phase 4.
2. If adding fields to `ProposerStrategyResult` causes type errors, verify they are marked optional. If a destructure or spread assumes the exact shape, update it.
3. If `executeProposerLlm` tests fail because `callLlm` is hard to mock, follow the pattern in `src/dialai/llm-audit.test.ts` (mock `globalThis.fetch`, set `OPENROUTER_API_TOKEN`).
4. If changing `invokeProposerStrategy` return type causes downstream type errors, check that `submitProposal` correctly accesses the new optional fields with nullish coalescing.
5. Do not declare completion while any acceptance criterion is unmet.

## Completion Signal

Output exactly `COMPLETE` only when:
- All acceptance criteria are met
- `npm run ci` passes
- No blocking errors remain

## Ralph Prompt Draft

```
Implement operational metrics on ProposerStrategyResult.

Spec location: .claude/specs/proposal-metadata-update.md

Constraints:
- Do not change callLlm's return type or signature
- Do not change ArbiterStrategyResult
- Do not modify executeContextWebhookProposer (metrics cascade from executeProposerLlm)
- All new fields on ProposerStrategyResult must be optional

Files to modify:
- src/dialai/types.ts (ProposerStrategyResult)
- src/dialai/llm.ts (executeProposerLlm)
- src/dialai/api.ts (invokeProposerStrategy return type, submitProposal merge logic)
- tests/unit/submit-proposal.test.ts (3 new tests)
- src/dialai/llm.test.ts (1 new test)

Required deliverables:
- ProposerStrategyResult has optional costUSD, latencyMsec, numInputTokens, numOutputTokens
- executeProposerLlm returns latencyMsec and token counts from callLlm
- invokeProposerStrategy return type updated to ProposerStrategyResult
- submitProposal merges strategy metrics into proposal (opts take precedence)
- 4 new tests covering metrics flow, opts precedence, and backward compat

Acceptance criteria:
- npm run ci passes (typecheck + lint + test + build)
- All existing tests pass without modification
- New tests verify: (1) executeProposerLlm returns metrics, (2) strategy metrics flow to proposal, (3) opts override strategy metrics, (4) missing metrics don't crash

Execution rules:
1. Work in phase order: types → llm.ts → api.ts → tests
2. Run npm run typecheck after Phase 1
3. Run npm test after Phases 2 and 3
4. Run npm run ci after Phase 4
5. If tests fail, inspect and fix the root cause before continuing
6. If blocked after 3 attempts on the same issue, report the blocker

Output exactly COMPLETE when all criteria are met.
```
