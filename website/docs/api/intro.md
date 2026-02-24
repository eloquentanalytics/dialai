---
sidebar_position: 1
---

# API Reference

The `dialai` library provides functions for creating sessions, registering specialists, and managing the decision cycle. For the conceptual foundation, see [Concepts](/docs/concepts/intro).

## Quick Reference

| Function | Purpose |
|----------|---------|
| [`createSession`](#createsession) | Create a new session instance |
| [`getSession`](#getsession) | Retrieve a session by ID |
| [`getSessions`](#getsessions) | List all sessions |
| [`registerProposer`](#registerproposer) | Register a proposer specialist |
| [`submitProposal`](#submitproposal) | Submit a state transition proposal |
| [`registerArbiter`](#registerarbiter) | Register an arbiter specialist |
| [`submitArbitration`](#submitarbitration) | Evaluate consensus and optionally execute |
| [`evaluateConsensus`](#evaluateconsensus) | Check if consensus is reached |
| [`executeTransition`](#executetransition) | Execute a state transition |
| [`runSession`](#runsession) | Run a machine to completion |
| [`tick`](#tick) | Global heartbeat — sweep all active sessions |
| [`getProposers`](#getproposers) | List proposers for a machine |
| [`getArbiter`](#getarbiter) | Get arbiter for a machine |
| [`enableSpecialist`](#enablespecialist) | Re-enable a disabled specialist |
| [`disableSpecialist`](#disablespecialist) | Disable a specialist (preserves history) |
| [`getCollapseMetrics`](#getcollapsemetrics) | Progressive collapse monitoring |
| [`getProposalsForRound`](#getproposalsforround) | List proposals in a round |

## Session Functions

### createSession

Creates a new session instance from a machine definition.

```typescript
import { createSession } from "dialai";

const session = await createSession(machine);
// Or with metadata:
// const session = await createSession(machine, { puzzleSize: 3 });
// session.sessionId      → "a1b2c3d4-..."
// session.currentState   → machine.initialState
// session.history        → []
```

**Signature:**

```typescript
createSession(machine: MachineDefinition, metaJson?: Record<string, unknown>): Promise<Session>
```

### getSession

Retrieves a session by its ID.

```typescript
import { getSession } from "dialai";

const session = await getSession("a1b2c3d4-...");
```

**Signature:**

```typescript
getSession(sessionId: string): Promise<Session>
```

Throws if the session is not found.

### getSessions

Returns all stored sessions.

```typescript
import { getSessions } from "dialai";

const sessions = await getSessions();
```

**Signature:**

```typescript
getSessions(): Promise<Session[]>
```

## Specialist Functions

### registerProposer

Registers a proposer specialist for a machine.

```typescript
import { registerProposer } from "dialai";

const proposer = await registerProposer({
  specialistId: "ai-proposer-1",
  machineName: "my-task",
  strategyFn: async (ctx) => ({
    transitionName: Object.keys(ctx.transitions)[0],
    toState: Object.values(ctx.transitions)[0],
    reasoning: "First available transition",
  }),
});
```

**Signature:**

```typescript
registerProposer(opts: {
  specialistId: string;
  machineName: string;
  strategyFn?: (ctx: ProposerContext) => Promise<ProposalResult>;
  strategyWebhookUrl?: string;
  contextFn?: (ctx: ProposerContext) => Promise<string>;
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
}): Promise<Proposer>
```

See [Registering Specialists](/docs/guides/registering-specialists) for execution mode details.

**Human Specialists:**

```typescript
// Register a human specialist
const humanReviewer = await registerProposer({
  specialistId: "human-reviewer",
  machineName: "my-task",
  isHuman: true,  // Enables forced arbitration
});
```

Human specialists are identified by `isHuman: true`, which grants:
- Human proposals always win consensus
- Ability to force transitions via `submitArbitration`

### registerArbiter

Registers an arbiter specialist for a machine. Arbiters evaluate consensus among proposals.

```typescript
import { registerArbiter } from "dialai";

const arbiter = await registerArbiter({
  specialistId: "consensus-arbiter",
  machineName: "my-task",
  strategyFnName: "alignmentMargin",
  threshold: 2,
});
```

**Signature:**

```typescript
registerArbiter(opts: {
  specialistId: string;
  machineName: string;
  strategyFn?: (ctx: ArbiterContext) => Promise<ConsensusResult>;
  strategyFnName?: string;   // "alignmentMargin"
  strategyWebhookUrl?: string;
  webhookTokenName?: string;
  threshold?: number;
}): Promise<Arbiter>
```

See [registerArbiter](./registerArbiter.md) for full documentation including built-in strategies.

**ArbiterContext:**

The context passed to a custom arbiter strategy function:

```typescript
interface ArbiterContext {
  sessionId: string;
  roundId: string;
  currentState: string;
  prompt: string;
  machineName: string;
  proposals: Proposal[];
  alignmentScores?: Record<string, number>;
  humanGoldExamples?: HumanGoldExample[];
  history: TransitionRecord[];
  threshold: number;
}
```

Example custom arbiter using alignment margin logic on proposals:

```typescript
const arbiter = await registerArbiter({
  specialistId: "custom-arbiter",
  machineName: "my-task",
  strategyFn: async (ctx) => {
    // Count proposals per transition
    const counts: Record<string, number> = {};
    for (const p of ctx.proposals) {
      counts[p.transitionName] = (counts[p.transitionName] || 0) + 1;
    }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const leader = sorted[0];
    const runnerUp = sorted[1]?.[1] ?? 0;
    if (leader[1] - runnerUp >= ctx.threshold) {
      const winning = ctx.proposals.find(p => p.transitionName === leader[0]);
      return {
        consensusReached: true,
        winningProposalId: winning!.proposalId,
        reasoning: `${leader[0]} ahead by ${leader[1] - runnerUp}`,
      };
    }
    return { consensusReached: false, reasoning: "No transition ahead by threshold" };
  },
  threshold: 2,
});
```

## Decision Functions

### submitProposal

Creates and stores a proposal. If `transitionName` is omitted, invokes the specialist's registered strategy.

```typescript
import { submitProposal } from "dialai";

// Strategy invocation (AI specialists)
const proposal = await submitProposal({
  sessionId: session.sessionId,
  specialistId: "ai-proposer-1",
  roundId: session.currentRoundId,  // omit to use current round
});

// Direct submission with all parameters
const proposal = await submitProposal({
  sessionId: session.sessionId,
  specialistId: "ai-proposer-1",
  roundId: session.currentRoundId,
  transitionName: "approve",
  reasoning: "Looks good to me",
  metaJson: { source: "review" },
  costUSD: 0.003,
  latencyMsec: 200,
  numInputTokens: 150,
  numOutputTokens: 50,
});
```

**Signature:**

```typescript
submitProposal(opts: SubmitProposalOptions): Promise<Proposal>
```

**SubmitProposalOptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session identifier |
| `specialistId` | `string` | Yes | Who is submitting |
| `roundId` | `string` | No | Omit to use current round; provide to target a specific round (enables staleness detection) |
| `transitionName` | `string` | No | Transition to propose (invokes strategy if omitted) |
| `reasoning` | `string` | No | Explanation for the proposal |
| `metaJson` | `object` | No | Arbitrary client metadata |
| `costUSD` | `number` | No | Cost in USD to generate this proposal |
| `latencyMsec` | `number` | No | Time in milliseconds to generate |
| `numInputTokens` | `number` | No | Input tokens used |
| `numOutputTokens` | `number` | No | Output tokens used |

Cost tracking fields enable measuring the economic cost of AI delegation.

### evaluateConsensus

Evaluates whether consensus has been reached for a session.

```typescript
import { evaluateConsensus } from "dialai";

const result = await evaluateConsensus(session.sessionId);

if (result.consensusReached) {
  console.log("Winner:", result.winningProposalId);
} else {
  console.log("No consensus:", result.reasoning);
}
```

**Signature:**

```typescript
evaluateConsensus(sessionId: string): Promise<ConsensusResult>
```

**ConsensusResult:**

```typescript
interface ConsensusResult {
  consensusReached: boolean;
  winningProposalId?: string;
  reasoning: string;
}
```

### submitArbitration

Evaluates consensus and optionally executes the winning transition. Combines consensus evaluation with transition execution in a single call. Supports human override for forcing transitions.

```typescript
import { submitArbitration } from "dialai";

// Check for consensus and auto-execute if found
const result = await submitArbitration({
  sessionId: session.sessionId,
});

if (result.executed) {
  console.log("Transitioned to:", result.toState);
} else {
  console.log("No consensus:", result.guardReason);
}

// Human override with cost tracking
const result = await submitArbitration({
  sessionId: session.sessionId,
  specialistId: "human-reviewer",
  transitionName: "approve",
  reasoning: "Manager approved",
  metaJson: { approvedBy: "jane" },
  costUSD: 0.0,
  latencyMsec: 5000,
  numInputTokens: 0,
  numOutputTokens: 0,
});
```

**Signature:**

```typescript
submitArbitration(opts: SubmitArbitrationOptions): Promise<ArbitrationResult>
```

**SubmitArbitrationOptions:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session identifier |
| `roundId` | `string` | No | Omit to use current round; if provided, enables staleness detection |
| `specialistId` | `string` | No | Who is calling (required for override) |
| `transitionName` | `string` | No | Force this transition (human only) |
| `reasoning` | `string` | No | Explanation for the decision |
| `metaJson` | `object` | No | Arbitrary client metadata |
| `costUSD` | `number` | No | Cost in USD for this arbitration |
| `latencyMsec` | `number` | No | Time in milliseconds |
| `numInputTokens` | `number` | No | Input tokens used |
| `numOutputTokens` | `number` | No | Output tokens used |

See [submitArbitration](./submitArbitration.md) for full documentation.

### executeTransition

Executes a state transition, updating the session and recording history.

```typescript
import { executeTransition } from "dialai";

const updated = await executeTransition(
  session.sessionId,
  "approve",      // transitionName
  "approved",     // toState
  "Consensus reached"  // reasoning
);

console.log(updated.currentState); // "approved"
console.log(updated.history);      // [..., { transitionName, reasoning, ... }]
```

**Signature:**

```typescript
executeTransition(
  sessionId: string,
  transitionName: string,
  toState: string,
  reasoning?: string
): Promise<Session>
```

Throws if the transition is invalid from the current state.

## Engine

### runSession

Runs a machine to its goal state. Creates a session, registers a built-in proposer, and loops through the decision cycle until the goal state is reached.

```typescript
import { runSession } from "dialai";

const session = await runSession(machine);
// session.currentState === machine.goalState
```

**Signature:**

```typescript
runSession(machine: MachineDefinition): Promise<Session>
```

**Behavior:**

1. Creates a session in the initial state
2. Registers machine-level and per-state specialists from the machine definition
3. Registers a default proposer (`firstAvailable`) if no proposers are specified
4. Registers a default arbiter (`firstProposal`) if no arbiter is specified
5. Loops `tick()` until the session reaches its goal state or needs human intervention
6. Returns the session (completed or waiting for human)

## Store

The in-memory store is exported for testing and advanced use:

```typescript
import { sessions, specialists, proposals, clear } from "dialai";

// Inspect current state
console.log(sessions.size);
console.log([...proposals.values()]);

// Reset all state (useful for tests)
clear();
```

| Export | Type | Description |
|--------|------|-------------|
| `sessions` | `Map<string, Session>` | All sessions by ID |
| `specialists` | `Map<string, Specialist>` | All registered specialists |
| `proposals` | `Map<string, Proposal>` | All proposals by ID |
| `clear` | `() => void` | Clears all maps |

## Orchestration

### tick

Global heartbeat. Sweeps all active sessions, performing one atomic step per session.

```typescript
import { tick } from "dialai";

const results = await tick();
for (const r of results) {
  console.log(`${r.sessionId}: ${r.status} → ${r.currentState}`);
}
```

**Signature:**

```typescript
tick(): Promise<TickResult[]>
```

Per-session behavior:
- If a proposer hasn't submitted yet → solicit that one proposer (status: `'solicited'`)
- If all proposers submitted and consensus reached → execute transition (status: `'advanced'`)
- If all proposers submitted but no consensus → report (status: `'needs_human'`)
- Terminal sessions are omitted from results

## Specialist Management

### getProposers

Returns all proposers registered for a machine.

```typescript
import { getProposers } from "dialai";
const proposers = await getProposers("my-task");
```

**Signature:**

```typescript
getProposers(machineName: string): Promise<Proposer[]>
```

### getArbiter

Returns the arbiter registered for a machine, or `undefined` if none.

```typescript
import { getArbiter } from "dialai";
const arbiter = await getArbiter("my-task");
```

**Signature:**

```typescript
getArbiter(machineName: string): Promise<Arbiter | undefined>
```

### enableSpecialist

Re-enables a previously disabled specialist.

```typescript
import { enableSpecialist } from "dialai";
await enableSpecialist("ai-proposer-1");
```

**Signature:**

```typescript
enableSpecialist(specialistId: string): Promise<void>
```

### disableSpecialist

Disables a specialist. The specialist stops receiving solicitations but its registration and alignment history are preserved.

```typescript
import { disableSpecialist } from "dialai";
await disableSpecialist("ai-proposer-1");
```

**Signature:**

```typescript
disableSpecialist(specialistId: string): Promise<void>
```

## Monitoring

### getCollapseMetrics

Returns progressive collapse metrics for a machine, optionally filtered by state.

```typescript
import { getCollapseMetrics } from "dialai";
const metrics = await getCollapseMetrics("my-task");
console.log(`Collapse ratio: ${metrics.collapseRatio}`);
```

**Signature:**

```typescript
getCollapseMetrics(machineName: string, state?: string): Promise<CollapseMetrics>
```

### getProposalsForRound

Returns all proposals submitted in a specific round.

```typescript
import { getProposalsForRound } from "dialai";
const proposals = await getProposalsForRound(session.sessionId, session.currentRoundId);
```

**Signature:**

```typescript
getProposalsForRound(sessionId: string, roundId: string): Promise<Proposal[]>
```

## Additional References

- [Types Reference](./types.md) - Complete type definitions
- [CLI Reference](./cli.md) - Command-line interface
- [Registering Specialists](/docs/guides/registering-specialists) - Execution modes
- [Implementing Strategies](/docs/guides/implementing-strategies) - Strategy functions
