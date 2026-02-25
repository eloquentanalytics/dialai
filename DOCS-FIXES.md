# Documentation Fixes: Docs vs Source Inconsistencies

Comprehensive audit and fix of documentation inconsistencies found by comparing `website/docs/` against `src/dialai/` and `tests/`. All 381 tests pass after changes. No source code was modified (except `examples/simple-machine.json`).

---

## CRITICAL — Broken code examples that would crash at runtime

### 1. `examples/simple-machine.json` uses `defaultState` instead of `goalState`

**File:** `examples/simple-machine.json`

The shipped example file used the legacy `defaultState` field. While `normalizeMachine()` in `utils.ts` handles this as a backward-compatibility fallback, every documentation page uses `goalState`. The example now matches the documented `MachineDefinition` type.

**Before:** `"defaultState": "done"`
**After:** `"goalState": "done"`

---

### 2. `quick-start.md` Step 3 called `submitProposal` with unregistered specialists

**File:** `website/docs/getting-started/quick-start.md`

The example called `submitProposal` with `specialistId: "ai-specialist"` and `specialistId: "contrarian-ai"` without registering them first. `submitProposal` in `api.ts:568-575` throws `"Specialist not found"` for unregistered IDs.

**Fix:** Added `registerProposer` calls for both specialists and a `registerArbiter` call before using them. Also added `getSession` import.

---

### 3. `quick-start.md` Step 3 called `submitArbitration` without a registered arbiter

**File:** `website/docs/getting-started/quick-start.md`

`submitArbitration` calls `evaluateConsensus` internally, which at `api.ts:645-647` throws `"No arbiter registered for machine"`.

**Fix:** Added `registerArbiter` with `strategyFnName: "alignmentMargin"` before the arbitration call.

---

### 4. `examples/intro.md` called `evaluateConsensus` without a registered arbiter

**File:** `website/docs/examples/intro.md`

The "Full Decision Cycle" example registered two proposers but no arbiter, then called `evaluateConsensus` which requires an arbiter.

**Fix:** Added `registerArbiter` registration after the proposer registrations.

---

### 5. Stale session references after mutations in `quick-start.md` and `examples/intro.md`

**Files:** `website/docs/getting-started/quick-start.md`, `website/docs/examples/intro.md`

`executeTransition` in `api.ts:968` fetches a fresh copy from the store and mutates that copy, not the original `session` variable. The examples showed `session.currentState` as "done" after transition, but the original variable would still show "pending".

**Fix:** Added `const updated = await getSession(session.sessionId)` and used `updated` for post-transition checks.

---

## HIGH — Wrong types, schemas, or API surface

### 6. Default threshold documented as 0.5, actual default is 1

**Files:** `website/docs/concepts/decision-cycle.md`, `website/docs/concepts/sessions.md`, `website/docs/guides/registering-specialists.md`, `website/docs/api/submitArbitration.md`, `website/docs/api/cli.md`

Multiple doc pages stated the default consensus threshold is `0.5`. The actual default in `strategies.ts:134` is `ctx.threshold ?? 1` (unanimity). The threshold resolution chain in `api.ts:396-408` returns `undefined` when nothing is configured — there is no 0.5 fallback. Tests in `strategy-arbiter.test.ts` and `engine-helpers.test.ts` confirm the source behavior.

**Fix:** Updated all references to state the default is `1` (or "unanimity required"), and clarified the resolution chain as `state > machine > arbiter > undefined` with the strategy itself defaulting to 1.

---

### 7. Type `ProposalResult` doesn't exist — should be `ProposerStrategyResult`

**File:** `website/docs/api/intro.md:114`

The `registerProposer` signature used `Promise<ProposalResult>` which doesn't exist anywhere in the source. The actual type is `ProposerStrategyResult` (`types.ts:140-144`).

**Fix:** Changed to `Promise<ProposerStrategyResult>`.

---

### 8. `registerProposer` signature missing `isHuman`, `strategyFnName`, `threshold`

**Files:** `website/docs/api/intro.md:111-120`, `website/docs/api/types.md:335-357`

The documented signature omitted three fields present in `RegisterProposerOptions` (`types.ts:534-563`): `isHuman?: boolean`, `strategyFnName?: string`, and `threshold?: number`.

**Fix:** Added all three fields to the inline signature in `intro.md` and added `isHuman` to `types.md`.

---

### 9. Store exports documented as Maps — they don't exist

**File:** `website/docs/api/intro.md:419-439`

