# Gates

A gate is the fundamental computational unit of DIAL. It is a self-contained decision function with named exit ports, a specialist roster, and its own learned truth table. Gates exist independently of machines. A machine is one way to compose gates, but a gate can be created, invoked, learned from, and collapsed without ever being wired into a circuit.

## Interfaces and Instances

A gate has two layers: its **interface** and its **implementation**.

The **interface** is the port signature — the set of named exits with their descriptions. Two gates with the same port signature are the same kind of gate. They are interchangeable in any context that expects that signature. The interface is the type.

The framework treats input as an opaque bag (`Record<string, unknown>`). The gate's implementation — its specialists, its `contextFn`, its prompt — gives that bag meaning. Two gates behind the same interface are expected to accept the same input shape, but enforcing that is the implementation's job, not the framework's. This keeps the framework simple and avoids the framework needing to understand domain-specific schemas.

The **implementation** is everything else — the prompt, the specialists, the threshold, the context construction. Two gates can share an interface but differ completely in how they reach a decision. The implementation is per-instance.

```
GateInterface "approval" = { approve, reject }

Gate "legal-approval"     implements "approval"
  prompt: "Does this document meet legal compliance requirements?"
  specialists: [legal-claude, legal-gpt, legal-human, strict-arbiter]
  threshold: 0.9

Gate "marketing-approval"  implements "approval"
  prompt: "Is this campaign ready to launch?"
  specialists: [brand-claude, creative-human, fast-arbiter]
  threshold: 0.5

Gate "quick-approval"      implements "approval"
  prompt: "Should this be approved?"
  specialists: [single-cheap-llm, first-proposal-arbiter]
  threshold: 0.3
```

All three are interchangeable in any machine slot wired to `{ approve, reject }` ports. The machine doesn't care how the decision is made — it only cares that the exit ports match its wiring. Swap `legal-approval` for `quick-approval` without changing a single wire.

The **instance** is the live gate — the implementation plus its accumulated state: alignment records, exemplar corpus, collapse status. Each instance has its own identity (`gateId`), its own truth table being learned, its own collapse trajectory. Creating two gates from the same interface and even the same implementation produces two independent instances with separate learning histories.

```
GateInterface  = the type      (ports)
Implementation = the config    (prompt, specialists, threshold, context construction)
Gate instance  = the live thing (config + alignment + exemplars + collapse status)
```

### Sharing and Isolation

Two machines that reference the same gate instance share its learning. A human decision in machine A improves the gate's alignment for machine B. This is the reuse dividend.

Two machines that reference different gate instances — even with the same interface and implementation — have isolated learning. Training one does not affect the other.

The decision of what shares with what is made at wiring time by choosing which gate instance to reference. The framework doesn't need a sharing mode or an isolation flag. You just create the number of gate instances you need and point machines at the right ones.

```
Gate "approval-shared"    ← machines A and B both reference this (shared learning)
Gate "approval-isolated"  ← machine C references this (isolated learning)
```

Both created from the same interface. Same ports. Possibly same implementation. But two different instances with two different truth tables evolving independently.

## What a Gate Instance Has

- **Interface** — the port signature (the type contract, immutable after creation).
- **Prompt** — the decision question.
- **Specialists** — proposers and an arbiter who deliberate on which port to select.
- **Threshold** — the consensus bar required for autonomous execution.
- **Alignment records** — per-specialist trust scores accumulated across invocations.
- **Exemplar corpus** — human ground truth decisions captured as (context, chosen port) pairs.
- **Collapse status** — whether the gate has converged to autonomous execution, and which specialist is the champion.

A gate instance does NOT have:
- A target state for any port. Ports are exits, not routes.
- A session. Sessions belong to machines. Gates have invocations.

## What a Specialist Sees

Every invocation presents the specialist with three layers of context:

1. **Input** — the current data being decided on. The framework treats this as an opaque bag (`Record<string, unknown>`). The implementation gives it meaning. This is the "now."

2. **History** — the full session history: every transition across every gate the session has passed through, in order. This includes trips through this gate and trips through other gates. A gate in a review loop sees its own prior decisions. A gate downstream of a triage step sees the triage decision. History is provided by the caller (or built automatically by the machine engine) and is scoped to the current session. A standalone gate invocation with no session has no history.

