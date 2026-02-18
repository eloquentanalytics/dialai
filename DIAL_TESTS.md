# DIAL Framework — Comprehensive Test Plan

All tests target the `dialai` TypeScript library API. No CLI, MCP, or HTTP API tests.

---

## Parallel Testing Strategy

### Framework: Vitest (already configured)

The project uses Vitest 1.0.0 with `globals: true` and `environment: "node"`. The library is pure in-memory logic with no DOM, no network, and no filesystem — ideal for maximum parallelism.

### Architecture for Speed

```
src/dialai/
  __tests__/
    unit/
      session.test.ts              # DIAL_001–DIAL_010
      machine-validation.test.ts   # DIAL_011–DIAL_025
      register-proposer.test.ts    # DIAL_026–DIAL_037
      register-arbiter.test.ts     # DIAL_049–DIAL_055
      submit-proposal.test.ts      # DIAL_056–DIAL_071
      execute-transition.test.ts   # DIAL_104–DIAL_114
      evaluate-consensus.test.ts   # DIAL_115–DIAL_127
      submit-arbitration.test.ts   # DIAL_128–DIAL_142
      strategy-proposer.test.ts    # DIAL_143–DIAL_150
      strategy-arbiter.test.ts     # DIAL_171–DIAL_197
      alignment.test.ts            # DIAL_198–DIAL_211
      exemplars.test.ts            # DIAL_212–DIAL_222
      evaluation.test.ts           # DIAL_223–DIAL_236
      enable-disable.test.ts       # DIAL_237–DIAL_248
      query-helpers.test.ts        # DIAL_249–DIAL_259
      engine-helpers.test.ts       # DIAL_260–DIAL_267
      store.test.ts                # DIAL_268–DIAL_276
    integration/
      decision-cycle.test.ts       # DIAL_277–DIAL_284
      cold-start.test.ts           # DIAL_285–DIAL_290
      alignment-growth.test.ts     # DIAL_291–DIAL_295
      execution-modes.test.ts      # DIAL_296–DIAL_304
      multi-state.test.ts          # DIAL_305–DIAL_311
      proposal-validation.test.ts  # DIAL_312–DIAL_316
      threshold.test.ts            # DIAL_317–DIAL_326
      human-primacy.test.ts        # DIAL_327–DIAL_335
    e2e/
      run-session.test.ts          # DIAL_345–DIAL_352
      progressive-collapse.test.ts # DIAL_353–DIAL_358
      proposal-clustering.test.ts  # DIAL_359–DIAL_362
      self-healing.test.ts         # DIAL_363–DIAL_367
      trip-line.test.ts            # DIAL_368–DIAL_372
      champion-mode.test.ts        # DIAL_373–DIAL_377
      multi-machine.test.ts        # DIAL_378–DIAL_382
      complex-topology.test.ts     # DIAL_383–DIAL_387
      semantic-isolation.test.ts   # DIAL_388–DIAL_392
      edge-cases.test.ts           # DIAL_393–DIAL_407
      consensus-math.test.ts       # DIAL_408–DIAL_415
```

### Three Layers of Parallelism

**Layer 1 — File-level parallelism (automatic)**
Vitest runs every test *file* in a separate worker thread by default. With 37 test files,
Vitest will saturate all CPU cores.

**Layer 2 — Test-level concurrency within a file (`describe.concurrent`)**
Unit tests within a single file are independent pure-function calls. Mark entire
`describe` blocks as concurrent so every `test()` inside runs in parallel via `Promise.all`:

```typescript
// session.test.ts
import { clear } from "../../store";

describe.concurrent("DIAL_001–DIAL_010: Session Management", () => {
  test("DIAL_001: creates session with valid machine definition", async () => {
    clear();
    const session = await createSession(twoStateMachine());
    expect(session.sessionId).toBeDefined();
    expect(session.currentState).toBe("draft");
  });
});
```

**Layer 3 — CI sharding across machines**
```bash
vitest run --pool=threads --reporter=blob --shard=1/4
vitest run --pool=threads --reporter=blob --shard=2/4
vitest run --pool=threads --reporter=blob --shard=3/4
vitest run --pool=threads --reporter=blob --shard=4/4
vitest run --merge-reports
```