The docs claimed `sessions`, `specialists`, and `proposals` were exported as `Map<>` objects. These are internal to `createMemoryStore()` in `store-memory.ts` and are not exported. The actual exports are `getStore()`, `setStore()`, and `clear()`.

**Fix:** Replaced the entire Store section with documentation of `getStore`, `setStore`, and `clear` (noting `clear` is async returning `Promise<void>`).

---

### 10. CLI machine JSON schema uses wrong structure

**File:** `website/docs/api/cli.md:147-204`

The "Machine with Embedded Specialists" example and "Machine JSON Schema" section showed `proposers`/`arbiter` keys per state. The actual `StateDefinition` (`types.ts:32-41`) uses a `specialists` array with `role: "proposer" | "arbiter"`.

**Fix:** Rewrote the example to use the `specialists` array format at the machine level. Rewrote the JSON schema section to show `specialists` array, `consensusThreshold`, and per-state overrides.

---

### 11. `schema.json` missing fields from TypeScript types

**File:** `website/docs/schema.json`

The `stateConfig` definition was missing the `specialists` array field. The `specialistDefinition` was missing `disabled` and `strategyFn` fields that exist in `SpecialistDefinition` (`types.ts:91-106`).

**Fix:** Added `specialists` to `stateConfig`, added `disabled` and `strategyFn` to `specialistDefinition`.

---

### 12. `createSession.md` omits `metaJson` parameter

**File:** `website/docs/api/createSession.md`

The function signature, parameter table, and return value description all omitted the optional `metaJson` second parameter that exists in `api.ts:49-52`.

**Fix:** Updated the heading signature, added `metaJson` to the parameter table, and added it to the return value description.

---

### 13. MCP tool names show `dialai_` prefix — actual has no prefix

**File:** `website/docs/guides/skills/mcp-server/SKILL.md`

The docs listed tools as `dialai_create_session`, `dialai_get_session`, etc. The actual MCP server (`mcp.ts`) uses `create_session`, `get_session`, etc. (no prefix). The docs also listed only 6 tools; the actual server exposes 12.

**Fix:** Removed `dialai_` prefix from all tool names. Added the 6 missing tools: `register_proposer`, `register_arbiter`, `submit_arbitration`, `run_session`, `get_collapse_metrics`, `get_decision_log`. Fixed example conversation and tool schemas.

---

### 14. Add-specialists skill uses wrong JSON structure

**File:** `website/docs/guides/skills/add-specialists/SKILL.md`

The skill doc used `id`/`strategy`/`config.model`/`systemPrompt`/`temperature` for specialist JSON. The actual `SpecialistDefinition` uses `specialistId`/`role`/`strategyFnName`/`modelId`. The strategy names `llm`/`human`/`deterministic` don't exist; actual built-in names are `firstAvailable`/`lastAvailable`/`random`.

**Fix:** Complete rewrite of the skill doc with correct JSON structures, correct strategy names, and programmatic registration examples.

---

### 15. `evaluateConsensus.md` reasoning strings are stale

**File:** `website/docs/api/evaluateConsensus.md:34-49`

The example output showed count-based reasoning (`"Proposal ahead by 1"`, `"Lead of 0 below threshold 1"`) from the old aheadByK algorithm. The actual `alignmentMargin` strategy (`strategies.ts`) produces: `"Single proposal with no competing proposals"`, `"Alignment-weighted margin X.XX >= threshold Y"`, `"Alignment-weighted margin X.XX below threshold Y"`, or `"Cold start: no alignment data available, human input required"`.

**Fix:** Updated all example reasoning strings to match actual strategy output. Added cold start example.

---

### 16. Programmatic-usage skill references nonexistent `session.status`

**File:** `website/docs/guides/skills/programmatic-usage/SKILL.md:65`

The code example used `while (current.status === 'active')`. The `Session` interface (`types.ts:46-63`) has no `status` field. Session completion is determined by `session.currentState === session.machine.goalState`.

**Fix:** Complete rewrite of the skill doc with correct API signatures, correct session structure, and correct loop termination condition.

---

### 17. `intro.md` uses impossible `threshold: 2` for `alignmentMargin`

**File:** `website/docs/api/intro.md:151`

The `registerArbiter` example used `threshold: 2`. The `alignmentMargin` strategy computes a margin as a float between 0 and 1 (divides by `totalAlignment`). A threshold of 2 can never be reached.

**Fix:** Changed to `threshold: 0.5`.

---

