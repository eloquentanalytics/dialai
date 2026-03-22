# Poll Gate Spec

A poll is a gate that fans a question out to N diverse LLM models, collects their answers, and uses an arbiter to summarize consensus. The gate is the reusable infrastructure — which models, what judge, what threshold. Each question is just another invocation of that gate.

```typescript
// Create the gate once — this is the HOW
await createGate({
  gateId: "10-model-poll",
  prompt: "Answer the following question accurately and concisely.",
  transitions: { resolved: "Consensus answer found" },
  specialists: [
    { specialistId: "claude-sonnet",  role: "proposer", modelId: "anthropic/claude-sonnet-4-20250514" },
    { specialistId: "gpt-4o",        role: "proposer", modelId: "openai/gpt-4o" },
    { specialistId: "gemini-flash",  role: "proposer", modelId: "google/gemini-2.0-flash-001" },
    { specialistId: "llama-70b",     role: "proposer", modelId: "meta-llama/llama-3.1-70b-instruct" },
    { specialistId: "mistral-large", role: "proposer", modelId: "mistralai/mistral-large-2411" },
    { specialistId: "deepseek-v3",   role: "proposer", modelId: "deepseek/deepseek-chat-v3-0324" },
    { specialistId: "qwen-72b",      role: "proposer", modelId: "qwen/qwen-2.5-72b-instruct" },
    { specialistId: "cohere-r-plus", role: "proposer", modelId: "cohere/command-r-plus-08-2024" },
    { specialistId: "claude-haiku",  role: "proposer", modelId: "anthropic/claude-haiku-4-5-20251001" },
    { specialistId: "gpt-4o-mini",   role: "proposer", modelId: "openai/gpt-4o-mini" },
    { specialistId: "judge",         role: "arbiter" }
  ],
  consensusThreshold: 0.5,
});

// Ask questions — each is an invocation of the same gate
const r1 = await invokeGate("10-model-poll", { promptSuffix: "Who won the 2025 World Series?" });
const r2 = await invokeGate("10-model-poll", { promptSuffix: "What is the capital of Australia?" });
// r1.reasoning → "7/10 said Dodgers because X, 3/10 said Yankees because Y"
```

## How It Maps to DIAL 1.5

Built entirely from existing primitives. No engine, strategy, or store changes.

| Poll concept | DIAL 1.5 primitive |
|---|---|
| Gate definition | `MachineDefinition` (synthetic 2-state machine) |
| Gate identity (`gateId`) | `machineName` — scopes alignment + exemplars |
| Invoking a gate | `createSession` + `submitProposal` × N + `submitArbitration` |
| A question | `promptSuffix` appended to gate prompt |
| An evaluation | A session with one round |
| Each model's answer | `submitProposal({ sessionId, specialistId })` |
| The judge | `submitArbitration({ sessionId })` via custom `strategyFn` |
| Human correction | `submitArbitration({ sessionId, specialistId: human, transitionName })` |
| Learning | Alignment + exemplars accumulate under `gateId` across all questions |

The synthetic machine has two states:

```
evaluate  ──resolved──▶  done
```