### Vitest Config

```typescript
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts", "tests/**/*.test.ts"],
    passWithNoTests: true,
    pool: "threads",
    maxConcurrency: 20,
    isolate: false,
    fileParallelism: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/", "dist/", "**/*.test.ts",
        "**/*.config.ts", "tests/fixtures/**",
      ],
    },
  },
});
```

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **`pool: "threads"`** | Faster than forks for pure in-memory logic. |
| **`isolate: false`** | Library uses `store.clear()`. Each test calls it in setup. Removes VM overhead per file. |
| **`maxConcurrency: 20`** | Pure sync/async logic with zero I/O. Higher than default 5 is safe. |
| **`describe.concurrent`** | Unit tests are independent. Running concurrently within a file cuts per-file time. |
| **37 small files** | More files = more workers saturated. Prevents single-file bottleneck. |
| **Factory functions** | Each test calls `twoStateMachine()` etc. No shared mutable state. |
| **`store.clear()` per test** | Since `isolate: false`, tests share module-level store. Clear prevents contamination. |
| **Integration/E2E: selective concurrency** | Multi-step flows use `describe` (sequential) with `beforeEach(() => clear())`. |

---

## Unit Tests

### 1. Session Management (`createSession`, `getSession`, `getSessions`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_001 | creates session with valid machine definition | `createSession` returns a session with a unique `sessionId`, `currentState === initialState`, empty `history`, stored `machine` deep-equals input, a generated `roundId`, and a `createdAt` timestamp |
| DIAL_005 | each session gets unique ID and roundId | Two calls to `createSession` produce different `sessionId` and `currentRoundId` values |
| DIAL_007 | getSession retrieves by ID | Session returned by `getSession(id)` matches the one from `createSession` |
| DIAL_008 | getSession rejects unknown ID | Calling `getSession("nonexistent")` throws `"Session not found"` |
| DIAL_009 | getSessions returns all sessions | After creating N sessions, `getSessions()` returns N entries |
| DIAL_010 | getSessions returns empty array initially | Before any creation, `getSessions()` returns `[]` |

### 2. Machine Definition Validation (`validateMachine`, `normalizeMachine`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_011 | rejects non-object input | `validateMachine(null)` and `validateMachine("string")` throw |
| DIAL_012 | rejects machine missing machineName | Error: "missing or invalid machineName" |
| DIAL_013 | rejects machine with empty machineName | `machineName: ""` throws |
| DIAL_014 | rejects machine missing initialState | Error: "missing or invalid initialState" |
| DIAL_015 | rejects machine missing goalState | Error: "missing or invalid goalState" |
| DIAL_016 | rejects machine with missing states | Error when `states` is undefined |
| DIAL_017 | rejects machine where initialState not in states | Error: `initialState "X" does not exist in states` |
| DIAL_018 | rejects machine where goalState not in states | Error: `goalState "X" does not exist in states` |
| DIAL_019 | rejects transition pointing to non-existent state | Transition target not in states throws with transition name and target |
| DIAL_020 | accepts machine with minimal valid definition | Machine with initialState, goalState, and one state with transitions works |
| DIAL_021 | accepts state with no transitions (goal state) | A goal state with no transitions field is valid |
| DIAL_022 | normalizeMachine maps legacy defaultState to goalState | Input with `defaultState` but no `goalState` gets `goalState` populated |
| DIAL_023 | accepts state with custom consensusThreshold | State with `consensusThreshold: 0.7` is stored correctly |
| DIAL_024 | machine-level consensusThreshold stored | `MachineDefinition.consensusThreshold` roundtrips through session |
| DIAL_025 | machine-level specialists array stored | `MachineDefinition.specialists` with `SpecialistDefinition[]` roundtrips |