## MEDIUM — Misleading behavioral descriptions

### 18. Decision-cycles skill says cycle repeats on no consensus

**File:** `website/docs/guides/skills/decision-cycles/SKILL.md:69-82`

The docs said "The cycle repeats / New proposals are solicited" on no consensus, with a `maxCycles` config. The actual behavior (`engine.ts:296`) returns `needs_human` which stops the loop. There is no `maxCycles` parameter.

**Fix:** Updated to say the engine reports `needs_human` status and waits for human input. Removed `maxCycles` config example.

---

### 19. Webhook context response field documented as `content`/`markdown`

**File:** `website/docs/guides/registering-specialists.md:148-150`

The docs said the webhook response should contain a `content` or `markdown` field. The source (`llm.ts:211-212`) expects a `context` field.

**Fix:** Changed to `context`.

---

### 20. 202 Accepted webhook handling

**File:** `website/docs/guides/registering-specialists.md:108`

The docs said the orchestrator "moves on" for 202 responses. The source (`llm.ts:51-53`) throws `"Webhook returned 202 Accepted — async processing not yet supported"`.

**Fix:** Updated to note 202 throws an error (async webhook processing not yet supported).

---

### 21. Webhook timeout fallback behavior

**File:** `website/docs/guides/registering-specialists.md:154`

The docs said the orchestrator falls back to "calling the LLM with no additional context" on timeout. The source throws on timeout (abort signal).

**Fix:** Updated to say the request throws an error on timeout.

---

### 22. `roadmap.md` claims SSE transport exists

**File:** `website/docs/roadmap.md:121-125`

The roadmap stated "SSE transport exists" and "SSE transport exists for HTTP." A grep for `event-stream`, `EventSource`, `SSE`, and `server-sent` found zero results in the source.

**Fix:** Changed status to "Not implemented" and updated description.

---

### 23. `agent-experience.md` shows REST-style URLs

**File:** `website/docs/agent-experience.md:137-140`

The docs showed `curl http://server:3000/tools/dialai_create_session`. The HTTP server (`http-server.ts`) only accepts POST requests with JSON-RPC payloads. There is no path-based routing.

**Fix:** Replaced with a JSON-RPC `curl` example.

---

### 24. `agent-experience.md` and `roadmap.md` reference `VERSION.md`

**Files:** `website/docs/agent-experience.md:264,270`, `website/docs/roadmap.md:175`

Both files referenced `VERSION.md` at the repository root. No such file exists. The version is in `package.json`. Additionally, `agent-experience.md:270` claimed "There is no `package.json` version to keep in sync" — but there is one (`"version": "0.1.0"`).

**Fix:** Changed all references to `package.json`.

---

### 25. Arbiter described as "never an AI model"

**File:** `website/docs/concepts/specialists.md:27`

The docs stated the arbiter is "a fully deterministic, built-in component — never an AI model or a human." The system allows custom arbiter strategies via `strategyFn` and `strategyWebhookUrl`, which could call anything.

**Fix:** Softened to "defaults to a deterministic, built-in component" with a note that custom strategies are supported.

---

### 26. Threshold fallback chain ends with `> 0.5`

**File:** `website/docs/concepts/decision-cycle.md:63`

The docs said the threshold chain is "state > machine > arbiter > 0.5". The source (`api.ts:396-408`) returns `undefined` when nothing is configured, and the `alignmentMargin` strategy then defaults to `1`.

**Fix:** Updated to show the chain ending with "If none configured, the `alignmentMargin` strategy defaults to 1 (unanimity required)."

---

### 27. `quick-start.md` omits that `runSession` registers a default arbiter

**File:** `website/docs/getting-started/quick-start.md:67`

The docs said `runSession` "registers a built-in proposer that picks the first available transition." The actual `runSession` (`engine.ts:280-289`) also registers a default arbiter (`firstProposal` strategy).

**Fix:** Updated to mention both the default proposer (`firstAvailable`) and default arbiter (`firstProposal`).

---

### 28. Troubleshooting skill says required field is `id`

**File:** `website/docs/guides/skills/troubleshooting/SKILL.md:32`

The docs listed `id` as a required field. The actual required field is `machineName` (`utils.ts:47-61`).

**Fix:** Changed to `machineName`, `initialState`, `goalState`, `states`.

---

### 29. Add-specialists and troubleshooting skills use wrong specialist JSON

**Files:** `website/docs/guides/skills/add-specialists/SKILL.md`, `website/docs/guides/skills/troubleshooting/SKILL.md`

