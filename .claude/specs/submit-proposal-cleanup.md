# submitProposal: Remove `final*` Prefix Pattern

## Executive Summary

Refactor `submitProposal` in `api.ts` to drop the `final*` variable prefix introduced in commit `0f273a9`. Instead of destructuring all opts fields as `const` and then creating parallel `let final*` variables, destructure the immutable fields as `const` and declare the mutable ones as `let` directly. Also bring `metaJson` into the same pattern so strategy-returned `metaJson` flows to the proposal.

## Objective

Simplify `submitProposal` so the "opts wins, strategy fills gaps" merging logic reads naturally without the `final*` indirection, and add `metaJson` to the merge pattern so it works identically to the other fields.

## In Scope

- Refactor variable declarations in `submitProposal`
- Bring `metaJson` into the same `let` / `??=` pattern as `costUSD`, `latencyMsec`, etc.
- Update existing tests if assertions reference the old behavior
- Add `metaJson` to `ProposerStrategyResult` (if not already there from the enriched-transitions spec)

## Out of Scope

- Changes to `submitArbitration` (it doesn't have the `final*` pattern)
- Changes to any other function

## Assumptions and Constraints

- `ProposerStrategyResult` must have an optional `metaJson` field. If the enriched-transitions spec runs first, it will already exist. If this spec runs first, add it.
- The merge semantics are: caller-provided opts value wins; strategy-returned value fills the gap.
- `transitionName`, `toState`, and `reasoning` also follow the same pattern — they just don't use the `final*` prefix inconsistently (they already do use it). Clean those up too.

## Files to Modify

| File | Action |
|------|--------|
| `src/dialai/api.ts` | Refactor `submitProposal` variable declarations |
| `src/dialai/types.ts` | Add `metaJson` to `ProposerStrategyResult` if not already present |
| `tests/unit/submit-proposal.test.ts` | Add tests for metaJson merging |
| `website/docs/api/types.md` | Add `metaJson` field to `ProposerStrategyResult` docs |
| `.claude/skills/dial-machine/references/api-reference.md` | Add `metaJson` field to `ProposerStrategyResult` docs |

## Implementation Plan

### Phase 1: Refactor `submitProposal`

**Before (current code, lines 639-717):**

```typescript
export async function submitProposal(
  opts: SubmitProposalOptions
): Promise<Proposal> {
  const {
    sessionId,
    specialistId,
    roundId,
    transitionName,
    reasoning,
    metaJson,
    costUSD,
    latencyMsec,
    numInputTokens,
    numOutputTokens,
  } = opts;
  // ...
  let finalTransitionName = transitionName;
  let finalToState: string | undefined;
  let finalReasoning = reasoning;
  let finalCostUSD = costUSD;
  let finalLatencyMsec = latencyMsec;
  let finalNumInputTokens = numInputTokens;
  let finalNumOutputTokens = numOutputTokens;

  if (!finalTransitionName) {
    // ...
    finalTransitionName = result.transitionName;
    finalToState = result.toState;
    finalReasoning = finalReasoning ?? result.reasoning;
    finalCostUSD = finalCostUSD ?? result.costUSD;
    // ...
  }

  const proposal: Proposal = {
    // ...
    transitionName: finalTransitionName,
    toState: finalToState,
    reasoning: finalReasoning ?? "",
    metaJson,                          // <-- BUG: ignores strategy metaJson
    costUSD: finalCostUSD,
    // ...
  };
}
```

**After:**

```typescript
export async function submitProposal(
  opts: SubmitProposalOptions
): Promise<Proposal> {
  const { sessionId, specialistId, roundId } = opts;

  let transitionName = opts.transitionName;
  let toState: string | undefined;
  let reasoning = opts.reasoning;
  let metaJson = opts.metaJson;
  let costUSD = opts.costUSD;
  let latencyMsec = opts.latencyMsec;
  let numInputTokens = opts.numInputTokens;
  let numOutputTokens = opts.numOutputTokens;

  const session = await getSession(sessionId);
  const specialist = await getStore().getSpecialist(specialistId);

  if (!specialist) {
    throw new Error(`Specialist not found: ${specialistId}`);
  }

  if (specialist.role !== "proposer") {
    throw new Error(`Specialist ${specialistId} is not a proposer`);
  }

  const proposer = specialist;
  const effectiveRoundId = roundId ?? session.currentRoundId;
  const isHuman = proposer.isHuman ?? false;

  if (!transitionName) {
    const ctx = buildProposerContext(session);
    const result = await invokeProposerStrategy(proposer, ctx);
    transitionName = result.transitionName;
    toState = result.toState;
    reasoning = reasoning ?? result.reasoning;
    metaJson = metaJson ?? result.metaJson;
    costUSD = costUSD ?? result.costUSD;
    latencyMsec = latencyMsec ?? result.latencyMsec;
    numInputTokens = numInputTokens ?? result.numInputTokens;
    numOutputTokens = numOutputTokens ?? result.numOutputTokens;
  } else {
    const currentStateDef = session.machine.states[session.currentState];
    if (!currentStateDef?.transitions?.[transitionName]) {
      throw new Error(
        `Invalid transition "${transitionName}" from state "${session.currentState}"`
      );
    }
    toState = currentStateDef.transitions[transitionName];
  }

  const proposal: Proposal = {
    proposalId: generateUUID(),
    sessionId,
    roundId: effectiveRoundId,
    specialistId,
    isHuman,
    transitionName,
    toState,
    reasoning: reasoning ?? "",
    metaJson,
    costUSD,
    latencyMsec,
    numInputTokens,
    numOutputTokens,
    createdAt: new Date(),
  };

  await getStore().setProposal(proposal);
  return proposal;
}
```

Key changes:
1. `const` destructuring only for truly immutable fields: `sessionId`, `specialistId`, `roundId`
2. All mutable fields declared as `let` from `opts.*`
3. No `final*` prefix anywhere
4. `metaJson` follows the same `??=` pattern as the metrics fields
5. `toState` replaces `finalToState` (was already the only one using a different name)

### Phase 2: Add `metaJson` to `ProposerStrategyResult`

In `types.ts`, add to `ProposerStrategyResult` if not already present:

```typescript
/** Structured metadata from the strategy (e.g., tool arguments) */
metaJson?: Record<string, unknown>;
```

**Validate:** `npm run typecheck`

### Phase 3: Tests

**In `tests/unit/submit-proposal.test.ts`:**

**Test 1: strategy-returned metaJson flows to proposal**

```
Setup: strategyFn returns { transitionName: "approve", toState: "approved", reasoning: "r", metaJson: { key: "from-strategy" } }
Call:   submitProposal({ sessionId, specialistId }) — no metaJson in opts
Assert: proposal.metaJson deep-equals { key: "from-strategy" }
```

**Test 2: caller-provided metaJson takes precedence over strategy metaJson**

```
Setup: same strategyFn returning metaJson: { key: "from-strategy" }
Call:   submitProposal({ sessionId, specialistId, metaJson: { key: "from-caller" } })
Assert: proposal.metaJson deep-equals { key: "from-caller" }
```

**Test 3: no metaJson from either source**

```
Setup: strategyFn returns { transitionName: "approve", toState: "approved", reasoning: "r" } (no metaJson)
Call:   submitProposal({ sessionId, specialistId })
Assert: proposal.metaJson is undefined
Assert: no crash
```

Existing tests (`strategy metrics flow to proposal`, `opts override strategy metrics`, `backward compat — no metrics from strategy`) must continue to pass without modification.

**Validate:** `npm run ci`

### Phase 4: Update Documentation

**`website/docs/api/types.md` — `ProposerStrategyResult` section:**

Add `metaJson` to the interface listing. Currently shows:

```typescript
interface ProposerStrategyResult {
  transitionName: string;
  toState: string;
  reasoning: string;
  costUSD?: number;
  latencyMsec?: number;
  numInputTokens?: number;
  numOutputTokens?: number;
}
```

Add after `reasoning`:

```typescript
  metaJson?: Record<string, unknown>; // Structured metadata (e.g., tool arguments)
```

Update the prose above the code block to mention metaJson: "The optional metric and metadata fields are merged into the resulting `Proposal` when the strategy is invoked via `submitProposal`. Values passed via `SubmitProposalOptions` take precedence over strategy-returned values."

**`.claude/skills/dial-machine/references/api-reference.md` — same change:**

Add `metaJson` to `ProposerStrategyResult` in the same position.

## Acceptance Criteria

### Functional

- `submitProposal` has no variables with the `final` prefix
- Immutable fields (`sessionId`, `specialistId`, `roundId`) are `const` destructured
- Mutable fields (`transitionName`, `reasoning`, `metaJson`, `costUSD`, `latencyMsec`, `numInputTokens`, `numOutputTokens`, `toState`) are `let` declarations
- `metaJson` merging follows the same `opts ?? strategy` pattern as the metrics fields
- Strategy-returned `metaJson` flows to the proposal when caller doesn't provide it
- Caller-provided `metaJson` takes precedence over strategy-returned `metaJson`

### Quality

- All existing `submit-proposal.test.ts` tests pass unchanged
- All existing tests across the project pass
- `npm run typecheck` passes
- `npm run lint` passes

### Operational

- `npm run ci` passes

## Failure and Recovery Rules

1. If `npm run lint` complains about variable shadowing (the `let` declarations shadow the destructured names), that means the `const` destructuring still includes those fields. Remove them from the destructuring.
2. If existing tests break, check that the proposal construction object uses the same field names (no `final*` prefix).
3. The `toState` line in the `else` branch (`toState = currentStateDef.transitions[transitionName]`) will need updating if the enriched-transitions spec has already run (it would return a `TransitionDefinition` instead of a string). If so, use `typeof` check.

## Completion Signal

Output exactly `COMPLETE` only when:
- All acceptance criteria are met
- `npm run ci` passes
- No `final*` variables remain in `submitProposal`

## Ralph Prompt Draft

```
Refactor submitProposal in src/dialai/api.ts to remove the final* variable prefix.

Spec location: .claude/specs/submit-proposal-cleanup.md

The current code destructures all opts fields as const, then creates parallel
let final* variables for the mutable ones. This is noisy and metaJson was
missed (line 708 uses raw opts.metaJson, so strategy-returned metaJson never
reaches the proposal).

Required changes:
- const destructure only: sessionId, specialistId, roundId
- let declarations for: transitionName, toState, reasoning, metaJson, costUSD,
  latencyMsec, numInputTokens, numOutputTokens (initialized from opts.*)
- Strategy merge block: field = field ?? result.field (no final prefix)
- metaJson follows the same pattern as the metrics fields
- Proposal construction uses the let variables directly (no final prefix)
- Add metaJson to ProposerStrategyResult in types.ts if not already present

Tests to add in tests/unit/submit-proposal.test.ts:
1. Strategy-returned metaJson flows to proposal when caller omits it
2. Caller-provided metaJson wins over strategy-returned metaJson
3. No metaJson from either source — proposal.metaJson is undefined

Docs to update:
- website/docs/api/types.md — add metaJson to ProposerStrategyResult
- .claude/skills/dial-machine/references/api-reference.md — same

Acceptance criteria:
- No final* variables in submitProposal
- metaJson merges with same opts-wins semantics as costUSD etc.
- All existing tests pass unchanged
- npm run ci passes

Output exactly COMPLETE when all criteria are met.
```