3. **Exemplars** — human-verified decisions from other sessions and other callers. These are the ground truth examples the gate has accumulated across its lifetime. This is the "learned knowledge."

```
Input     = what we're deciding on right now
History   = what happened so far in this session (all gates, all transitions)
Exemplars = what humans decided in the past (all sessions, all callers)
```

The distinction matters. History gives the specialist short-term memory within a session — "I rejected this document on the first pass and it came back revised" or "triage classified this as high-priority before it reached me." Exemplars give the specialist long-term knowledge across all sessions — "documents like this one tend to get approved." History is ephemeral and session-scoped. Exemplars are permanent and accumulate toward collapse.

## The Gate Lifecycle

### 1. Define

Create a gate instance with an interface (ports), implementation (prompt, specialists, threshold), and an ID. The gate exists in the store and can be invoked immediately. At creation, all alignment scores are 0 and the exemplar corpus is empty.

### 2. Invoke

Pass a context object and receive a decision. The context contains the current input, optional session history (all transitions across all gates), and an optional prompt suffix. The gate solicits its specialists (providing them with the input, history, and relevant exemplars), runs consensus evaluation, and either returns a port selection (if consensus is reached or the gate is collapsed) or reports that it needs a human.

Each invocation is a single-pass evaluation — not a loop, not a multi-round deliberation. But the gate is not blind to what came before. When provided with session history, the specialist sees the full trail of decisions — including its own prior decisions if the session loops back, and decisions from other gates upstream. This gives the gate session-scoped memory without violating its single-pass invocation model.

### 3. Learn

When a human corrects an invocation — overriding the specialists' consensus or providing a decision where no consensus was reached — the gate captures an exemplar and updates alignment scores for every specialist who participated. The exemplar records the full context, all proposals, and the human's chosen port. Future invocations include relevant exemplars in the specialist context as few-shot demonstrations.

### 4. Collapse

As alignment scores rise, the gate reaches a point where its specialists consistently agree with human decisions. Consensus is now achieved from proposals alone — the human is no longer solicited. The gate has collapsed from a deliberative process to a deterministic function.

Eventually a single champion specialist handles all invocations. Cost drops. Latency drops. The gate's truth table is effectively complete.

### 5. Monitor

The trip line watches the champion's ongoing accuracy against spot-check human evaluations. If alignment degrades — the function drifts — the gate self-heals: it re-enables pruned specialists, increases human sampling, and re-enters calibration.

## Types

```typescript
/** The type contract — port signature. Immutable after creation. */
interface GateInterface {
  /** Named exit ports. */
  ports: Record<string, string | PortDefinition>;
}

interface PortDefinition {
  description?: string;
  parameters?: Record<string, unknown>;
}

/** Everything needed to create a gate instance. */
interface GateDefinition {
  gateId: string;
  /** Port signature. This is the gate's interface — its type contract. */
  ports: Record<string, string | PortDefinition>;
  /** Decision prompt for specialists. */
  prompt?: string;
  /** Specialist roster. Different instances of the same interface can have entirely different specialists. */
  specialists?: SpecialistDefinition[];
  /** Consensus threshold. */
  consensusThreshold?: number;
}

/** A live gate instance with accumulated state. */
interface Gate extends GateDefinition {
  createdAt: Date;
  collapsed: boolean;
  championSpecialistId?: string;
  exemplarCount: number;
  invocationCount: number;
}

interface GateContext {
  /** Opaque input data. The framework does not validate this — the implementation gives it meaning. */
  input: Record<string, unknown>;
  /** Full session history: all transitions across all gates, in order. Matches TransitionRecord[]. */
  history?: TransitionRecord[];
  /** Optional additional prompt text appended to the gate's prompt. */
  promptSuffix?: string;
}

interface GateResult {
  invocationId: string;
  gateId: string;
  port: string | null;
  reasoning: string;
  needsHuman: boolean;
  collapsed: boolean;
  specialistId?: string;
  metaJson?: Record<string, unknown>;
  costUSD?: number;
  latencyMsec?: number;
}

interface GateOverride {
  port: string;
  reasoning?: string;
}

interface GateStatus {
  gateId: string;
  collapsed: boolean;
  championSpecialistId?: string;
  collapseProgress: number;
  exemplarCount: number;
  invocationCount: number;
  humanOverrideRate: number;
  avgCostPerInvocation: number;
  specialists: Array<{
    specialistId: string;
    alignmentScore: number;
    totalComparisons: number;
    enabled: boolean;
  }>;
}
```