Both used `{ "id": "...", "strategy": "llm", "config": { "model": "..." } }` format. Also referenced `k` value and `maxCycles` parameters that don't exist.

**Fix:** Rewrote all specialist JSON to use `{ "specialistId": "...", "role": "proposer", "strategyFnName": "firstAvailable" }` format. Removed `k` and `maxCycles` references.

---

## LOW — Minor text, formatting, and description fixes

### 30. `ArbiterContext.threshold` shown as required in `intro.md`

**File:** `website/docs/api/intro.md:186`

The docs showed `threshold: number` (required). The actual type (`types.ts:233`) is `threshold?: number` (optional).

**Fix:** Changed to `threshold?: number`.

---

### 31. `ArbiterContext` missing `metaJson` field in `intro.md`

**File:** `website/docs/api/intro.md:176-187`

The documented `ArbiterContext` omitted `metaJson?: Record<string, unknown>` which exists in `types.ts:235`.

**Fix:** Added `metaJson?: Record<string, unknown>`.

---

### 32. `clear()` documented as synchronous

**Files:** `website/docs/api/intro.md:439`, `website/docs/examples/intro.md:112,383,402`

`clear()` was shown as `() => void` and called without `await`. The actual function (`store.ts:84`) is `async function clear(): Promise<void>`.

**Fix:** Updated type to `() => Promise<void>` in the store table. Added `await` to all `clear()` calls in examples.

---

### 33. `runSession.md` says "checks consensus after each proposal"

**File:** `website/docs/api/runSession.md:117-121`

The docs said the engine "solicits proposals from all enabled proposers, checks consensus after each." The actual tick loop does one operation per tick: either solicit one proposer OR evaluate consensus after all have submitted.

**Fix:** Updated to describe the tick-based behavior accurately.

---

### 34. `human-primacy.md` describes alignment as "simple fraction"

**File:** `website/docs/concepts/human-primacy.md:163`

The docs said "The alignment score — a simple fraction of matching choices." The actual implementation uses the Wilson score lower bound (`alignment.ts:21-28`), not a simple fraction.

**Fix:** Changed to "the Wilson score lower bound of matching choices over total comparisons."

---

### 35. Proposer strategy reasoning strings slightly different

**File:** `website/docs/guides/registering-specialists.md:307-340`

The pseudocode showed reasoning like `"First available transition"`. The actual source (`strategies.ts`) includes the transition name: `"Choosing first available transition: {name}"`.

**Fix:** Updated all three strategy pseudocode blocks to include the transition name.

---

### 36. CLI output spacing mismatch

**File:** `website/docs/getting-started/quick-start.md:133-139`

The docs showed extra padding in the CLI output format. The actual `cli.ts:66-70` uses different alignment widths.

**Fix:** Matched the output format to the actual CLI output.

---

### 37. `decision-cycle.md` described as "Asynchronous by Design"

**File:** `website/docs/concepts/decision-cycle.md:9-11`

The section header and description said the decision cycle is "asynchronous" with the arbiter re-evaluating "after every arriving contribution." The actual engine is tick-based and synchronous per tick.

**Fix:** Changed section header to "Tick-Based Execution" and updated the description.

---

## Files Changed

| File | Changes |
|------|---------|
| `examples/simple-machine.json` | `defaultState` → `goalState` |
| `website/docs/agent-experience.md` | REST URLs → JSON-RPC, VERSION.md → package.json |
| `website/docs/api/cli.md` | Machine JSON schema, behavior section, embedded specialists example |
| `website/docs/api/createSession.md` | Added `metaJson` parameter |
| `website/docs/api/evaluateConsensus.md` | Reasoning strings, step description |
| `website/docs/api/intro.md` | Type names, signatures, store exports, threshold, ArbiterContext |
| `website/docs/api/runSession.md` | Tick loop description |
| `website/docs/api/submitArbitration.md` | Default threshold |
| `website/docs/api/types.md` | Added `isHuman` to RegisterProposerOptions |
| `website/docs/concepts/decision-cycle.md` | Threshold chain, tick-based description |
| `website/docs/concepts/human-primacy.md` | Wilson score description |
| `website/docs/concepts/sessions.md` | Threshold resolution priority |
| `website/docs/concepts/specialists.md` | Arbiter description softened |
| `website/docs/examples/intro.md` | Arbiter registration, stale refs, async clear |
| `website/docs/getting-started/quick-start.md` | Specialist registration, stale refs, CLI output, default arbiter |
| `website/docs/guides/registering-specialists.md` | Webhook field, 202, timeout, threshold, reasoning strings |
| `website/docs/guides/skills/add-specialists/SKILL.md` | Complete rewrite |
| `website/docs/guides/skills/decision-cycles/SKILL.md` | No-consensus behavior, arbiter description |
| `website/docs/guides/skills/mcp-server/SKILL.md` | Tool names, tool count, schemas |
| `website/docs/guides/skills/programmatic-usage/SKILL.md` | Complete rewrite |
| `website/docs/guides/skills/troubleshooting/SKILL.md` | Field names, specialist JSON, removed k/maxCycles |
| `website/docs/roadmap.md` | SSE claim, VERSION.md reference |
| `website/docs/schema.json` | Added specialists, disabled, strategyFn fields |

