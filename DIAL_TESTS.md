# DIAL Framework — Optimized Test Plan

All tests target the `dialai` TypeScript library API. No CLI, MCP, or HTTP API tests.

**Optimized from 415 to 331 tests** by eliminating redundancies per these principles:

1. **No duplicate guards** — Shared validation (e.g., "specialist not found", "duplicate specialistId") tested once at the proposer level, not re-tested for voters and arbiters
2. **Parameterized over individual** — Enum-like inputs (voteFor values, deterministic strategies) tested in one parameterized test
3. **No trivial field-storage tests** — "stores X" with no transformation removed; cost tracking and meaningful linkage fields kept
4. **Integration adds value or is removed** — Integration tests that merely repeat unit assertions (context shapes, round cleanup, cost fields) eliminated
5. **Behavior over implementation** — Tests verifying JS language guarantees (array ordering) or internal Map contents removed
6. **Sections with 2 remaining tests merged** into related sections to reduce file count

---

## Parallel Testing Strategy

### Framework: Vitest (already configured)

The project uses Vitest 1.0.0 with `globals: true` and `environment: "node"`. The library is pure in-memory logic with no DOM, no network, and no filesystem — ideal for maximum parallelism.

### Architecture for Speed

```
src/dialai/
  __tests__/
    unit/
      session.test.ts              # DIAL_001–DIAL_006
      machine-validation.test.ts   # DIAL_007–DIAL_021
      register-proposer.test.ts    # DIAL_022–DIAL_033
      register-voter.test.ts       # DIAL_034–DIAL_040
      register-arbiter.test.ts     # DIAL_041–DIAL_043
      submit-proposal.test.ts      # DIAL_044–DIAL_053
      submit-vote.test.ts          # DIAL_054–DIAL_062
      submit-selection-vote.test.ts # DIAL_063–DIAL_070
      execute-transition.test.ts   # DIAL_071–DIAL_080
      evaluate-consensus.test.ts   # DIAL_081–DIAL_093
      submit-arbitration.test.ts   # DIAL_094–DIAL_108
      strategy-proposer.test.ts    # DIAL_109–DIAL_116
      strategy-voter.test.ts       # DIAL_117–DIAL_125
      strategy-selection-voter.test.ts # DIAL_126–DIAL_130
      strategy-arbiter.test.ts     # DIAL_131–DIAL_157
      alignment.test.ts            # DIAL_158–DIAL_171
      exemplars.test.ts            # DIAL_172–DIAL_180
      evaluation.test.ts           # DIAL_181–DIAL_192
      enable-disable.test.ts       # DIAL_193–DIAL_203
      query-helpers.test.ts        # DIAL_204–DIAL_214
      engine-helpers.test.ts       # DIAL_215–DIAL_222
      store.test.ts                # DIAL_223–DIAL_225
    integration/
      decision-cycle.test.ts       # DIAL_226–DIAL_235
      cold-start.test.ts           # DIAL_236–DIAL_243
      alignment-growth.test.ts     # DIAL_244–DIAL_248
      multi-state.test.ts          # DIAL_249–DIAL_257
      threshold.test.ts            # DIAL_258–DIAL_263
    e2e/
      run-session.test.ts          # DIAL_264–DIAL_271
      progressive-collapse.test.ts # DIAL_272–DIAL_277
      proposal-clustering.test.ts  # DIAL_278–DIAL_281
      self-healing.test.ts         # DIAL_282–DIAL_286
      trip-line.test.ts            # DIAL_287–DIAL_291
      champion-mode.test.ts        # DIAL_292–DIAL_296
      multi-machine.test.ts        # DIAL_297–DIAL_301
      complex-topology.test.ts     # DIAL_302–DIAL_306
      semantic-isolation.test.ts   # DIAL_307–DIAL_311
      edge-cases.test.ts           # DIAL_312–DIAL_326
      consensus-math.test.ts       # DIAL_327–DIAL_331
```

### Three Layers of Parallelism

**Layer 1 — File-level parallelism (automatic)**
Vitest runs every test *file* in a separate worker thread by default. With 38 test files,
Vitest will saturate all CPU cores.

**Layer 2 — Test-level concurrency within a file (`describe.concurrent`)**
Unit tests within a single file are independent pure-function calls. Mark entire
`describe` blocks as concurrent so every `test()` inside runs in parallel via `Promise.all`:

```typescript
// session.test.ts
import { clear } from "../../store";

describe.concurrent("DIAL_001–DIAL_006: Session Management", () => {
  test("DIAL_001: creates session with valid machine definition", async () => {
    clear();
    const session = await createSession(twoStateMachine());
    expect(session.sessionId).toBeDefined();
    expect(session.currentState).toBe("draft");
    expect(session.history).toEqual([]);
    expect(session.machine).toEqual(twoStateMachine());
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
| **38 small files** | More files = more workers saturated. Prevents single-file bottleneck. |
| **Factory functions** | Each test calls `twoStateMachine()` etc. No shared mutable state. |
| **`store.clear()` per test** | Since `isolate: false`, tests share module-level store. Clear prevents contamination. |
| **Integration/E2E: selective concurrency** | Multi-step flows use `describe` (sequential) with `beforeEach(() => clear())`. |

---

## Unit Tests (225 tests)

### 1. Session Management (`createSession`, `getSession`, `getSessions`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_001 | creates session with valid machine definition | `createSession` returns session with unique `sessionId`, `currentState === initialState`, empty `history`, generated `roundId`, `createdAt` timestamp, and `.machine` deep-equals input |
| DIAL_002 | each session gets unique sessionId and roundId | Two calls to `createSession` produce different `sessionId` and `currentRoundId` values |
| DIAL_003 | getSession retrieves by ID | Session returned by `getSession(id)` matches the one from `createSession` |
| DIAL_004 | getSession rejects unknown ID | Calling `getSession("nonexistent")` throws `"Session not found"` |
| DIAL_005 | getSessions returns all sessions | After creating N sessions, `getSessions()` returns N entries |
| DIAL_006 | getSessions returns empty array initially | Before any creation, `getSessions()` returns `[]` |

### 2. Machine Definition Validation (`validateMachine`, `normalizeMachine`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_007 | rejects non-object input | `validateMachine(null)` and `validateMachine("string")` throw |
| DIAL_008 | rejects machine missing machineName | Error: "missing or invalid machineName" |
| DIAL_009 | rejects machine with empty machineName | `machineName: ""` throws |
| DIAL_010 | rejects machine missing initialState | Error: "missing or invalid initialState" |
| DIAL_011 | rejects machine missing goalState | Error: "missing or invalid goalState" |
| DIAL_012 | rejects machine with missing states | Error when `states` is undefined |
| DIAL_013 | rejects machine where initialState not in states | Error: `initialState "X" does not exist in states` |
| DIAL_014 | rejects machine where goalState not in states | Error: `goalState "X" does not exist in states` |
| DIAL_015 | rejects transition pointing to non-existent state | Transition target not in states throws with transition name and target |
| DIAL_016 | accepts machine with minimal valid definition | Machine with initialState, goalState, and one state with transitions works |
| DIAL_017 | accepts state with no transitions (goal state) | A goal state with no transitions field is valid |
| DIAL_018 | normalizeMachine maps legacy defaultState to goalState | Input with `defaultState` but no `goalState` gets `goalState` populated |
| DIAL_019 | accepts state with custom consensusThreshold | State with `consensusThreshold: 0.7` is stored correctly |
| DIAL_020 | machine-level consensusThreshold stored | `MachineDefinition.consensusThreshold` roundtrips through session |
| DIAL_021 | machine-level specialists array stored | `MachineDefinition.specialists` with `SpecialistDefinition[]` roundtrips |

### 3. Specialist Registration — Proposers (`registerProposer`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_022 | registers proposer with strategyFn (mode 1) | `registerProposer({ specialistId, machineName, strategyFn })` succeeds, returns `Proposer` with `role: "proposer"` |
| DIAL_023 | registers proposer with strategyWebhookUrl (mode 2) | Requires both `strategyWebhookUrl` and `webhookTokenName` |
| DIAL_024 | registers proposer with contextFn + modelId (mode 3) | Both fields required, registration succeeds |
| DIAL_025 | registers proposer with contextWebhookUrl + modelId (mode 4) | All three fields (`contextWebhookUrl`, `modelId`, `webhookTokenName`) required |
| DIAL_026 | registers proposer with strategyFnName (mode 5) | Built-in strategy name like `"firstAvailable"` succeeds |
| DIAL_027 | registers human proposer | `isHuman: true` stored on proposer |
| DIAL_028 | rejects multiple execution modes | Error: "Multiple execution modes specified" when both strategyFn and strategyFnName provided |
| DIAL_029 | rejects no execution mode | Error: "No execution mode specified" |
| DIAL_030 | rejects unknown strategyFnName | Error: `Unknown proposer strategy: "nonexistent"` |
| DIAL_031 | rejects duplicate specialistId | Error: `Specialist already exists` |
| DIAL_032 | registers proposer with optional threshold | `threshold` stored for built-in strategies |
| DIAL_033 | proposer stored in specialists map | After registration, `getSpecialist(id)` returns the proposer |

### 4. Specialist Registration — Voters (`registerVoter`)

Validation for duplicate IDs, multiple/no execution modes, and unknown strategy names is tested once in the proposer section (DIAL_028–031) since the code path is shared.

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_034 | registers pairwise voter with strategyFn | Mode 1 with `voterType: "pairwise"` (or default) |
| DIAL_035 | registers pairwise voter with strategyFnName | Built-in like `"preferA"` works |
| DIAL_036 | registers selection voter with selectionStrategyFn | `voterType: "selection"` + `selectionStrategyFn` succeeds |
| DIAL_037 | registers selection voter with strategyFnName | `voterType: "selection"` + `strategyFnName: "preferFirst"` |
| DIAL_038 | voterType defaults to "pairwise" | Omitting `voterType` results in `"pairwise"` |
| DIAL_039 | registers human voter | `isHuman: true` stored |
| DIAL_040 | voter accepts all built-in pairwise strategies | `preferA`, `preferB`, `both`, `neither`, `random`, `randomAll`, `preferGoal`, `preferShorterPath` all register |

### 5. Specialist Registration — Arbiters (`registerArbiter`)

Validation for duplicate IDs, multiple/no execution modes, and unknown strategy names is tested once in the proposer section (DIAL_028–031) since the code path is shared.

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_041 | registers arbiter with strategyFn | Deterministic function accepted, `role: "arbiter"` |
| DIAL_042 | registers arbiter with strategyFnName | Built-in like `"alignmentWeightedMargin"` accepted |
| DIAL_043 | registers arbiter with strategyWebhookUrl | Webhook mode accepted |

### 6. Proposal Submission (`submitProposal`)

Trivial field-storage tests (sessionId, specialistId, isHuman, reasoning, metaJson, createdAt) removed — these are plain property assignments with no transformation, implicitly validated by tests that use proposals.

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_044 | submits proposal via strategyFn invocation | When `transitionName` omitted, specialist's `strategyFn` is invoked |
| DIAL_045 | submits direct proposal with transitionName | When `transitionName` provided, no strategy invoked — stored directly |
| DIAL_046 | proposal gets unique proposalId | Each proposal has a distinct UUID |
| DIAL_047 | proposal uses session's currentRoundId when roundId omitted | `effectiveRoundId` defaults to `session.currentRoundId` |
| DIAL_048 | proposal stores cost tracking fields | `costUSD`, `latencyMsec`, `numInputTokens`, `numOutputTokens` stored |
| DIAL_049 | proposal stores toState from transition definition | Target state matches `machine.states[currentState].transitions[name]` |
| DIAL_050 | rejects proposal for non-existent session | Error: `Session not found` |
| DIAL_051 | rejects proposal from non-registered specialist | Error: `Specialist not found` |
| DIAL_052 | rejects proposal from non-proposer specialist | Error: `Specialist X is not a proposer` when specialist is a voter |
| DIAL_053 | rejects direct proposal for invalid transition | Error: `Invalid transition "X" from state "Y"` |

### 7. Vote Submission (`submitVote`)

"Session not found" and "specialist not found" guards tested once in proposal section (DIAL_050–051). RoundId defaulting tested once in DIAL_047.

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_054 | submits vote via strategyFn invocation | When `voteFor` omitted, specialist's `strategyFn` is invoked |
| DIAL_055 | submits direct vote with voteFor | When `voteFor` provided ("A"), stored directly |
| DIAL_056 | accepts all valid voteFor values (parameterized) | `test.each(["A", "B", "BOTH", "NEITHER"])` — all accepted |
| DIAL_057 | vote gets unique voteId | Each vote has a distinct UUID |
| DIAL_058 | vote stores proposalIdA and proposalIdB | References to compared proposals preserved |
| DIAL_059 | vote stores cost tracking fields | `costUSD`, `latencyMsec`, etc. |
| DIAL_060 | strategyFn receives correct VoterContext | Context includes `sessionId`, `currentState`, `prompt`, `proposalA`, `proposalB`, `history` |
| DIAL_061 | rejects vote from non-voter specialist | Error: `Specialist X is not a voter` |
| DIAL_062 | rejects vote with missing proposalIdA or proposalIdB | Error: `Both proposalIdA and proposalIdB are required` |

### 8. Selection Vote Submission (`submitSelectionVote`)

Shared guards (session/specialist not found, roundId defaulting, role check) tested once in earlier sections.

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_063 | submits selection vote via selectionStrategyFn | When `selectedProposalId` omitted, voter's `selectionStrategyFn` invoked |
| DIAL_064 | submits selection vote via strategyFnName | Voter with `strategyFnName` resolves to selection voter strategy |
| DIAL_065 | submits direct selection vote with selectedProposalId | When `selectedProposalId` provided, stored directly |
| DIAL_066 | selection vote gets unique selectionVoteId | Distinct UUID |
| DIAL_067 | selection vote stores cost tracking fields | All cost fields stored |
| DIAL_068 | selectionStrategyFn receives correct SelectionVoterContext | Context includes `sessionId`, `currentState`, `prompt`, `machineName`, `proposals[]`, `history` |
| DIAL_069 | rejects when no selection strategy available | Error: `No selection strategy for voter` |
| DIAL_070 | rejects when no proposal selected (strategy returns nothing) | Error: `No proposal selected` |

### 9. Transition Execution (`executeTransition`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_071 | executes valid transition | Session `currentState` updates to target state |
| DIAL_072 | records transition in history | `history` gains entry with `transitionName`, `reasoning`, `executionTimestamp` |
| DIAL_073 | generates new roundId after transition | `currentRoundId` differs from pre-transition value |
| DIAL_074 | clears proposals after transition | Old round's proposals deleted from store |
| DIAL_075 | clears votes after transition | Old round's votes deleted from store |
| DIAL_076 | clears selection votes after transition | Old round's selection votes deleted from store |
| DIAL_077 | rejects transition not in current state | Error: `Invalid transition "X" from state "Y"` |
| DIAL_078 | rejects when current state has no transitions | Error: `No transitions available from state "X"` |
| DIAL_079 | rejects toState mismatch | Error: `State mismatch: transition "X" should go to "Y", not "Z"` when provided `toState` doesn't match definition |
| DIAL_080 | preserves machine definition across transitions | `session.machine` unchanged |

### 10. Consensus Evaluation (`evaluateConsensus`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_081 | requires arbiter registered | Throws `No arbiter registered for machine` when no arbiter |
| DIAL_082 | returns consensusReached=false with no proposals | No proposals means no consensus |
| DIAL_083 | is read-only — does not execute transition | After `evaluateConsensus`, session `currentState` unchanged |
| DIAL_084 | returns winningProposalId when consensus reached | Identifies the winning proposal |
| DIAL_085 | returns reasoning explaining consensus decision | Non-empty reasoning string |
| DIAL_086 | human selection vote wins immediately | Human selection vote bypasses arbiter strategy, returns consensus with that proposal |
| DIAL_087 | human pairwise vote "A" wins immediately | Human pairwise vote for A bypasses arbiter, returns proposalIdA |
| DIAL_088 | human pairwise vote "B" wins immediately | Human pairwise vote for B returns proposalIdB |
| DIAL_089 | human pairwise vote "BOTH" does not shortcut | BOTH has no single winner, falls through to arbiter |
| DIAL_090 | human pairwise vote "NEITHER" does not shortcut | NEITHER has no winner, falls through to arbiter |
| DIAL_091 | builds alignment scores in arbiter context | `ctx.alignmentScores` populated from `getAllAlignmentRecords` |
| DIAL_092 | includes selection votes in arbiter context | `ctx.selectionVotes` populated |
| DIAL_093 | arbiter threshold defaults to 1 when not set | `arbiter.threshold ?? 1` used |

### 11. Arbitration (`submitArbitration`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_094 | evaluates consensus and executes transition when reached | Without `transitionName`, if consensus met, transition executed |
| DIAL_095 | returns executed=false when consensus not reached | No forced transition, consensus below threshold |
| DIAL_096 | returns stale=true when roundId doesn't match | Stale round detection: `effectiveRoundId !== session.currentRoundId` |
| DIAL_097 | returns guardsPass=false when no proposals exist | Guard reason: "No proposals in current round" |
| DIAL_098 | human can force transition via transitionName | With `transitionName` + human `specialistId`, bypasses consensus |
| DIAL_099 | forced transition requires isHuman specialist | Returns `guardsPass: false`, reason: "Only human specialists can force arbitration" |
| DIAL_100 | forced transition validates transition is valid | Invalid transition returns `guardsPass: false` with transition error |
| DIAL_101 | forced transition creates exemplar | `createExemplar` called with full round context |
| DIAL_102 | forced transition updates alignment for all specialists | `updateAlignmentAfterHumanDecision` called with proposals, votes, selectionVotes |
| DIAL_103 | forced transition executes immediately | Session state updates, `executed: true` |
| DIAL_104 | returns isHuman=true for human-forced decisions | `ArbitrationResult.isHuman` reflects forced human decision |
| DIAL_105 | returns all cost tracking fields | `arbitrationId`, `costUSD`, `latencyMsec`, etc. populated |
| DIAL_106 | returns guardReason explaining why guards failed | Non-empty reason string when `guardsPass=false` |
| DIAL_107 | winning proposal not found returns guardsPass=false | When `evaluateConsensus` returns a proposalId that doesn't exist in store |
| DIAL_108 | uses winning proposal's reasoning when no reasoning provided | `reasoning ?? winningProposal.reasoning` |

### 12. Built-in Proposer Strategies

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_109 | firstAvailable picks first transition by insertion order | From `{approve: "X", reject: "Y"}`, picks "approve" (first key) |
| DIAL_110 | lastAvailable picks last transition by insertion order | Picks last key |
| DIAL_111 | random picks from available transitions | Result is one of the valid transitions (statistical check over many runs) |
| DIAL_112 | weightedRandom picks from available transitions | Currently uniform random — result is one of valid transitions |
| DIAL_113 | firstAvailable with single transition | Returns that transition |
| DIAL_114 | random with single transition | Returns that transition |
| DIAL_115 | firstAvailable throws with no transitions | Error: "No transitions available from current state" |
| DIAL_116 | all proposer strategies return ProposerStrategyResult shape | `transitionName`, `toState`, `reasoning` all present |

### 13. Built-in Voter Strategies (Pairwise)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_117 | deterministic strategies return correct values (parameterized) | `test.each([["preferA","A"],["preferB","B"],["both","BOTH"],["neither","NEITHER"]])` |
| DIAL_118 | random returns A or B only | Over many runs, only A and B appear (not BOTH/NEITHER) |
| DIAL_119 | randomAll returns A, B, BOTH, or NEITHER | Over many runs, all four appear |
| DIAL_120 | preferGoal prefers proposal closer to goal | Heuristic-based comparison of proposals |
| DIAL_121 | preferGoal with equal proposals | Returns a valid choice |
| DIAL_122 | preferShorterPath prefers shorter transition name | Based on `transitionName.length` comparison |
| DIAL_123 | preferShorterPath with equal lengths | Returns a valid choice |
| DIAL_124 | preferA includes reasoning with proposal info | Reasoning references `ctx.proposalA.transitionName` |
| DIAL_125 | all pairwise strategies return VoterStrategyResult shape | `voteFor` and `reasoning` both present |

### 14. Built-in Selection Voter Strategies

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_126 | preferFirst selects earliest proposal by createdAt | Sorts by timestamp, picks first |
| DIAL_127 | preferFirst throws with no proposals | Error: "No proposals to select from" |
| DIAL_128 | preferHighestAlignment selects proposal from best-aligned specialist | Uses `getAlignmentScore` per proposal's specialistId |
| DIAL_129 | preferHighestAlignment falls back to first when no alignment data | All alignment 0, picks first proposal |
| DIAL_130 | all selection strategies return SelectionVoterStrategyResult shape | `selectedProposalId` and `reasoning` both present |

### 15. Built-in Arbiter Strategies

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_131 | firstProposal: returns first proposal by timestamp | Sorts by `createdAt`, picks earliest |
| DIAL_132 | firstProposal: no proposals returns consensusReached=false | Reasoning: "No proposals received" |
| DIAL_133 | aheadByK: single proposal with no votes and threshold<=1 | Consensus reached: "Single proposal with no competing proposals" |
| DIAL_134 | aheadByK: single proposal needs support when votes exist | Counts supporting votes vs threshold |
| DIAL_135 | aheadByK: multiple proposals tallied correctly | Votes counted per proposal, lead >= threshold = consensus |
| DIAL_136 | aheadByK: BOTH vote adds +1 to both proposals | Both proposals get a full vote |
| DIAL_137 | aheadByK: NEITHER vote adds nothing | No tallies change |
| DIAL_138 | aheadByK: default threshold is 1 | `ctx.threshold ?? 1` |
| DIAL_139 | pairwiseConsensus: single proposal wins immediately | No matchups needed |
| DIAL_140 | pairwiseConsensus: win rate calculation correct | Wins / matchups per proposal |
| DIAL_141 | pairwiseConsensus: BOTH gives 0.5 to each | Half-credit for each |
| DIAL_142 | pairwiseConsensus: NEITHER gives 0 to each | No wins awarded |
| DIAL_143 | pairwiseConsensus: default threshold is 0.75 | 75% win rate required |
| DIAL_144 | mostSimilar: exact transition match gives 0.5 base similarity | Matching transitionName = 0.5 + Jaccard on reasoning |
| DIAL_145 | mostSimilar: no gold examples returns consensusReached=false | Reasoning: "No human gold examples available" |
| DIAL_146 | mostSimilar: no proposals returns consensusReached=false | |
| DIAL_147 | mostSimilar: similarity below threshold returns false | Best score below `ctx.threshold ?? 0.8` |
| DIAL_148 | mostSimilar: requires clear winner (gap >= 0.05) | Top two within 0.05 returns false |
| DIAL_149 | alignmentWeightedMargin: consensus with margin above threshold | `(leader - runner_up) / totalAlignment >= threshold` |
| DIAL_150 | alignmentWeightedMargin: no consensus below threshold | Margin < threshold |
| DIAL_151 | alignmentWeightedMargin: cold start blocks (totalAlignment 0) | "Cold start: no alignment data available" |
| DIAL_152 | alignmentWeightedMargin: proposal clustering combines scores | Two proposers same transition: alignment scores add |
| DIAL_153 | alignmentWeightedMargin: single transition margin is 1.0 | No runner-up, margin = leader / total = 1.0 |
| DIAL_154 | alignmentWeightedMargin: BOTH vote same transition gets full alignment | Both proposals target same transition, full score |
| DIAL_155 | alignmentWeightedMargin: BOTH vote different transitions splits 0.5 each | Half alignment to each transition |
| DIAL_156 | alignmentWeightedMargin: NEITHER vote adds nothing | No score to either |
| DIAL_157 | alignmentWeightedMargin: selection votes scored by alignment | Selection vote adds voter's alignment to selected proposal's transition |

### 16. Alignment Score Tracking

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_158 | new AI specialist starts at alignment 0 | `getAlignmentScore` returns 0 for unknown specialist |
| DIAL_159 | human specialist always returns alignment 1.0 | `getAlignmentScore` returns 1.0 when `isHuman: true` |
| DIAL_160 | isHumanSpecialist returns true for human-registered specialist | Checks `isHuman` flag on stored specialist |
| DIAL_161 | isHumanSpecialist returns false for unknown specialist | Not in store returns false |
| DIAL_162 | updateAlignment increments matching choices | `matched: true` adds 1 to matchingChoices and totalComparisons |
| DIAL_163 | updateAlignment increments only totalComparisons on mismatch | `matched: false` adds 0 to matchingChoices, 1 to totalComparisons |
| DIAL_164 | updateAlignment creates new record for first comparison | New AlignmentRecord with correct initial values |
| DIAL_165 | updateAlignment skips human specialists | No alignment record created for human |
| DIAL_166 | alignment score is matchingChoices/totalComparisons | After 18 matches in 20 comparisons gives 0.9 |
| DIAL_167 | updateAlignmentAfterHumanDecision checks proposers | Proposer that matched human transition gets `matched: true` |
| DIAL_168 | updateAlignmentAfterHumanDecision checks pairwise voters | Voter who voted for matching proposal gets `matched: true` |
| DIAL_169 | updateAlignmentAfterHumanDecision checks selection voters | Selection voter who selected matching proposal gets `matched: true` |
| DIAL_170 | updateAlignmentAfterHumanDecision: BOTH vote matched when either matches | If either A or B matches human and vote is BOTH, matched |
| DIAL_171 | getAllAlignmentRecords filters by machineName | Only records for specified machine returned |

### 17. Exemplar Creation and Storage

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_172 | createExemplar stores exemplar in store | Exemplar appears in `exemplars` map |
| DIAL_173 | exemplar has unique exemplarId | UUID generated |
| DIAL_174 | exemplar stores machineName and state | Correct values |
| DIAL_175 | exemplar stores context (ProposerContext) | Full `sessionId`, `currentState`, `prompt`, `transitions`, `history` |
| DIAL_176 | exemplar stores humanTransitionName and humanToState | Human's chosen transition and target |
| DIAL_177 | exemplar stores copies (not references) of round data | `proposals`, `votes`, and `selectionVotes` arrays are copies — mutation of originals doesn't affect exemplar |
| DIAL_178 | exemplar stores createdAt timestamp | Date field present |
| DIAL_179 | getExemplars returns all exemplars for a machine | Filtered by machineName |
| DIAL_180 | getExemplars filters by state when provided | Optional state parameter narrows results |

### 18. Evaluation Module (`evaluateAlignment`, `evaluateAccuracy`)

"Specialist not found" error tested once in DIAL_051.

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_181 | evaluateAlignment returns correct score from exemplars | Compares specialist's proposals against human transitions in exemplars |
| DIAL_182 | evaluateAlignment counts matching proposals | Proposal with same transitionName as exemplar's humanTransitionName |
| DIAL_183 | evaluateAlignment counts matching pairwise votes | Vote for proposal matching human transition |
| DIAL_184 | evaluateAlignment counts matching selection votes | Selection of proposal matching human transition |
| DIAL_185 | evaluateAlignment with maxRounds limits exemplars checked | Only first N exemplars evaluated |
| DIAL_186 | evaluateAlignment returns 0 with no exemplars | `totalExemplars: 0, alignmentScore: 0` |
| DIAL_187 | evaluateAccuracy returns transitionMatchRate | Correct ratio of matching transitions |
| DIAL_188 | evaluateAccuracy returns stateMatchRate | Correct ratio of matching target states |
| DIAL_189 | evaluateAccuracy returns totalCostUSD | Sum of `costUSD` across proposals |
| DIAL_190 | evaluateAccuracy returns avgLatencyMsec | Average of non-null `latencyMsec` values |
| DIAL_191 | evaluateAccuracy with lookback limits exemplars | Only last N exemplars evaluated |
| DIAL_192 | evaluateAccuracy returns 0 rates with no matching proposals | Specialist never proposed in exemplars |

### 19. Enable/Disable Specialists

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_193 | enableSpecialist sets enabled=true | Specialist's `enabled` field becomes `true` |
| DIAL_194 | disableSpecialist sets enabled=false | Specialist's `enabled` field becomes `false` |
| DIAL_195 | enableSpecialist throws for unknown specialist | Error: `Specialist not found` |
| DIAL_196 | newly registered specialist has enabled undefined (treated as true) | `enabled` defaults to undefined, which `getEnabledProposers` treats as enabled |
| DIAL_197 | disabled proposer excluded from getEnabledProposers | `enabled: false` filtered out |
| DIAL_198 | disabled voter excluded from getEnabledVoters | `enabled: false` filtered out |
| DIAL_199 | disabled arbiter excluded from getEnabledArbiter | Returns undefined when sole arbiter disabled |
| DIAL_200 | getEnabledVoters filters by voterType | `voterType: "pairwise"` or `"selection"` filter works |
| DIAL_201 | getEnabledVoters without voterType returns all enabled voters | Both pairwise and selection included |
| DIAL_202 | re-enabling a disabled specialist works | `disableSpecialist` then `enableSpecialist` restores |
| DIAL_203 | enable/disable does not affect alignment history | Alignment records unchanged after disable/re-enable |

### 20. Query Helpers

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_204 | getSpecialist returns specialist by ID | Correct specialist returned |
| DIAL_205 | getSpecialist returns undefined for unknown ID | Not an error, returns undefined |
| DIAL_206 | getProposers returns all proposers for a machine | Filtered by machineName and role |
| DIAL_207 | getProposers returns empty array for unknown machine | No error |
| DIAL_208 | getVoters returns all voters for a machine | Both pairwise and selection voters |
| DIAL_209 | getArbiter returns arbiter for a machine | Single arbiter returned |
| DIAL_210 | getArbiter returns undefined when no arbiter registered | No error |
| DIAL_211 | getProposalsForRound returns proposals for session+round | Filtered by both sessionId and roundId |
| DIAL_212 | getVotesForRound returns votes for session+round | Filtered by both |
| DIAL_213 | getSelectionVotesForRound returns selection votes for session+round | Filtered by both |
| DIAL_214 | round query helpers return empty arrays for unknown round | No error |

### 21. Engine Helpers (`getEffectiveThreshold`, `selectChampion`)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_215 | getEffectiveThreshold uses state-level threshold first | State `consensusThreshold: 0.3` overrides all others |
| DIAL_216 | getEffectiveThreshold falls back to machine-level | Machine `consensusThreshold: 0.6` when state has none |
| DIAL_217 | getEffectiveThreshold falls back to arbiter threshold | Arbiter `threshold: 0.7` when machine has none |
| DIAL_218 | getEffectiveThreshold defaults to 0.5 | No threshold anywhere returns 0.5 |
| DIAL_219 | selectChampion returns highest-alignment proposer above threshold | Proposer with alignment 0.9 selected when threshold 0.8 |
| DIAL_220 | selectChampion returns undefined when no proposer qualifies | All alignment below threshold |
| DIAL_221 | selectChampion only considers enabled proposers | Disabled proposer with high alignment skipped |
| DIAL_222 | selectChampion uses CHAMPION_THRESHOLD of 0.8 | Default threshold for champion selection |

### 22. Store Operations

"Map contains what was just inserted" tests removed — the respective API unit tests already validate retrieval.

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_223 | clear() empties all 7 maps | sessions, specialists, proposals, votes, alignmentRecords, exemplars, selectionVotes |
| DIAL_224 | alignmentRecords map keyed by specialistId:machineName | Key format is `"specialistId:machineName"` |
| DIAL_225 | clear() allows fresh test isolation | After clear, all operations work as if fresh start |

---

## Integration Tests (38 tests)

### 23. Decision Cycle and Execution Modes

Includes execution mode wiring tests (strategyFnName resolution, contextFn+LLM). Context shape tests removed as they duplicate unit-level assertions (DIAL_060, DIAL_068, DIAL_091-092).

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_226 | single proposer unanimous consensus | One proposer with alignment 0.9, threshold 0.5, margin 1.0, consensus on proposal alone |
| DIAL_227 | two proposers agree — combined score consensus | Both propose same transition, alignment scores add, consensus without voters |
| DIAL_228 | two proposers disagree — selection voter breaks tie | Selection voter's alignment tips score for one transition |
| DIAL_229 | two proposers disagree — pairwise voter breaks tie | Pairwise "A" vote adds alignment to proposal A, crossing threshold |
| DIAL_230 | proposals clustered by transition not by proposal ID | Two proposals for "approve" (different reasoning) cluster together |
| DIAL_231 | consensus triggers transition execution via arbitration | `submitArbitration` after consensus leads to session advancing |
| DIAL_232 | full solicitation cascade: proposals → selection → pairwise | Engine solicits in correct order, checking consensus after each phase |
| DIAL_233 | human selection vote short-circuits consensus | Human selection vote in evaluateConsensus returns immediately |
| DIAL_234 | strategyFnName resolves to built-in and executes | `"firstAvailable"` resolves to actual function that produces valid proposal |
| DIAL_235 | contextFn return value passed to LLM call | (mock LLM) context string from function appears in LLM request |

### 24. Cold Start and Human Primacy

Human primacy integration tests merged here. Tests duplicating unit-level assertions (human alignment=1.0, updateAlignment skips humans, non-human cannot force, human selection vote shortcut, exemplar on force, alignment update on force) removed — already covered by DIAL_086, DIAL_099, DIAL_101-102, DIAL_159, DIAL_165.

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_236 | cold start: all AI proposals contribute 0 alignment | New specialists, all alignment 0, every score = 0 |
| DIAL_237 | cold start: alignmentWeightedMargin returns "Cold start" | Reasoning indicates human input required |
| DIAL_238 | cold start: human force decision succeeds | Human specialist with `isHuman: true` forces transition |
| DIAL_239 | cold start: exemplar generated on force | Exemplar created with full round context |
| DIAL_240 | cold start: alignment scores update for all participants | Every specialist's contribution compared to human choice |
| DIAL_241 | first alignment data enables future contributions | After round 1 human decision, aligned specialists contribute non-zero |
| DIAL_242 | human pairwise vote adds alignment 1.0 to consensus score | Human vote outweighs low-alignment AI votes |
| DIAL_243 | human force bypasses consensus score entirely | Human can force different transition than consensus winner |

### 25. Progressive Alignment Growth

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_244 | alignment grows with consistent matching | Specialist matching 10/10 times gives alignment = 1.0 |
| DIAL_245 | alignment decreases with mismatches | Specialist matching 5/10 gives 0.5 |
| DIAL_246 | high-alignment specialist reaches consensus faster | Higher alignment = more likely to cross margin at same threshold |
| DIAL_247 | low-alignment specialist insufficient alone | 0.3 alignment at threshold 0.5 never reaches threshold without help |
| DIAL_248 | alignment score determines voting weight in consensus | Voter with 0.9 alignment outweighs voter with 0.3 alignment |

### 26. Multi-State Machine Traversal and Proposal Validation

Proposal validation integration tests merged here. Tests duplicating unit assertions (valid/invalid transition, toState mismatch) removed — already covered by DIAL_045, DIAL_053, DIAL_079.

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_249 | session traverses 2-state machine | initialState to goalState with one transition |
| DIAL_250 | session traverses 3-state linear machine | A to B to C through two decision cycles |
| DIAL_251 | session traverses branching machine | State with multiple transitions, different paths to goal |
| DIAL_252 | history records all transitions in order | After traversing A to B to C, history has 2 entries in order |
| DIAL_253 | roundId regenerated at each state transition | Each state gets a fresh roundId |
| DIAL_254 | state prompt changes per state | Different states have different prompts visible to specialists |
| DIAL_255 | transitions available change per state | Specialists see only transitions valid from current state |
| DIAL_256 | proposal for transition from wrong state rejected | Transition exists in machine but not from current state |
| DIAL_257 | proposals from multiple specialists in same round scored correctly | All stored and scored correctly |

### 27. Consensus Threshold Behavior

Margin formula and getEffectiveThreshold priority chain tests removed — already covered by arbiter strategy unit tests (DIAL_149, DIAL_153) and engine helper tests (DIAL_215–218).

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_258 | threshold 0.0: any single aligned proposal reaches consensus | Lowest bar |
| DIAL_259 | threshold 0.5: leader needs sufficient margin over runner-up | Margin 0.49 fails, 0.51 succeeds |
| DIAL_260 | threshold 0.9: near-unanimity required | Only overwhelming agreement succeeds |
| DIAL_261 | threshold 1.0: requires margin of 1.0 | Only possible with zero runner-up score |
| DIAL_262 | per-state threshold overrides machine default | State A at 0.3 and state B at 0.8 produce different consensus behavior |
| DIAL_263 | machine-level threshold overrides arbiter threshold | Priority chain respected |

---

## End-to-End Tests (68 tests)

### 28. Full Session Lifecycle via `runSession`

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_264 | runSession drives 2-state machine to goalState | Creates session, runs cycles, returns completed session |
| DIAL_265 | runSession drives multi-state machine to goalState | 4-state machine: all intermediate states traversed |
| DIAL_266 | runSession terminates when goalState reached | `currentState === goalState` upon return |
| DIAL_267 | runSession history records all transitions | Complete audit trail in returned session |
| DIAL_268 | runSession registers default firstAvailable proposer when none specified | `__default_proposer_` created |
| DIAL_269 | runSession registers default firstProposal arbiter when none specified | `__default_arbiter_` created |
| DIAL_270 | runSession registers specialists from machine.specialists array | SpecialistDefinition[] auto-registered |
| DIAL_271 | runSession returns session in current state when exhausted (no consensus) | Waiting for human, not an error |

### 29. Cold Start — Calibration — Autonomous Consensus (Progressive Collapse)

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_272 | round 1 cold start: all AI alignment 0, blocks for human | System solicits all specialists, scores all 0, blocks |
| DIAL_273 | round 1 human force: exemplar created, alignment begins | Human forces decision, all specialists' alignment updated |
| DIAL_274 | rounds 2-5 calibration: alignment scores grow | Each human decision increases matching specialists' alignment |
| DIAL_275 | first autonomous round: high-alignment proposer reaches consensus | After sufficient calibration, AI can decide without human |
| DIAL_276 | full progressive collapse: cold start through champion mode | Many rounds, alignment growth, autonomous consensus, reduced participation |
| DIAL_277 | exemplar flywheel: specialists improve with more exemplars | Growing exemplar context (verifiable via mock strategyFn inspecting context) |

### 30. Proposal Clustering End-to-End

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_278 | two proposers same transition — combined score | Alignment 0.8 + 0.6 = 1.4 for that transition |
| DIAL_279 | three proposers 2-agree-1-disagrees — majority clusters | Two proposers for "approve" outweigh one for "reject" |
| DIAL_280 | clustering with different reasoning but same transition | Different reasoning strings still cluster by `transitionName` |
| DIAL_281 | cluster score correctly used in margin calculation | Clustered score in margin formula |

### 31. Self-Healing and Re-enablement End-to-End

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_282 | selfHeal re-enables all disabled proposers and voters | After calling selfHeal, all specialists enabled |
| DIAL_283 | champion fast path failure triggers selfHeal | Champion fails to reach consensus, selfHeal called |
| DIAL_284 | self-healing preserves alignment history | Re-enabled specialists retain their alignment scores |
| DIAL_285 | disabled specialists not solicited in runSession | `getEnabledProposers` filters them out |
| DIAL_286 | re-enabled specialists can reach consensus in next iteration | After selfHeal, full cascade runs with all specialists |

### 32. Trip Line (Alignment Degradation) End-to-End

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_287 | champion alignment drops below CHAMPION_THRESHOLD triggers selfHeal | After execution, alignment checked, selfHeal called if below 0.8 |
| DIAL_288 | trip line reverts to full solicitation cascade | Champion mode exits, all specialists re-enabled, full cascade next round |
| DIAL_289 | trip line preserves exemplar corpus | Historical exemplars retained after revert |
| DIAL_290 | re-calibration after trip line | New alignment data collected in full cascade mode |
| DIAL_291 | champion mode re-entered when alignment recovers | After recalibration, selectChampion finds qualified proposer again |

### 33. Champion Mode End-to-End

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_292 | champion identified as highest-alignment proposer above 0.8 | `selectChampion` returns correct ID |
| DIAL_293 | champion mode: only champion solicited for proposal | Other proposers not called |
| DIAL_294 | champion mode: consensus reached on champion's proposal alone | Fast path works |
| DIAL_295 | champion mode: falls through to full cascade when consensus not reached | selfHeal called, then full cascade |
| DIAL_296 | champion mode: skip already-submitted champion in full cascade | Doesn't duplicate champion's proposal |

### 34. Multi-Machine Isolation

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_297 | specialists scoped to their machineName | Specialist registered for machine A not returned by `getProposers("B")` |
| DIAL_298 | alignment tracked per machine | Same specialist has independent alignment records for different machines |
| DIAL_299 | exemplars scoped per machine | `getExemplars("A")` doesn't return machine B's exemplars |
| DIAL_300 | concurrent sessions on different machines | Two sessions on different machines run independently |
| DIAL_301 | concurrent sessions on same machine | Two sessions share specialists but have independent proposals/votes |

### 35. Complex State Machine Topologies

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_302 | cycle in state machine (non-goal state loops) | A to B to A to B to C (goalState). Handles loops |
| DIAL_303 | diamond-shaped machine | A to B, A to C, B to D, C to D. Both paths reach goal |
| DIAL_304 | state with many transitions | State with 10+ possible transitions — specialists see all options |
| DIAL_305 | deep linear machine | 10-state chain. All transitions happen in sequence |
| DIAL_306 | machine with dead-end states | State with no transitions to goal — system handles gracefully |

### 36. Semantic Isolation Verification

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_307 | ProposerContext does not contain consensus scores | No scoring internals in context |
| DIAL_308 | ProposerContext does not contain alignment scores | No alignment values visible |
| DIAL_309 | VoterContext does not contain threshold values | Risk dial not visible to voters |
| DIAL_310 | SelectionVoterContext does not contain alignment data | No alignment in selection context |
| DIAL_311 | exemplars in ProposerContext are domain-native | History records contain transitions, not scoring metadata |

### 37. Edge Cases and Error Recovery

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_312 | session already at goalState — runSession returns immediately | `initialState === goalState` completes with no transitions |
| DIAL_313 | zero specialists registered — runSession registers defaults and completes | Default proposer + arbiter auto-registered |
| DIAL_314 | specialist strategyFn throws error | System propagates error without corrupting session |
| DIAL_315 | specialist strategyFn returns malformed proposal | Strategy result missing fields causes error |
| DIAL_316 | empty transitions on non-goal state | `executeTransition` throws "No transitions available" |
| DIAL_317 | very large number of proposals in single round | Performance/correctness with 100+ proposals |
| DIAL_318 | very large number of votes in single round | Performance/correctness with 100+ votes |
| DIAL_319 | rapid sequential submitProposal calls | All stored correctly without race conditions |
| DIAL_320 | submitArbitration called with no proposals | guardsPass=false, executed=false |
| DIAL_321 | submitArbitration called twice in same round | Second call after transition sees stale roundId |
| DIAL_322 | metaJson with deeply nested objects | Complex metadata roundtrips correctly |
| DIAL_323 | Unicode in reasoning and prompt fields | International characters handled |
| DIAL_324 | extremely long reasoning strings | No truncation or corruption |
| DIAL_325 | proposal submitted to wrong session | Only affects the correct session |
| DIAL_326 | vote referencing non-existent proposalIds | Error: `Proposal not found` |

### 38. Consensus Math Verification (Exact Calculations)

BOTH-vote and cold-start worked examples removed — already covered by arbiter strategy unit tests (DIAL_154–155, DIAL_151).

| ID | Test Name | Description |
|----|-----------|-------------|
| DIAL_327 | worked example: 2 proposers, threshold 0.5, both agree | Score = 0.9+0.6 = 1.5, margin = 1.0 >= 0.5 |
| DIAL_328 | worked example: 2 proposers disagree, 1 selection voter breaks tie | Verify exact margin after selection vote |
| DIAL_329 | worked example: 3 proposers, 2 agree, 1 disagrees | Cluster of 2 vs solo — verify exact margin |
| DIAL_330 | boundary: margin exactly equals threshold | Consensus reached (>= not >) |
| DIAL_331 | boundary: margin one epsilon below threshold | Consensus not reached |