### 3. Specialist Registration — Proposers (`registerProposer`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_026 | registers proposer with strategyFn (mode 1) | `registerProposer({ specialistId, machineName, strategyFn })` succeeds, returns `Proposer` with `role: "proposer"` |
| DIAL_027 | registers proposer with strategyWebhookUrl (mode 2) | Requires both `strategyWebhookUrl` and `webhookTokenName` |
| DIAL_028 | registers proposer with contextFn + modelId (mode 3) | Both fields required, registration succeeds |
| DIAL_029 | registers proposer with contextWebhookUrl + modelId (mode 4) | All three fields (`contextWebhookUrl`, `modelId`, `webhookTokenName`) required |
| DIAL_030 | registers proposer with strategyFnName (mode 5) | Built-in strategy name like `"firstAvailable"` succeeds |
| DIAL_031 | registers human proposer | `isHuman: true` stored on proposer |
| DIAL_032 | rejects multiple execution modes | Error: "Multiple execution modes specified" when both strategyFn and strategyFnName provided |
| DIAL_033 | rejects no execution mode | Error: "No execution mode specified" |
| DIAL_034 | rejects unknown strategyFnName | Error: `Unknown proposer strategy: "nonexistent"` |
| DIAL_035 | rejects duplicate specialistId | Error: `Specialist already exists` |
| DIAL_036 | registers proposer with optional threshold | `threshold` stored for built-in strategies |
| DIAL_037 | proposer stored in specialists map | After registration, `getSpecialist(id)` returns the proposer |

### 5. Specialist Registration — Arbiters (`registerArbiter`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_049 | registers arbiter with strategyFn | Deterministic function accepted, `role: "arbiter"` |
| DIAL_050 | registers arbiter with strategyFnName | Built-in like `"aheadByK"` accepted |
| DIAL_051 | registers arbiter with strategyWebhookUrl | Webhook mode accepted |

### 6. Proposal Submission (`submitProposal`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_056 | submits proposal via strategyFn invocation | When `transitionName` omitted, specialist's `strategyFn` is invoked |
| DIAL_057 | submits direct proposal with transitionName | When `transitionName` provided, no strategy invoked — stored directly |
| DIAL_058 | proposal gets unique proposalId | Each proposal has a distinct UUID |
| DIAL_060 | proposal uses session's currentRoundId when roundId omitted | `effectiveRoundId` defaults to `session.currentRoundId` |
| DIAL_065 | proposal stores cost tracking fields | `costUSD`, `latencyMsec`, `numInputTokens`, `numOutputTokens` stored |
| DIAL_066 | proposal stores toState from transition definition | Target state matches `machine.states[currentState].transitions[name]` |
| DIAL_068 | rejects proposal for non-existent session | Error: `Session not found` |
| DIAL_069 | rejects proposal from non-registered specialist | Error: `Specialist not found` |
| DIAL_070 | rejects proposal from non-proposer specialist | Error: `Specialist X is not a proposer` when specialist is not a proposer |
| DIAL_071 | rejects direct proposal for invalid transition | Error: `Invalid transition "X" from state "Y"` |

### 9. Transition Execution (`executeTransition`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_104 | executes valid transition | Session `currentState` updates to target state |
| DIAL_105 | records transition in history | `history` gains entry with `transitionName`, `reasoning`, `executionTimestamp` |
| DIAL_106 | generates new roundId after transition | `currentRoundId` differs from pre-transition value |
| DIAL_107 | clears proposals after transition | Old round's proposals deleted from store |
| DIAL_110 | rejects transition not in current state | Error: `Invalid transition "X" from state "Y"` |
| DIAL_111 | rejects when current state has no transitions | Error: `No transitions available from state "X"` |
| DIAL_112 | rejects toState mismatch | Error: `State mismatch: transition "X" should go to "Y", not "Z"` when provided `toState` doesn't match definition |
| DIAL_113 | preserves machine definition across transitions | `session.machine` unchanged |

### 10. Consensus Evaluation (`evaluateConsensus`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_115 | requires arbiter registered | Throws `No arbiter registered for machine` when no arbiter |
| DIAL_116 | returns consensusReached=false with no proposals | No proposals means no consensus |
| DIAL_117 | is read-only — does not execute transition | After `evaluateConsensus`, session `currentState` unchanged |
| DIAL_118 | returns winningProposalId when consensus reached | Identifies the winning proposal |
| DIAL_119 | returns reasoning explaining consensus decision | Non-empty reasoning string |
| DIAL_125 | builds alignment scores in arbiter context | `ctx.alignmentScores` populated from `getAllAlignmentRecords` |
| DIAL_127 | arbiter threshold defaults to 1 when not set | `arbiter.threshold ?? 1` used |

