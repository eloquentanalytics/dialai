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
| [`registerVoter`](#registervoter) | Register a voter specialist |
| [`submitProposal`](#submitproposal) | Submit a state transition proposal |
| [`submitVote`](#submitvote) | Submit a vote comparing proposals |
| [`registerArbiter`](#registerarbiter) | Register an arbiter specialist |
| [`submitArbitration`](#submitarbitration) | Evaluate consensus and optionally execute |
| [`evaluateConsensus`](#evaluateconsensus) | Check if consensus is reached |
| [`executeTransition`](#executetransition) | Execute a state transition |
| [`runSession`](#runsession) | Run a machine to completion |

## Session Functions

### createSession

Creates a new session instance from a machine definition.

```typescript
import { createSession } from "dialai";

const session = await createSession(machine);
// session.sessionId      → "a1b2c3d4-..."
// session.currentState   → machine.initialState
// session.history        → []
```

**Signature:**

```typescript
createSession(machine: MachineDefinition): Promise<Session>
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
- Vote priority in consensus evaluation
- Ability to force transitions via `submitArbitration`

### registerVoter

Registers a voter specialist for a machine.

```typescript
import { registerVoter } from "dialai";

const voter = await registerVoter({
  specialistId: "ai-voter-1",
  machineName: "my-task",
  strategyFn: async (ctx) => ({
    voteFor: "A",
    reasoning: "Proposal A is better aligned",
  }),
});
```

**Signature:**

```typescript
registerVoter(opts: {
  specialistId: string;
  machineName: string;
  strategyFn?: (ctx: VoterContext) => Promise<VoteResult>;
  strategyWebhookUrl?: string;
  contextFn?: (ctx: VoterContext) => Promise<string>;
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
}): Promise<Voter>
```

### registerArbiter

Registers an arbiter specialist for a machine. Arbiters evaluate consensus among proposals.

```typescript
import { registerArbiter } from "dialai";

const arbiter = await registerArbiter({
  specialistId: "consensus-arbiter",
  machineName: "my-task",
  strategyFnName: "aheadByK",
  threshold: 2,
});
```

**Signature:**

```typescript
registerArbiter(opts: {
  specialistId: string;
  machineName: string;
  strategyFn?: (ctx: ArbiterContext) => Promise<ConsensusResult>;
  strategyFnName?: string;
  strategyWebhookUrl?: string;
  webhookTokenName?: string;
  threshold?: number;
}): Promise<Arbiter>
```

See [registerArbiter](./registerArbiter.md) for full documentation including built-in strategies.

## Decision Functions

### submitProposal

Creates and stores a proposal. If `transitionName` is omitted, invokes the specialist's registered strategy.

```typescript
import { submitProposal } from "dialai";

// Strategy invocation (AI specialists)
const proposal = await submitProposal(
  session.sessionId,
  "ai-proposer-1",
  session.currentRoundId  // roundId - omit to use current round; provide to target a specific round
);

// Direct submission with all parameters
const proposal = await submitProposal(
  session.sessionId,
  "ai-proposer-1",
  session.currentRoundId, // roundId
  "approve",              // transitionName
  "Looks good to me",     // reasoning
  { source: "review" },   // metaJson
  0.003,                  // costUSD
  200,                    // latencyMsec
  150,                    // numInputTokens
  50                      // numOutputTokens
);
```

**Signature:**

```typescript
submitProposal(
  sessionId: string,
  specialistId: string,
  roundId?: string,
  transitionName?: string,
  reasoning?: string,
  metaJson?: Record<string, unknown>,
  costUSD?: number,
  latencyMsec?: number,
  numInputTokens?: number,
  numOutputTokens?: number
): Promise<Proposal>
```

| Param | Type | Required | Description |
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

### submitVote

Creates and stores a vote comparing two proposals. If `voteFor` is omitted, invokes the specialist's registered strategy.

```typescript
import { submitVote } from "dialai";

// Strategy invocation
const vote = await submitVote(
  session.sessionId,
  "ai-voter-1",
  session.currentRoundId,  // roundId - omit to use current round; provide to target a specific round
  proposalA.proposalId,
  proposalB.proposalId
);

// Direct submission with all parameters
const vote = await submitVote(
  session.sessionId,
  "ai-voter-1",
  session.currentRoundId,    // roundId
  proposalA.proposalId,
  proposalB.proposalId,
  "A",                       // voteFor
  "Proposal A is clearer",   // reasoning
  { reviewer: "ai-1" },      // metaJson
  0.002,                     // costUSD
  150,                       // latencyMsec
  100,                       // numInputTokens
  25                         // numOutputTokens
);
```

**Signature:**

```typescript
submitVote(
  sessionId: string,
  specialistId: string,
  roundId?: string,
  proposalIdA: string,
  proposalIdB: string,
  voteFor?: VoteChoice,
  reasoning?: string,
  metaJson?: Record<string, unknown>,
  costUSD?: number,
  latencyMsec?: number,
  numInputTokens?: number,
  numOutputTokens?: number
): Promise<Vote>
```

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session identifier |
| `specialistId` | `string` | Yes | Who is voting |
| `roundId` | `string` | No | Omit to use current round; provide to target a specific round (enables staleness detection) |
| `proposalIdA` | `string` | Yes | First proposal to compare |
| `proposalIdB` | `string` | Yes | Second proposal to compare |
| `voteFor` | `VoteChoice` | No | Vote choice (invokes strategy if omitted) |
| `reasoning` | `string` | No | Explanation for the vote |
| `metaJson` | `object` | No | Arbitrary client metadata |
| `costUSD` | `number` | No | Cost in USD to generate this vote |
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
const result = await submitArbitration(session.sessionId, "0");

if (result.executed) {
  console.log("Transitioned to:", result.toState);
} else {
  console.log("No consensus:", result.guardReason);
}

// Human override with cost tracking
const result = await submitArbitration(
  session.sessionId,
  "0",                        // roundId
  "human-reviewer",           // specialistId
  "approve",                  // transitionName (force this transition)
  "Manager approved",         // reasoning
  { approvedBy: "jane" },     // metaJson
  0.0,                        // costUSD (human decision)
  5000,                       // latencyMsec
  0,                          // numInputTokens
  0                           // numOutputTokens
);
```

**Signature:**

```typescript
submitArbitration(
  sessionId: string,
  roundId?: string,           // omit to use current round
  specialistId?: string,
  transitionName?: string,
  reasoning?: string,
  metaJson?: Record<string, unknown>,
  costUSD?: number,
  latencyMsec?: number,
  numInputTokens?: number,
  numOutputTokens?: number
): Promise<ArbitrationResult>
```

| Param | Type | Required | Description |
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
console.log(updated.history);      // [..., { fromState, toState, ... }]
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
2. Registers a built-in deterministic proposer (picks the first transition)
3. Loops until `currentState === goalState`:
   - Solicits proposals from all proposers
   - If 2+ proposals, solicits pairwise votes
   - Evaluates consensus
   - Executes the winning transition
4. Returns the completed session

## Store

The in-memory store is exported for testing and advanced use:

```typescript
import { sessions, specialists, proposals, votes, clear } from "dialai";

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
| `votes` | `Map<string, Vote>` | All votes by ID |
| `clear` | `() => void` | Clears all maps |

## Additional References

- [Types Reference](./types.md) - Complete type definitions
- [CLI Reference](./cli.md) - Command-line interface
- [Registering Specialists](/docs/guides/registering-specialists) - Execution modes
- [Implementing Strategies](/docs/guides/implementing-strategies) - Strategy functions