---

## Round 2 — Additional audit fixes

### 38. Default threshold 0.5 in `progressive-collapse.md`

**File:** `website/docs/guides/progressive-collapse.md:112`

Text said "well above the default threshold of 0.5." The default is `1` (unanimity), confirmed in `strategies.ts:134`.

**Fix:** Changed to "meeting the default threshold of 1.0."

---

### 39. `schema.json` uses `disabled` — types.ts uses `enabled`

**File:** `website/docs/schema.json:90-92`

The schema had `"disabled": boolean` while `types.ts` Proposer (line 117) and Arbiter (line 154) use `enabled?: boolean`. These are logically inverted.

**Fix:** Changed schema.json from `disabled` to `enabled` with description matching types.ts.

---

### 40. CLI flags `--verbose` and `--human` don't exist

**Files:** `website/docs/guides/SKILLS.md:21-24`, `website/docs/guides/skills/run-machine/SKILL.md`

Both files documented `--verbose` and `--human` flags. The CLI (`cli.ts:20-51`) only checks for `--mcp`. These flags are silently ignored.

**Fix:** Removed `--verbose` and `--human` references from both files.

---

### 41. `isHuman` comment says "can force arbitration decisions"

**Files:** `src/dialai/types.ts:115,539`, `website/docs/schema.json:88`

The JSDoc comment on `isHuman` said "If true, can force arbitration decisions" which conflates the field's purpose. The field simply marks a specialist as human-operated.

**Fix:** Changed to "If true, this specialist is operated by a human" in types.ts (2 occurrences) and schema.json.

---

### 42. Single proposal auto-approval missing threshold caveat

**File:** `website/docs/concepts/consensus-strategies.md:53`

Text said "When only one proposal exists, consensus is immediate" without noting this only applies when `threshold ≤ 1.0`. Tests (`champion-mode.test.ts:200`) confirm `threshold: 2.0` blocks single-proposal auto-approval.

**Fix:** Added clarification that auto-approval only applies when threshold ≤ 1.0.

---

## Additional Files Changed (Round 2)

| File | Changes |
|------|---------|
| `website/docs/guides/progressive-collapse.md` | Default threshold 0.5 → 1.0 |
| `website/docs/schema.json` | `disabled` → `enabled` field |
| `website/docs/guides/SKILLS.md` | Removed `--verbose` and `--human` flags |
| `website/docs/guides/skills/run-machine/SKILL.md` | Removed `--verbose` and `--human` flags |
| `src/dialai/types.ts` | `isHuman` comment updated (2 occurrences) |
| `website/docs/concepts/consensus-strategies.md` | Single proposal threshold caveat |

---

## Round 3 — Source code and remaining docs fixes

### 43. Engine lacked early resolution (consensus re-evaluation after each proposal)

**Files:** `src/dialai/engine.ts`, `src/dialai/tick.test.ts`

The documentation (`decision-cycle.md`, `concepts/arbitration.md`) described the engine re-evaluating consensus "after each arriving contribution," but the actual `tickOneSession` function only checked consensus in a separate tick after all proposers had submitted. This meant a single-proposer machine required 2 ticks (solicit → advance) instead of 1.

**Fix:** Extracted a `tryAdvance()` helper that checks proposals, evaluates consensus, and executes the transition. Modified `tickOneSession` to:
1. Check existing proposals for early resolution before soliciting (handles externally submitted proposals like human overrides)
2. Re-evaluate consensus immediately after each proposal submission

Guard condition prevents premature single-proposal auto-approve when more proposers are expected: consensus is only checked when `postSubmitted.size >= numEnabled || postProposals.length > 1`.