### 11. Arbitration (`submitArbitration`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_128 | evaluates consensus and executes transition when reached | Without `transitionName`, if consensus met, transition executed |
| DIAL_129 | returns executed=false when consensus not reached | No forced transition, consensus below threshold |
| DIAL_130 | returns stale=true when roundId doesn't match | Stale round detection: `effectiveRoundId !== session.currentRoundId` |
| DIAL_131 | returns guardsPass=false when no proposals exist | Guard reason: "No proposals in current round" |
| DIAL_132 | human can force transition via transitionName | With `transitionName` + human `specialistId`, bypasses consensus |
| DIAL_133 | forced transition requires isHuman specialist | Returns `guardsPass: false`, reason: "Only human specialists can force arbitration" |
| DIAL_134 | forced transition validates transition is valid | Invalid transition returns `guardsPass: false` with transition error |
| DIAL_135 | forced transition creates exemplar | `createExemplar` called with proposals from the round |
| DIAL_136 | forced transition updates alignment for all specialists | `updateAlignmentAfterHumanDecision` called with proposals from the round |
| DIAL_137 | forced transition executes immediately | Session state updates, `executed: true` |
| DIAL_138 | returns isHuman=true for human-forced decisions | `ArbitrationResult.isHuman` reflects forced human decision |
| DIAL_139 | returns all cost tracking fields | `arbitrationId`, `costUSD`, `latencyMsec`, etc. populated |
| DIAL_140 | returns guardReason explaining why guards failed | Non-empty reason string when `guardsPass=false` |
| DIAL_141 | winning proposal not found returns guardsPass=false | When `evaluateConsensus` returns a proposalId that doesn't exist in store |
| DIAL_142 | uses winning proposal's reasoning when no reasoning provided | `reasoning ?? winningProposal.reasoning` |

### 12. Built-in Proposer Strategies

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_143 | firstAvailable picks first transition by insertion order | From `{approve: "X", reject: "Y"}`, picks "approve" (first key) |
| DIAL_144 | lastAvailable picks last transition by insertion order | Picks last key |
| DIAL_145 | random picks from available transitions | Result is one of the valid transitions (statistical check over many runs) |
| DIAL_146 | weightedRandom picks from available transitions | Currently uniform random — result is one of valid transitions |
| DIAL_147 | firstAvailable with single transition | Returns that transition |
| DIAL_148 | random with single transition | Returns that transition |
| DIAL_149 | firstAvailable throws with no transitions | Error: "No transitions available from current state" |
| DIAL_150 | all proposer strategies return ProposerStrategyResult shape | `transitionName`, `toState`, `reasoning` all present |

### 15. Built-in Arbiter Strategies

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_171 | firstProposal: returns first proposal by timestamp | Sorts by `createdAt`, picks earliest |
| DIAL_172 | firstProposal: no proposals returns consensusReached=false | Reasoning: "No proposals received" |
| DIAL_173 | aheadByK: single proposal with threshold<=1 reaches consensus | Consensus reached: "Single proposal with no competing proposals" |
| DIAL_175 | aheadByK: multiple proposals counted per transition correctly | Proposals counted per transition, lead >= threshold = consensus |
| DIAL_178 | aheadByK: default threshold is 1 | `ctx.threshold ?? 1` |

### 16. Alignment Score Tracking

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_198 | new AI specialist starts at alignment 0 | `getAlignmentScore` returns 0 for unknown specialist |
| DIAL_199 | human specialist always returns alignment 1.0 | `getAlignmentScore` returns 1.0 when `isHuman: true` |
| DIAL_200 | isHumanSpecialist returns true for human-registered specialist | Checks `isHuman` flag on stored specialist |
| DIAL_201 | isHumanSpecialist returns false for unknown specialist | Not in store returns false |
| DIAL_202 | updateAlignment increments matching choices | `matched: true` adds 1 to matchingChoices and totalComparisons |
| DIAL_203 | updateAlignment increments only totalComparisons on mismatch | `matched: false` adds 0 to matchingChoices, 1 to totalComparisons |
| DIAL_204 | updateAlignment creates new record for first comparison | New AlignmentRecord with correct initial values |
| DIAL_205 | updateAlignment skips human specialists | No alignment record created for human |
| DIAL_206 | alignment score is matchingChoices/totalComparisons | After 18 matches in 20 comparisons gives 0.9 |
| DIAL_207 | updateAlignmentAfterHumanDecision checks proposers | Proposer that matched human transition gets `matched: true` |
| DIAL_211 | getAllAlignmentRecords filters by machineName | Only records for specified machine returned |