## API Surface

### Gate Management

```
createGate(definition: GateDefinition) → Gate
  Create and register a gate instance. Returns the gate with its ID.

getGate(gateId: string) → Gate
  Retrieve a gate definition and its current status.

listGates(interfaceFilter?: GateInterface) → Gate[]
  List all registered gates. Optionally filter by port signature
  to find all gates that implement a given interface.

deleteGate(gateId: string) → void
  Remove a gate and all its accumulated state.
```

### Gate Invocation

```
invokeGate(gateId: string, context: GateContext) → GateResult
  Evaluate the gate against a context.
  Returns: selected port, reasoning, whether it was collapsed,
           cost, latency, and the invocation ID.
  If no consensus: returns { port: null, needsHuman: true }.

overrideInvocation(gateId: string, invocationId: string, override: GateOverride) → void
  Provide the human's decision for an invocation.
  Updates alignment for all specialists who participated.
  Creates an exemplar from the invocation context + human choice.
```

### Gate Status

```
getGateStatus(gateId: string) → GateStatus
  Returns: collapsed (boolean), champion (specialistId or null),
           collapse progress (0-1), exemplar count,
           per-specialist alignment scores,
           invocation count, human override rate,
           cost per invocation (average).

getGateExemplars(gateId: string) → Exemplar[]
  Returns the full exemplar corpus for a gate.

getGateAlignmentRecords(gateId: string) → AlignmentRecord[]
  Returns per-specialist alignment data.
```

### Interface Queries

```
getGateInterface(gateId: string) → GateInterface
  Returns just the port signature of a gate.

gatesAreCompatible(gateIdA: string, gateIdB: string) → boolean
  Returns true if both gates have the same port signature
  and are therefore interchangeable.
```

## How Invocation Works

An invocation is the atomic operation of the gate. It is a single-pass decision cycle — not a loop, not a session, not a multi-round deliberation. The gate solicits all specialists once, evaluates consensus once, and returns.

```
invokeGate("legal-approval", {
  input: { document: "Q3 report (revised)", author: "alice" },
  history: [
    { transitionName: "reject", reasoning: "Missing compliance section", executionTimestamp: "...", metaJson: { gateId: "legal-approval" } }
  ]
})

1. Load gate instance
2. Build specialist context:
   - Prompt: gate.prompt (+ optional promptSuffix)
   - Ports: gate.ports (as available choices, without targets)
   - Input: context.input (the current decision)
   - History: context.history (full session history — all gates, all transitions)
   - Exemplars: relevant exemplars from this gate instance's corpus (other sessions)
3. If gate is collapsed:
   - Invoke champion specialist only
   - Return its port selection immediately (no consensus needed)
4. If gate is not collapsed:
   - Invoke all enabled specialists concurrently
   - Each returns: { port, reasoning, metaJson?, cost? }
   - Run consensus evaluation using the gate's arbiter and threshold
   - If consensus reached: return winning port
   - If no consensus: return { port: null, needsHuman: true }
5. Record invocation for potential override
6. Return GateResult
```

The specialist sees the gate's ports as available choices, not as transitions with targets. A specialist proposing "approve" is selecting a port, not executing a state transition. The specialist's context has three layers:

```typescript
{
  prompt: "Does this document meet legal compliance requirements?",
  ports: {
    approve: { description: "Approve the document" },
    reject: { description: "Send back for revision" }
  },
  // The current decision
  input: { document: "Q3 report (revised)", author: "alice" },
  // Full session history (all gates, all transitions)
  history: [
    { transitionName: "reject", reasoning: "Missing compliance section", executionTimestamp: "..." }
  ],
  // Human-verified decisions from other sessions
  exemplars: [
    { input: { document: "Q2 report", author: "bob" }, humanChoice: "approve" },
    { input: { document: "Draft memo", author: "carol" }, humanChoice: "reject" }
  ]
}
```

Transitions, states, and sessions do not exist at the gate level. The specialist sees a decision question, the available choices, the current input, what happened earlier in the session (if anything), and examples of past human decisions.

## How Gates Relate to Machines

A machine is a directed graph of gate references connected by wiring. The machine adds topology (where ports lead) and sequencing (which gate fires next). The gate doesn't know about any of this.