Updated `tick.test.ts` to reflect the new behavior: single-proposer machines now advance in 1 tick, multi-proposer machines advance on the tick that collects the final proposal.

---

### 44. Validation error messages were generic instead of specific

**File:** `src/dialai/api.ts`

The `validateExecutionMode` and `validateArbiterExecutionMode` functions produced generic messages ("No execution mode specified", "Multiple execution modes specified") that didn't help users understand what was wrong. The documentation (`registering-specialists.md`) described specific error messages for each forbidden combination.

**Fix:** Replaced generic validation with specific checks for forbidden combinations and missing companion parameters:
- `strategyFn + strategyFnName` → "Provide either strategyFn (custom function) or strategyFnName (built-in strategy), not both."
- `strategyFn + modelId` → "modelId is only used with contextFn or contextWebhookUrl..."
- `strategyFnName + modelId` → same
- `strategyFn + contextFn` → "Provide either strategyFn (you handle everything) or contextFn + modelId..."
- `contextFn` without `modelId` → "contextFn provides context for an LLM...You must also specify modelId."
- `contextWebhookUrl` without `modelId` → similar
- `strategyWebhookUrl` without `webhookTokenName` → "Webhook URLs require webhookTokenName for authentication."
- `contextWebhookUrl` without `webhookTokenName` → same
- No execution mode → "Specialist must specify one of: strategyFn, strategyFnName, strategyWebhookUrl, contextFn + modelId, or contextWebhookUrl + modelId."

Same pattern applied to arbiter validation.

---

### 45. `api/intro.md` human specialist example missing required execution mode

**File:** `website/docs/api/intro.md`

The human specialist registration example omitted the required execution mode parameter, which would throw at runtime since validation requires exactly one execution mode even for human specialists.

**Before:**
```typescript
const humanReviewer = await registerProposer({
  specialistId: "human-reviewer",
  machineName: "my-task",
  isHuman: true,
});
```

**After:**
```typescript
const humanReviewer = await registerProposer({
  specialistId: "human-reviewer",
  machineName: "my-task",
  isHuman: true,
  strategyFnName: "firstAvailable",
});
```

---

### 46. `api/intro.md` arbiter `strategyFn` return type was `ConsensusResult`

**File:** `website/docs/api/intro.md`

The `registerArbiter` example showed the custom strategy function returning `ConsensusResult`. The actual expected return type is `ArbiterStrategyResult` (`types.ts:140-144`).

**Fix:** Changed `Promise<ConsensusResult>` to `Promise<ArbiterStrategyResult>`.

---

### 47. `api/types.md` missing `SpecialistMetrics`, `Signal`, and `SignalLevel` types

**File:** `website/docs/api/types.md`

The `CollapseMetrics` type referenced `specialists: Record<string, SpecialistMetrics>` and `signals: Signal[]`, but neither `SpecialistMetrics`, `Signal`, nor `SignalLevel` were defined in the types documentation.

**Fix:** Added all three type definitions with field descriptions. Added signal codes table: `COLD_START`, `SINGLE_SPECIALIST`, `LOW_ALIGNMENT`, `THIN_MARGIN`, `FULL_COLLAPSE`, `ALIGNMENT_PLATEAU`.

---

### 48. Test expectations updated for new validation messages and early resolution

**Files:** `src/dialai/api.test.ts`, `tests/unit/register-proposer.test.ts`

Tests that asserted on old generic error messages were updated to match the new specific messages:
- `api.test.ts`: "No execution mode specified" → "Specialist must specify one of:"
- `register-proposer.test.ts` DIAL_032: "Multiple execution modes" → "Provide either strategyFn (custom function) or strategyFnName (built-in strategy), not both."
- `register-proposer.test.ts` DIAL_033: "No execution mode" → "Specialist must specify one of:"

---

## Additional Files Changed (Round 3)

| File | Changes |
|------|---------|
| `src/dialai/engine.ts` | Added `tryAdvance()` helper, early resolution with guards |
| `src/dialai/tick.test.ts` | Updated expectations for early resolution behavior |
| `src/dialai/api.ts` | Specific validation error messages for forbidden combos |
| `src/dialai/api.test.ts` | Updated error message expectation |
| `tests/unit/register-proposer.test.ts` | Updated DIAL_032/033 error message expectations |
| `website/docs/api/intro.md` | Human specialist example, arbiter return type |
| `website/docs/api/types.md` | Added SpecialistMetrics, Signal, SignalLevel types |