### 17. Exemplar Creation and Storage

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_212 | createExemplar stores exemplar in store | Exemplar appears in `exemplars` map |
| DIAL_213 | exemplar has unique exemplarId | UUID generated |
| DIAL_214 | exemplar stores machineName and state | Correct values |
| DIAL_215 | exemplar stores context (ProposerContext) | Full `sessionId`, `currentState`, `prompt`, `transitions`, `history` |
| DIAL_216 | exemplar stores humanTransitionName and humanToState | Human's chosen transition and target |
| DIAL_217 | exemplar stores copies of proposals | Proposals array is a copy (not a reference) — mutation of originals doesn't affect exemplar |
| DIAL_220 | exemplar stores createdAt timestamp | Date field present |
| DIAL_221 | getExemplars returns all exemplars for a machine | Filtered by machineName |
| DIAL_222 | getExemplars filters by state when provided | Optional state parameter narrows results |

### 18. Evaluation Module (`evaluateAlignment`, `evaluateAccuracy`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_223 | evaluateAlignment returns correct score from exemplars | Compares specialist's proposals against human transitions in exemplars |
| DIAL_224 | evaluateAlignment counts matching proposals | Proposal with same transitionName as exemplar's humanTransitionName |
| DIAL_227 | evaluateAlignment with maxRounds limits exemplars checked | Only first N exemplars evaluated |
| DIAL_228 | evaluateAlignment returns 0 with no exemplars | `totalExemplars: 0, alignmentScore: 0` |
| DIAL_230 | evaluateAccuracy returns transitionMatchRate | Correct ratio of matching transitions |
| DIAL_231 | evaluateAccuracy returns stateMatchRate | Correct ratio of matching target states |
| DIAL_232 | evaluateAccuracy returns totalCostUSD | Sum of `costUSD` across proposals |
| DIAL_233 | evaluateAccuracy returns avgLatencyMsec | Average of non-null `latencyMsec` values |
| DIAL_234 | evaluateAccuracy with lookback limits exemplars | Only last N exemplars evaluated |
| DIAL_235 | evaluateAccuracy returns 0 rates with no matching proposals | Specialist never proposed in exemplars |

### 19. Enable/Disable Specialists

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_237 | enableSpecialist sets enabled=true | Specialist's `enabled` field becomes `true` |
| DIAL_238 | disableSpecialist sets enabled=false | Specialist's `enabled` field becomes `false` |
| DIAL_239 | enableSpecialist throws for unknown specialist | Error: `Specialist not found` |
| DIAL_241 | newly registered specialist has enabled undefined (treated as true) | `enabled` defaults to undefined, which `getEnabledProposers` treats as enabled |
| DIAL_242 | disabled proposer excluded from getEnabledProposers | `enabled: false` filtered out |
| DIAL_244 | disabled arbiter excluded from getEnabledArbiter | Returns undefined when sole arbiter disabled |
| DIAL_247 | re-enabling a disabled specialist works | `disableSpecialist` then `enableSpecialist` restores |
| DIAL_248 | enable/disable does not affect alignment history | Alignment records unchanged after disable/re-enable |

### 20. Query Helpers

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_249 | getSpecialist returns specialist by ID | Correct specialist returned |
| DIAL_250 | getSpecialist returns undefined for unknown ID | Not an error, returns undefined |
| DIAL_251 | getProposers returns all proposers for a machine | Filtered by machineName and role |
| DIAL_252 | getProposers returns empty array for unknown machine | No error |
| DIAL_254 | getArbiter returns arbiter for a machine | Single arbiter returned |
| DIAL_255 | getArbiter returns undefined when no arbiter registered | No error |
| DIAL_256 | getProposalsForRound returns proposals for session+round | Filtered by both sessionId and roundId |
| DIAL_259 | round query helpers return empty arrays for unknown round | No error |