A machine slot specifies a port signature (the interface) and references a gate instance. Any gate with a matching port signature can fill the slot.

```
Machine "doc-review" {
  slots: {
    review: interface { approve, reject }  → gate "legal-approval"
    editing: interface { resubmit }        → gate "revision-check"
  }
  wiring: {
    review.approve → published
    review.reject → editing
    editing.resubmit → review
  }
  entry: review
  exit: published
}
```

To change the review behavior from strict legal review to quick rubber-stamp, swap the gate reference:

```
review: interface { approve, reject }  → gate "quick-approval"
```

No wiring changes. The ports match. The machine works identically in structure but differently in behavior — because the gate instance behind the slot has a different prompt, different specialists, different threshold, and a different learned truth table.

When a machine session reaches a state backed by a gate, the engine:
1. Passes the session's full transition history to the gate as `history`
2. Invokes the gate instance with the session's current metaJson as `input` and the collected history
3. Receives the selected port
4. Resolves the port to a target state via the wiring table
5. Executes the transition

The engine passes the complete session history — every transition across every gate, in order. The gate sees everything that happened before it, including its own prior decisions if the session loops. The gate doesn't track history — the machine does.

### Scoping

Everything about a gate's learning is scoped to its instance (`gateId`):

| Data | Scope Key | Accumulates Across |
|------|-----------|-------------------|
| Alignment records | `specialistId:gateId` | All invocations and all machines referencing this instance |
| Exemplars | `gateId` | All invocations and all machines referencing this instance |
| Collapse status | `gateId` | All invocations |
| Invocation log | `gateId` | All invocations |

Two machines referencing the same gate instance share learning. Two machines referencing different instances — even with the same interface — do not.

## Implementation Strategy

### Phase 1: Gate on Top of Machine (Minimal Change)

Under the hood, `invokeGate` creates an ephemeral 2-state machine and a micro-session:

```typescript
async function invokeGate(gateId: string, context: GateContext): Promise<GateResult> {
  const gate = await getGate(gateId);

  // Build a synthetic machine from the gate instance
  const syntheticMachine: MachineDefinition = {
    machineName: gateId,  // alignment scoped to gate instance
    initialState: "evaluate",
    goalState: "done",
    states: {
      evaluate: {
        prompt: gate.prompt + (context.promptSuffix ?? ""),
        transitions: Object.fromEntries(
          Object.entries(gate.ports).map(([name, def]) => [
            name,
            { target: "done", ...(typeof def === "string" ? { description: def } : def) }
          ])
        ),
        specialists: gate.specialists,
        consensusThreshold: gate.consensusThreshold,
      },
      done: {},
    },
  };

  const session = await createSession(syntheticMachine, context.input);
  const completed = await runSession(syntheticMachine);

  const lastTransition = completed.history[completed.history.length - 1];
  return {
    invocationId: completed.sessionId,
    gateId,
    port: lastTransition?.transitionName ?? null,
    reasoning: lastTransition?.reasoning ?? "",
    needsHuman: !lastTransition,
    collapsed: /* check collapse status */,
    specialistId: lastTransition?.specialistId,
    costUSD: lastTransition?.costUSD,
    latencyMsec: lastTransition?.latencyMsec,
  };
}
```

This works because:
- `machineName` is set to `gateId`, so alignment and exemplars accumulate under the gate instance's identity
- All ports wire to "done", so the machine always terminates after one decision
- The session is ephemeral — created per invocation, not long-lived
- The existing engine, strategies, LLM integration, and store all work unchanged

`overrideInvocation` maps to `submitArbitration` with a human specialist on the ephemeral session (loaded by invocationId = sessionId).

### Phase 2: Native Gate Implementation

Replace the synthetic machine with a gate-native execution path:
- Add `Gate` and `GateInvocation` to the store interface
- Add gate-specific store methods: `setGate`, `getGate`, etc.
- Implement `invokeGate` without creating a session or machine — directly solicit specialists, evaluate consensus, and return
- Alignment and exemplar storage uses `gateId` as the scope key natively
- Machines delegate to `invokeGate` when a state references a registered gate

### Phase 3: Interface Registry

Gate interfaces as a shared vocabulary:
- `defineInterface(name, ports)` — register a port signature as a named interface
- `listGatesByInterface(interfaceName)` — find all gates implementing an interface
- Interface versioning — add ports to an interface without breaking existing gates (additive changes only)
- Interface discovery — browse available interfaces, understand what kinds of decisions the system can make