Every proposer picks `resolved` (there's only one transition). Their answer goes in `reasoning`. The arbiter reads all proposals' reasoning and determines consensus.

## What Gets Built

### New file: `src/dialai/gate.ts`

Two functions. Everything else is reused.

#### `createGate(definition: GateDefinition): GateDefinition`

Stores the gate definition in an in-memory registry (Map). Returns the definition. Phase 2 moves this to the store.

#### `invokeGate(gateId, context, runtimeSpecialists?): GateResult`

1. Look up gate definition from registry.
2. Build synthetic `MachineDefinition`:
   - `machineName` = `gateId` (so alignment/exemplars scope to gate)
   - `initialState` = `"evaluate"`, `goalState` = `"done"`
   - `evaluate` state: prompt = `gate.prompt + context.promptSuffix`, transitions all target `"done"`, specialists from gate definition, threshold from gate
   - `done` state: empty (terminal)
3. `createSession(machine, context.metaJson)` — session persisted in store.
4. Register specialists:
   - From `runtimeSpecialists` if provided (for function refs that can't serialize).
   - From `gate.specialists` (strategyFnName-based auto-registration, same as `runSession` does).
   - Defaults (`firstAvailable` proposer + `firstProposal` arbiter) if none.
5. `Promise.all` → all proposers invoked concurrently via `submitProposal`.
6. `submitArbitration({ sessionId })` — arbiter evaluates all proposals.
7. Return `GateResult`.

### New types in `types.ts`

```typescript
interface GateDefinition {
  gateId: string;
  prompt?: string;
  transitions: Record<string, string | TransitionDefinition>;
  specialists?: SpecialistDefinition[];
  consensusThreshold?: number;
}

interface GateContext {
  metaJson?: Record<string, unknown>;
  history?: TransitionRecord[];
  promptSuffix?: string;
}

interface GateResult {
  evaluationId: string;
  gateId: string;
  transitionName: string | null;
  reasoning: string;
  needsHuman: boolean;
  proposals: Proposal[];
  metaJson?: Record<string, unknown>;
  costUSD?: number;
  latencyMsec?: number;
}
```

All field types are existing DIAL types. Three types total.

### Registry helpers

```typescript
createGate(definition: GateDefinition): GateDefinition
getGate(gateId: string): GateDefinition
listGates(): GateDefinition[]
deleteGate(gateId: string): void
clearGateRegistry(): void
```

In-memory Map for Phase 1. Phase 2 adds store persistence.

### Exports in `index.ts`

```typescript
export type { GateDefinition, GateContext, GateResult } from "./types.js";
export { createGate, getGate, listGates, deleteGate, clearGateRegistry, invokeGate } from "./gate.js";
```

## The LLM-as-Judge Arbiter

The judge is a custom `strategyFn` on the arbiter — no framework changes needed. The consumer provides it via `runtimeSpecialists`:

```typescript
const result = await invokeGate("10-model-poll", {
  promptSuffix: "Who won the 2025 World Series?"
}, {
  arbiter: {
    specialistId: "judge",
    machineName: "10-model-poll",
    strategyFn: async (ctx: ArbiterContext): Promise<ArbiterStrategyResult> => {
      const responses = ctx.proposals.map((p, i) =>
        `Model ${i + 1} (${p.specialistId}): ${p.reasoning}`
      ).join("\n\n");

      const { content } = await callLlm(
        "anthropic/claude-sonnet-4-20250514",
        "You are a consensus judge. Read all model responses to a question. " +
        "Determine if there is meaningful agreement. " +
        "Respond with JSON: { \"consensusReached\": true/false, " +
        "\"winningProposalId\": \"<proposalId of best response>\", " +
        "\"reasoning\": \"<narrative: how many agreed, what they said, why>\" }",
        `Question: ${ctx.prompt}\n\n${ctx.proposals.length} models responded:\n\n${responses}`
      );

      const parsed = JSON.parse(content);
      return {
        consensusReached: parsed.consensusReached,
        winningProposalId: parsed.winningProposalId,
        reasoning: parsed.reasoning,
      };
    },
  },
});
```

The judge reads all N proposals, clusters the answers semantically ("LA Dodgers" = "The Dodgers" = "Los Angeles Dodgers"), produces a narrative summary ("7/10 said Dodgers because they won in 5 games, 2 said Yankees, 1 said Mets"), and picks the best-articulated winning response.

This is a regular custom arbiter. The DIAL framework doesn't need to know it's backed by an LLM.

## How a Question Flows Through

```
1. Consumer calls: invokeGate("10-model-poll", { promptSuffix: "Who won the 2025 WS?" })

2. invokeGate builds synthetic machine:
   machineName: "10-model-poll"
   states:
     evaluate:
       prompt: "Answer the following question accurately and concisely.\n\nWho won the 2025 WS?"
       transitions: { resolved: { target: "done", description: "Consensus answer found" } }
     done: {}

3. createSession("10-model-poll", {}) → session with sessionId + roundId

4. Register 10 proposers + 1 arbiter under machineName "10-model-poll"

5. Promise.all → 10 concurrent submitProposal calls
   Each proposer:
   - Gets ProposerContext with prompt, transitions: { resolved → done }, exemplars
   - LLM mode: contextFn builds context → callLlm → parses response
   - Returns { transitionName: "resolved", toState: "done", reasoning: "The LA Dodgers won..." }
   - Stored as Proposal in the round

6. submitArbitration({ sessionId })
   - Loads all 10 proposals
   - Calls judge arbiter strategyFn
   - Judge LLM reads all 10 answers, determines consensus
   - Returns { consensusReached: true, winningProposalId: "...", reasoning: "7/10 said Dodgers..." }
   - If consensus: executes transition, session moves to "done"
   - If no consensus: returns needsHuman

7. GateResult returned:
   { evaluationId, gateId: "10-model-poll", transitionName: "resolved",
     reasoning: "7/10 said Dodgers...", needsHuman: false,
     proposals: [all 10] }
```

## Human Override

When the judge says `needsHuman` (or a human disagrees with the consensus), the consumer can call `submitArbitration` directly on the session (the `evaluationId` in `GateResult` maps to the underlying `sessionId`):

```typescript
const result = await invokeGate("10-model-poll", { promptSuffix: "Who won the 2025 WS?" });

if (result.needsHuman) {
  // Register a human specialist (once)
  await registerProposer({
    specialistId: "human-reviewer",
    machineName: "10-model-poll",
    isHuman: true,
    strategyFnName: "firstAvailable",
  });

  // Human forces the answer using the evaluationId as sessionId
  await submitArbitration({
    sessionId: result.evaluationId,
    specialistId: "human-reviewer",
    transitionName: "resolved",
    reasoning: "The correct answer is the LA Dodgers. They won in 5 games against the Yankees.",
  });
}
```

This triggers the standard DIAL learning cycle:
- Alignment updated for all 10 proposers (did they agree with the human?)
- Exemplar captured (question context + all proposals + human's answer)
- Future invocations include this exemplar as a few-shot example

Over time, the gate collapses: models that consistently agree with humans earn high alignment, the arbiter's job gets easier, and eventually a champion model handles questions autonomously.

## What Doesn't Change

Nothing. The gate is built entirely from existing DIAL 1.5 primitives:

- `createSession` / `submitProposal` / `submitArbitration` — unchanged
- `registerProposer` / `registerArbiter` — unchanged
- Alignment tracking — unchanged (scoped by `machineName` = `gateId`)
- Exemplar system — unchanged (scoped by `machineName` = `gateId`)
- Store interface — unchanged
- Engine / tick loop — not used (gates use `Promise.all` for parallel fan-out)
- LLM integration — unchanged (proposers use `contextFn + modelId`, judge uses `callLlm` inside a `strategyFn`)
- Strategies — unchanged (consumer provides custom `strategyFn` for the judge)

## Files Touched

| File | Change |
|---|---|
| `src/dialai/types.ts` | Add 3 types: `GateDefinition`, `GateContext`, `GateResult` |
| `src/dialai/gate.ts` | **New file** — `createGate`, `invokeGate`, registry helpers |
| `src/dialai/index.ts` | Export new types + gate functions |
| `tests/unit/gate.test.ts` | Gate tests |

Zero changes to `api.ts`, `engine.ts`, `llm.ts`, `strategies.ts`, `store.ts`, `alignment.ts`, `exemplars.ts`.