### 21. Engine Helpers (`getEffectiveThreshold`, `selectChampion`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_260 | getEffectiveThreshold uses state-level threshold first | State `consensusThreshold: 0.3` overrides all others |
| DIAL_261 | getEffectiveThreshold falls back to machine-level | Machine `consensusThreshold: 0.6` when state has none |
| DIAL_262 | getEffectiveThreshold falls back to arbiter threshold | Arbiter `threshold: 0.7` when machine has none |
| DIAL_263 | getEffectiveThreshold defaults to 0.5 | No threshold anywhere returns 0.5 |
| DIAL_264 | selectChampion returns highest-alignment proposer above threshold | Proposer with alignment 0.9 selected when threshold 0.8 |
| DIAL_265 | selectChampion returns undefined when no proposer qualifies | All alignment below threshold |
| DIAL_266 | selectChampion only considers enabled proposers | Disabled proposer with high alignment skipped |
| DIAL_267 | selectChampion uses CHAMPION_THRESHOLD of 0.8 | Default threshold for champion selection |

### 22. Store Operations

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_268 | clear() empties all 5 maps | sessions, specialists, proposals, alignmentRecords, exemplars |
| DIAL_274 | alignmentRecords map keyed by specialistId:machineName | Key format is `"specialistId:machineName"` |
| DIAL_276 | clear() allows fresh test isolation | After clear, all operations work as if fresh start |

---

## Integration Tests

### 23. Decision Cycle — Proposal Through Consensus

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_277 | single proposer unanimous consensus | One proposer with alignment 0.9, threshold 0.5, margin 1.0, consensus on proposal alone |
| DIAL_278 | two proposers agree — combined proposal count consensus | Both propose same transition, proposal counts add, consensus reached |
| DIAL_281 | proposals clustered by transition not by proposal ID | Two proposals for "approve" (different reasoning) cluster together |
| DIAL_282 | consensus triggers transition execution via arbitration | `submitArbitration` after consensus leads to session advancing |

### 24. Cold Start — Human Decision Flow

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_285 | cold start: all AI proposals contribute 0 alignment | New specialists, all alignment 0, every score = 0 |
| DIAL_286 | cold start: aheadByK returns "Cold start" | Reasoning indicates human input required |
| DIAL_287 | cold start: human force decision succeeds | Human specialist with `isHuman: true` forces transition |
| DIAL_288 | cold start: exemplar generated on force | Exemplar created with full round context |
| DIAL_289 | cold start: alignment scores update for all participants | Every specialist's contribution compared to human choice |
| DIAL_290 | first alignment data enables future contributions | After round 1 human decision, aligned specialists contribute non-zero |

### 25. Progressive Alignment Growth

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_291 | alignment grows with consistent matching | Specialist matching 10/10 times gives alignment = 1.0 |
| DIAL_292 | alignment decreases with mismatches | Specialist matching 5/10 gives 0.5 |
| DIAL_293 | high-alignment specialist reaches consensus faster | Higher alignment = more likely to cross margin at same threshold |
| DIAL_294 | low-alignment specialist insufficient alone | 0.3 alignment at threshold 0.5 never reaches threshold without help |

### 26. Specialist Execution Modes Integration

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_300 | strategyFnName resolves to built-in and executes | `"firstAvailable"` resolves to actual function that produces valid proposal |
| DIAL_301 | contextFn return value passed to LLM call | (mock LLM) context string from function appears in LLM request |

### 27. Multi-State Machine Traversal

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_305 | session traverses 2-state machine | initialState to goalState with one transition |
| DIAL_306 | session traverses 3-state linear machine | A to B to C through two decision cycles |
| DIAL_307 | session traverses branching machine | State with multiple transitions, different paths to goal |
| DIAL_308 | history records all transitions in order | After traversing A to B to C, history has 2 entries in order |
| DIAL_309 | roundId regenerated at each state transition | Each state gets a fresh roundId |
| DIAL_310 | state prompt changes per state | Different states have different prompts visible to specialists |
| DIAL_311 | transitions available change per state | Specialists see only transitions valid from current state |