### Phase 4: Composite Gates

A composite gate is a sub-circuit packaged behind a port interface:

```
Gate "peer-review" implements "approval" {
  // Internal wiring (hidden)
  internal: {
    first: gate "reviewer-a"   (implements "approval")
    second: gate "reviewer-b"  (implements "approval")
    merge: gate "tiebreaker"   (implements "approval")
    wiring: {
      entry → first, second  (parallel)
      first.approve + second.approve → exit.approve
      first.reject + second.reject → exit.reject
      disagreement → merge
      merge.approve → exit.approve
      merge.reject → exit.reject
    }
  }
  // External interface
  ports: { approve, reject }
}
```

From the outside, "peer-review" has the same interface as a simple approval gate — it is a drop-in replacement. Inside, it runs two approval gate instances in parallel and routes disagreements to a tiebreaker. The external caller sees a single invocation; the internal composition is hidden.

Each internal gate instance has its own alignment and exemplar corpus. The composite gate may additionally accumulate its own end-to-end alignment (did the composite output match the human's decision?).

## Gate as External Service

A gate exposed over HTTP is a decision endpoint:

```
POST /gates
  Create a new gate instance.
  Body: GateDefinition
  Returns: Gate

POST /gates/:gateId/invoke
  Invoke a gate.
  Body: GateContext
  Returns: GateResult

POST /gates/:gateId/invocations/:invocationId/override
  Human override for a past invocation.
  Body: GateOverride
  Returns: void

GET /gates/:gateId
  Get gate definition and status.
  Returns: Gate + GateStatus

GET /gates/:gateId/status
  Get detailed collapse and alignment status.
  Returns: GateStatus

GET /gates?interface=approval
  List gates implementing a given interface.
  Returns: Gate[]
```

An external program integrates with DIAL by calling gate endpoints. It does not need to understand machines, sessions, states, or the decision cycle. It sends context, gets back a port. If the gate needs a human, the program routes to a human interface. When the human decides, the program posts the override. Over time, the gate learns and the human is needed less.

## Gate as MCP Tool

A gate maps directly to an MCP tool. The implementation provides an `inputSchema` for the MCP tool definition — the framework doesn't enforce it, but MCP requires it:

```json
{
  "name": "legal-approval",
  "description": "Does this document meet legal compliance requirements?",
  "inputSchema": {
    "type": "object",
    "properties": {
      "document": { "type": "string" },
      "author": { "type": "string" }
    }
  }
}
```

The tool's response is the selected port and reasoning. An AI agent calling this tool doesn't know it's hitting a DIAL gate — it just sees a tool that makes an approval decision. Under the hood, the gate instance is accumulating alignment data from human overrides and progressively collapsing.

Any MCP-compatible agent can use DIAL gates as tools without any DIAL-specific integration.

## Examples

### Same Interface, Different Implementations

```typescript
// Define gates with the same port signature but different everything else
await createGate({
  gateId: "legal-approval",
  ports: { approve: "Approve", reject: "Reject" },
  prompt: "Does this meet legal compliance requirements?",
  specialists: [
    { specialistId: "legal-claude", role: "proposer", modelId: "anthropic/claude-sonnet-4-20250514", contextFn: legalContext },
    { specialistId: "legal-human", role: "proposer", isHuman: true },
    { specialistId: "strict-arbiter", role: "arbiter", strategyFnName: "alignmentMargin" }
  ],
  consensusThreshold: 0.9
});

await createGate({
  gateId: "quick-approval",
  ports: { approve: "Approve", reject: "Reject" },
  prompt: "Should this be approved?",
  specialists: [
    { specialistId: "fast-llm", role: "proposer", strategyFnName: "firstAvailable" },
    { specialistId: "auto-arbiter", role: "arbiter", strategyFnName: "firstProposal" }
  ],
  consensusThreshold: 0.3
});

// Both work in the same machine slot — same ports, different behavior
const machine = {
  machineName: "doc-review",
  initialState: "review",
  goalState: "published",
  states: {
    review:    { gate: "legal-approval", wiring: { approve: "published", reject: "revision" } },
    // swap to: { gate: "quick-approval", wiring: { approve: "published", reject: "revision" } },
    revision:  { prompt: "Revised. Resubmit?", transitions: { resubmit: "review" } },
    published: {}
  }
};
```

### Shared vs. Isolated Learning

```typescript
// Shared: both machines train the same gate instance
const machineA = {
  machineName: "pipeline-a",
  states: { review: { gate: "legal-approval", wiring: { approve: "done", reject: "fix" } }, /* ... */ }
};
const machineB = {
  machineName: "pipeline-b",
  states: { check: { gate: "legal-approval", wiring: { approve: "ship", reject: "revise" } }, /* ... */ }
};
// Human decisions in pipeline-a improve legal-approval for pipeline-b and vice versa.

// Isolated: machine C uses a separate instance with the same interface
await createGate({
  gateId: "marketing-approval",
  ports: { approve: "Approve", reject: "Reject" },  // same interface
  prompt: "Is this campaign ready to launch?",         // different prompt
  specialists: [/* different specialists */],
  consensusThreshold: 0.5                              // different threshold
});
const machineC = {
  machineName: "campaign-review",
  states: { review: { gate: "marketing-approval", wiring: { approve: "launch", reject: "rework" } }, /* ... */ }
};
// marketing-approval learns independently from legal-approval.
```

### Standalone Gate: Content Moderation

```typescript
await createGate({
  gateId: "content-moderation",
  prompt: "Does this content violate our community guidelines?",
  ports: {
    safe: { description: "Content is acceptable" },
    flag: { description: "Content should be flagged for review" },
    remove: { description: "Content should be removed immediately" }
  },
  specialists: [
    { specialistId: "claude-mod", role: "proposer", modelId: "anthropic/claude-sonnet-4-20250514", contextFn: moderationContext },
    { specialistId: "gpt-mod", role: "proposer", modelId: "openai/gpt-4o", contextFn: moderationContext },
    { specialistId: "human-mod", role: "proposer", isHuman: true },
    { specialistId: "arbiter", role: "arbiter", strategyFnName: "alignmentMargin" }
  ],
  consensusThreshold: 0.8
});

// No machine. Just invoke the gate directly.
const result = await invokeGate("content-moderation", {
  input: { text: "...", userId: "...", channel: "..." }
});

if (result.needsHuman) {
  enqueueForHumanReview(result.invocationId, result);
} else {
  applyModerationAction(result.port, result.input);
}

// Human correction feeds back into the gate's learning
await overrideInvocation("content-moderation", invocationId, {
  port: "flag",
  reasoning: "Borderline case, flag rather than remove"
});
```

### Gate Without Any Framework Code: HTTP API

```bash
# Create a gate
curl -X POST http://localhost:3000/gates \
  -d '{ "gateId": "triage", "prompt": "How urgent?", "ports": { "low": "Not urgent", "medium": "Needs attention", "high": "Urgent" } }'

# Invoke it
curl -X POST http://localhost:3000/gates/triage/invoke \
  -d '{ "input": { "ticket": "Login page is slow", "customer_tier": "enterprise" } }'
# → { "port": null, "needsHuman": true, "invocationId": "abc-123" }

# Human decides
curl -X POST http://localhost:3000/gates/triage/invocations/abc-123/override \
  -d '{ "port": "high", "reasoning": "Enterprise customer, performance issue" }'

# After many human decisions, the gate collapses:
curl -X POST http://localhost:3000/gates/triage/invoke \
  -d '{ "input": { "ticket": "CSS color wrong", "customer_tier": "free" } }'
# → { "port": "low", "needsHuman": false, "collapsed": true }

# Find all gates with the same interface
curl http://localhost:3000/gates?interface=approval
# → [{ "gateId": "legal-approval", ... }, { "gateId": "quick-approval", ... }]
```

## What Makes This Different

A gate is not a classifier. A classifier is trained offline on a labeled dataset and deployed as a fixed function. A gate is trained online by humans operating it, and it deploys itself progressively as it earns trust. The human never leaves the loop — the loop just calls on them less often.

A gate is not an agent. An agent acts autonomously from the start and may or may not have guardrails. A gate starts with zero autonomy and earns it through demonstrated alignment with human decisions. Autonomy is the output, not the input.

A gate is not a prompt. A prompt produces a response that may or may not be what the human wants. A gate produces a decision that is measured against what the human actually chose, and the measurement drives progressive improvement.

A gate is the smallest unit of earned autonomy.