### 28. Proposal Validation Integration

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_314 | proposal for transition from wrong state rejected | Transition exists in machine but not from current state |
| DIAL_315 | proposals from multiple specialists in same round | All stored and scored correctly |

### 29. Consensus Threshold Behavior

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_317 | threshold 0.0: any single aligned proposal reaches consensus | Lowest bar |
| DIAL_318 | threshold 0.5: leader needs sufficient margin over runner-up | Margin 0.49 fails, 0.51 succeeds |
| DIAL_319 | threshold 0.9: near-unanimity required | Only overwhelming agreement succeeds |
| DIAL_320 | threshold 1.0: requires margin of 1.0 | Only possible with zero runner-up score |
| DIAL_321 | per-state threshold overrides machine default | State A at 0.3 and state B at 0.8 produce different consensus behavior |
| DIAL_322 | machine-level threshold overrides arbiter threshold | Priority chain respected |

### 30. Human Primacy Integration

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_330 | human force bypasses consensus score entirely | Human can force different transition than consensus winner |

---

## End-to-End Tests

### 31. Full Session Lifecycle via `runSession`

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_345 | runSession drives 2-state machine to goalState | Creates session, runs cycles, returns completed session |
| DIAL_346 | runSession drives multi-state machine to goalState | 4-state machine: all intermediate states traversed |
| DIAL_347 | runSession terminates when goalState reached | `currentState === goalState` upon return |
| DIAL_348 | runSession history records all transitions | Complete audit trail in returned session |
| DIAL_349 | runSession registers default firstAvailable proposer when none specified | `__default_proposer_` created |
| DIAL_350 | runSession registers default firstProposal arbiter when none specified | `__default_arbiter_` created |
| DIAL_351 | runSession registers specialists from machine.specialists array | SpecialistDefinition[] auto-registered |
| DIAL_352 | runSession returns session in current state when exhausted (no consensus) | Waiting for human, not an error |

### 32. Cold Start — Calibration — Autonomous Consensus (Progressive Collapse)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_353 | round 1 cold start: all AI alignment 0, blocks for human | System solicits all specialists, scores all 0, blocks |
| DIAL_354 | round 1 human force: exemplar created, alignment begins | Human forces decision, all specialists' alignment updated |
| DIAL_355 | rounds 2-5 calibration: alignment scores grow | Each human decision increases matching specialists' alignment |
| DIAL_356 | first autonomous round: high-alignment proposer reaches consensus | After sufficient calibration, AI can decide without human |
| DIAL_357 | full progressive collapse: cold start through champion mode | Many rounds, alignment growth, autonomous consensus, reduced participation |
| DIAL_358 | exemplar flywheel: specialists improve with more exemplars | Growing exemplar context (verifiable via mock strategyFn inspecting context) |

### 33. Proposal Clustering End-to-End

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_359 | two proposers same transition — combined score | Alignment 0.8 + 0.6 = 1.4 for that transition |
| DIAL_360 | three proposers 2-agree-1-disagrees — majority clusters | Two proposers for "approve" outweigh one for "reject" |
| DIAL_361 | clustering with different reasoning but same transition | Different reasoning strings still cluster by `transitionName` |
| DIAL_362 | cluster score correctly used in margin calculation | Clustered score in margin formula |

### 34. Self-Healing and Re-enablement End-to-End

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_363 | selfHeal re-enables all disabled proposers | After calling selfHeal, all specialists enabled |
| DIAL_364 | champion fast path failure triggers selfHeal | Champion fails to reach consensus, selfHeal called |
| DIAL_365 | self-healing preserves alignment history | Re-enabled specialists retain their alignment scores |
| DIAL_366 | disabled specialists not solicited in runSession | `getEnabledProposers` filters them out |
| DIAL_367 | re-enabled specialists can reach consensus in next iteration | After selfHeal, full cascade runs with all specialists |

### 35. Trip Line (Alignment Degradation) End-to-End

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_368 | champion alignment drops below CHAMPION_THRESHOLD triggers selfHeal | After execution, alignment checked, selfHeal called if below 0.8 |
| DIAL_369 | trip line reverts to full solicitation cascade | Champion mode exits, all specialists re-enabled, full cascade next round |
| DIAL_370 | trip line preserves exemplar corpus | Historical exemplars retained after revert |
| DIAL_371 | re-calibration after trip line | New alignment data collected in full cascade mode |
| DIAL_372 | champion mode re-entered when alignment recovers | After recalibration, selectChampion finds qualified proposer again |

### 36. Champion Mode End-to-End

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_373 | champion identified as highest-alignment proposer above 0.8 | `selectChampion` returns correct ID |
| DIAL_374 | champion mode: only champion solicited for proposal | Other proposers not called |
| DIAL_375 | champion mode: consensus reached on champion's proposal alone | Fast path works |
| DIAL_376 | champion mode: falls through to full cascade when consensus not reached | selfHeal called, then full cascade |
| DIAL_377 | champion mode: skip already-submitted champion in full cascade | Doesn't duplicate champion's proposal |

### 37. Multi-Machine Isolation

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_378 | specialists scoped to their machineName | Specialist registered for machine A not returned by `getProposers("B")` |
| DIAL_379 | alignment tracked per machine | Same specialist has independent alignment records for different machines |
| DIAL_380 | exemplars scoped per machine | `getExemplars("A")` doesn't return machine B's exemplars |
| DIAL_381 | concurrent sessions on different machines | Two sessions on different machines run independently |
| DIAL_382 | concurrent sessions on same machine | Two sessions share specialists but have independent proposals |

### 38. Complex State Machine Topologies

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_383 | cycle in state machine (non-goal state loops) | A to B to A to B to C (goalState). Handles loops |
| DIAL_384 | diamond-shaped machine | A to B, A to C, B to D, C to D. Both paths reach goal |
| DIAL_385 | state with many transitions | State with 10+ possible transitions — specialists see all options |
| DIAL_386 | deep linear machine | 10-state chain. All transitions happen in sequence |
| DIAL_387 | machine with dead-end states | State with no transitions to goal — system handles gracefully |

### 39. Semantic Isolation Verification

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_388 | ProposerContext does not contain consensus scores | No scoring internals in context |
| DIAL_389 | ProposerContext does not contain alignment scores | No alignment values visible |
| DIAL_392 | exemplars in ProposerContext are domain-native | History records contain transitions, not scoring metadata |

### 40. Edge Cases and Error Recovery

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_393 | session already at goalState — runSession returns immediately | `initialState === goalState` completes with no transitions |
| DIAL_394 | zero specialists registered — runSession registers defaults and completes | Default proposer + arbiter auto-registered |
| DIAL_395 | specialist strategyFn throws error | System propagates error without corrupting session |
| DIAL_396 | specialist strategyFn returns malformed proposal | Strategy result missing fields causes error |
| DIAL_397 | empty transitions on non-goal state | `executeTransition` throws "No transitions available" |
| DIAL_398 | very large number of proposals in single round | Performance/correctness with 100+ proposals |
| DIAL_400 | rapid sequential submitProposal calls | All stored correctly without race conditions |
| DIAL_401 | submitArbitration called with no proposals | guardsPass=false, executed=false |
| DIAL_402 | submitArbitration called twice in same round | Second call after transition sees stale roundId |
| DIAL_403 | metaJson with deeply nested objects | Complex metadata roundtrips correctly |
| DIAL_404 | Unicode in reasoning and prompt fields | International characters handled |
| DIAL_405 | extremely long reasoning strings | No truncation or corruption |
| DIAL_406 | proposal submitted to wrong session | Only affects the correct session |

### 41. Consensus Math Verification (Exact Calculations)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_408 | worked example: 2 proposers, threshold 0.5, both agree | Score = 0.9+0.6 = 1.5, margin = 1.0 >= 0.5 |
| DIAL_410 | worked example: 3 proposers, 2 agree, 1 disagrees | Cluster of 2 vs solo — verify exact margin |
| DIAL_414 | boundary: margin exactly equals threshold | Consensus reached (>= not >) |
| DIAL_415 | boundary: margin one epsilon below threshold | Consensus not reached |
