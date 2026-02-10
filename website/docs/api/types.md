---
sidebar_position: 10
---

# Types Reference

Complete type definitions for the `dialai` library. All types are exported from the main package.

```typescript
import type {
  MachineDefinition,
  Session,
  TransitionRecord,
  Specialist,
  Proposer,
  Voter,
  ProposerContext,
  VoterContext,
  Proposal,
  Vote,
  ConsensusResult,
  ArbitrationResult,
  VoteChoice,
} from "dialai";
```

## Core Types

### MachineDefinition

The blueprint for a state machine. Defines the states, transitions, and prompts.

```typescript
interface MachineDefinition {
  machineName: string;       // Unique identifier for this machine type
  initialState: string;      // State where sessions start
  goalState: string;         // Rest state where the session is headed
  states: Record<string, {
    prompt?: string;         // Decision prompt for this state
    transitions?: Record<string, string>;  // Map of transition names to target states
  }>;
}
```

**Example:**

```typescript
const machine: MachineDefinition = {
  machineName: "document-review",
  initialState: "pending",
  goalState: "approved",
  states: {
    pending: {
      prompt: "Review the document. Approve or request changes?",
      transitions: {
        approve: "approved",
        request_changes: "needs_revision",
      },
    },
    needs_revision: {
      prompt: "Revisions submitted. Approve now?",
      transitions: {
        approve: "approved",
        request_changes: "needs_revision",
      },
    },
    approved: {}, // Terminal state - no transitions
  },
};
```

### Session

A running instance of a state machine.

```typescript
interface Session {
  sessionId: string;            // UUID generated at creation
  machineName: string;          // Name of the machine being run
  currentState: string;         // Current state in the machine
  machine: MachineDefinition;   // The full machine definition
  history: TransitionRecord[];  // All executed transitions in order
  createdAt: Date;              // When the session was created
}
```

### TransitionRecord

A record of a single state transition. Provided to specialists via the `history` field in their context.

```typescript
interface TransitionRecord {
  transitionName: string;              // Name of the transition taken
  reasoning: string;                   // Why this transition was chosen
  executionTimestamp: Date;            // When the transition was executed
  metaJson?: Record<string, unknown>;  // Arbitrary metadata from the winning proposal
}
```

## Specialist Types

### Specialist

Union type for all specialist roles.

```typescript
type Specialist = Proposer | Voter | Arbiter;
```

### Proposer

A specialist that proposes state transitions.

```typescript
interface Proposer {
  role: "proposer";
  specialistId: string;
  machineName: string;
  isHuman?: boolean;              // If true, can force arbitration decisions
  strategyFn?: (ctx: ProposerContext) => Promise<{
    transitionName: string;
    toState: string;
    reasoning: string;
  }>;
  strategyFnName?: string;        // Built-in strategy name
  strategyWebhookUrl?: string;
  contextFn?: (ctx: ProposerContext) => Promise<string>;
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
  threshold?: number;             // Strategy-specific threshold
}
```

### Voter

A specialist that votes on proposals.

```typescript
interface Voter {
  role: "voter";
  specialistId: string;
  machineName: string;
  isHuman?: boolean;              // If true, can force arbitration decisions
  strategyFn?: (ctx: VoterContext) => Promise<{
    voteFor: VoteChoice;
    reasoning: string;
  }>;
  strategyFnName?: string;        // Built-in strategy name
  strategyWebhookUrl?: string;
  contextFn?: (ctx: VoterContext) => Promise<string>;
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
  threshold?: number;             // Strategy-specific threshold
}
```

### Arbiter

A specialist that evaluates consensus and determines winning proposals.

```typescript
interface Arbiter {
  role: "arbiter";
  specialistId: string;
  machineName: string;
  strategyFn?: (ctx: ArbiterContext) => Promise<{
    consensusReached: boolean;
    winningProposalId?: string;
    reasoning: string;
  }>;
  strategyFnName?: string;        // Built-in: "most_similar", "ahead_by_k", "pairwise_consensus"
  strategyWebhookUrl?: string;
  webhookTokenName?: string;
  threshold?: number;             // Strategy-specific threshold
}
```

**Note:** Arbiters do not have `isHuman` because arbitration must always be deterministic. Human override is handled separately via `submitArbitration` with an explicit `transitionName`.

## Context Types

### ProposerContext

Context provided to proposer strategy functions.

```typescript
interface ProposerContext {
  sessionId: string;                    // Current session ID
  currentState: string;                 // Current state name
  prompt: string;                       // Decision prompt for this state
  transitions: Record<string, string>;  // Available transitions (name → target)
  history: TransitionRecord[];          // All previous transitions
}
```

**Example usage in a strategy function:**

```typescript
const proposerStrategy = async (ctx: ProposerContext) => {
  // ctx.transitions might be { "approve": "approved", "reject": "rejected" }
  const transitionName = Object.keys(ctx.transitions)[0]; // "approve"
  const toState = ctx.transitions[transitionName];        // "approved"

  return {
    transitionName,
    toState,
    reasoning: `Choosing ${transitionName} based on: ${ctx.prompt}`,
  };
};
```

### VoterContext

Context provided to voter strategy functions.

```typescript
interface VoterContext {
  sessionId: string;            // Current session ID
  currentState: string;         // Current state name
  prompt: string;               // Decision prompt for this state
  proposalA: Proposal;          // First proposal to compare
  proposalB: Proposal;          // Second proposal to compare
  history: TransitionRecord[];  // All previous transitions
}
```

**Example usage in a strategy function:**

```typescript
const voterStrategy = async (ctx: VoterContext) => {
  // Compare the two proposals
  if (ctx.proposalA.toState === "approved") {
    return { voteFor: "A", reasoning: "Proposal A leads to approval" };
  }
  if (ctx.proposalB.toState === "approved") {
    return { voteFor: "B", reasoning: "Proposal B leads to approval" };
  }
  return { voteFor: "NEITHER", reasoning: "Neither proposal leads to approval" };
};
```

### ArbiterContext

Context provided to arbiter strategy functions.

```typescript
interface ArbiterContext {
  sessionId: string;            // Current session ID
  roundId: string;              // Current round ID
  currentState: string;         // Current state name
  prompt: string;               // Decision prompt for this state
  proposals: Proposal[];        // All proposals in this round
  votes: Vote[];                // All votes in this round
  humanGoldExamples?: HumanGoldExample[];  // Human gold examples (for most_similar)
  history: TransitionRecord[];  // All previous transitions
  threshold: number;            // Configured threshold for this arbiter
}
```

**Example usage in a strategy function:**

```typescript
const arbiterStrategy = async (ctx: ArbiterContext) => {
  // Simple ahead-by-k logic
  const tallies = countVotes(ctx.proposals, ctx.votes);
  const sorted = Object.entries(tallies).sort((a, b) => b[1] - a[1]);

  if (sorted.length < 2) {
    return { consensusReached: false, reasoning: "Not enough proposals" };
  }

  const lead = sorted[0][1] - sorted[1][1];
  if (lead >= ctx.threshold) {
    return {
      consensusReached: true,
      winningProposalId: sorted[0][0],
      reasoning: `Proposal ahead by ${lead} votes (threshold: ${ctx.threshold})`,
    };
  }

  return { consensusReached: false, reasoning: `Lead of ${lead} below threshold ${ctx.threshold}` };
};
```

## Decision Types

### Proposal

A proposed state transition.

```typescript
interface Proposal {
  proposalId: string;       // UUID generated on creation
  sessionId: string;        // Session this proposal belongs to
  roundId: string;          // Round this proposal belongs to
  specialistId: string;     // Who submitted this proposal
  isHuman: boolean;         // Whether submitted by a human specialist
  transitionName: string;   // The transition being proposed
  toState: string;          // Target state of the transition
  reasoning: string;        // Why this transition was proposed
  metaJson?: Record<string, unknown>;  // Arbitrary client metadata
  costUSD?: number;         // Cost in USD to generate this proposal
  latencyMsec?: number;     // Time in milliseconds to generate
  numInputTokens?: number;  // Input tokens used
  numOutputTokens?: number; // Output tokens used
}
```

The cost tracking fields enable measuring the economic cost of AI delegation. DIAL tracks these per-specialist to answer: what does it cost to delegate this decision to AI?

### Vote

A vote comparing two proposals.

```typescript
interface Vote {
  voteId: string;           // UUID generated on creation
  sessionId: string;        // Session this vote belongs to
  roundId: string;          // Round this vote belongs to
  specialistId: string;     // Who cast this vote
  isHuman: boolean;         // Whether cast by a human specialist
  proposalIdA: string;      // First proposal being compared
  proposalIdB: string;      // Second proposal being compared
  voteFor: VoteChoice;      // The vote choice
  reasoning: string;        // Why this vote was cast
  metaJson?: Record<string, unknown>;  // Arbitrary client metadata
  costUSD?: number;         // Cost in USD to generate this vote
  latencyMsec?: number;     // Time in milliseconds to generate
  numInputTokens?: number;  // Input tokens used
  numOutputTokens?: number; // Output tokens used
}
```

### VoteChoice

The possible vote values.

```typescript
type VoteChoice = "A" | "B" | "BOTH" | "NEITHER";
```

| Value | Meaning |
|-------|---------|
| `"A"` | Prefer proposal A (+1 to A's tally) |
| `"B"` | Prefer proposal B (+1 to B's tally) |
| `"BOTH"` | Both acceptable (+1 to both tallies) |
| `"NEITHER"` | Neither acceptable (+0 to both tallies) |

### ConsensusResult

The result of evaluating consensus.

```typescript
interface ConsensusResult {
  consensusReached: boolean;      // Whether consensus was achieved
  winningProposalId?: string;     // ID of the winning proposal (if consensus)
  reasoning: string;              // Explanation of the result
}
```

### ArbitrationResult

The result of a `submitArbitration` call.

```typescript
interface ArbitrationResult {
  arbitrationId: string;          // UUID for this arbitration
  sessionId: string;              // Session this arbitration is for
  roundId: string;                // Round this arbitration is for
  specialistId?: string;          // Who called this arbitration
  stale: boolean;                 // True if roundId doesn't match current
  guardsPass: boolean;            // True if all guards passed
  guardReason: string;            // Explanation if guards failed
  winningProposalId?: string;     // The winning proposal (if consensus)
  transitionName?: string;        // The transition to execute
  toState?: string;               // The target state
  reasoning?: string;             // Synthesized or provided reasoning
  executed: boolean;              // Whether transition was executed
  isHuman: boolean;               // Whether this was a human-forced decision
  metaJson?: Record<string, unknown>;  // Client metadata
  costUSD?: number;               // Cost in USD for this arbitration
  latencyMsec?: number;           // Time in milliseconds
  numInputTokens?: number;        // Input tokens used
  numOutputTokens?: number;       // Output tokens used
}
```

See [submitArbitration](./submitArbitration.md) for usage examples.

## Registration Options

### RegisterProposerOptions

Options for `registerProposer()`.

```typescript
interface RegisterProposerOptions {
  specialistId: string;    // Required: unique identifier
  machineName: string;     // Required: which machine to participate in

  // Execution mode (exactly one required):
  strategyFn?: (ctx: ProposerContext) => Promise<{
    transitionName: string;
    toState: string;
    reasoning: string;
  }>;
  strategyWebhookUrl?: string;
  strategyFnName?: string;  // Built-in strategy name (e.g., "first_available", "random")

  // For LLM-based modes:
  modelId?: string;
  contextFn?: (ctx: ProposerContext) => Promise<string>;
  contextWebhookUrl?: string;
  webhookTokenName?: string;

  // For built-in strategies:
  threshold?: number;  // Strategy-specific threshold
}
```

### RegisterVoterOptions

Options for `registerVoter()`.

```typescript
interface RegisterVoterOptions {
  specialistId: string;    // Required: unique identifier
  machineName: string;     // Required: which machine to participate in

  // Execution mode (exactly one required):
  strategyFn?: (ctx: VoterContext) => Promise<{
    voteFor: VoteChoice;
    reasoning: string;
  }>;
  strategyWebhookUrl?: string;
  strategyFnName?: string;  // Built-in strategy name (e.g., "prefer_a", "random")

  // For LLM-based modes:
  modelId?: string;
  contextFn?: (ctx: VoterContext) => Promise<string>;
  contextWebhookUrl?: string;
  webhookTokenName?: string;

  // For built-in strategies:
  threshold?: number;  // Strategy-specific threshold
}
```

### RegisterArbiterOptions

Options for `registerArbiter()`.

```typescript
interface RegisterArbiterOptions {
  specialistId: string;    // Required: unique identifier
  machineName: string;     // Required: which machine to participate in

  // Execution mode (exactly one required):
  strategyFn?: (ctx: ArbiterContext) => Promise<{
    consensusReached: boolean;
    winningProposalId?: string;
    reasoning: string;
  }>;
  strategyWebhookUrl?: string;
  strategyFnName?: string;  // Built-in strategy: "most_similar", "ahead_by_k", "pairwise_consensus"

  // For webhooks:
  webhookTokenName?: string;

  // For built-in strategies:
  threshold?: number;  // Strategy-specific threshold (see Consensus Strategies)
}
```

**Note:** Arbiters do not support LLM-based modes (`contextFn + modelId`, `contextWebhookUrl + modelId`) because arbitration must be deterministic and auditable. See [Consensus Strategies](/docs/concepts/consensus-strategies) for details on built-in arbiter strategies.

## Execution Modes

Proposers and voters support five execution modes. Arbiters support three (no LLM modes). Exactly one must be configured.

| Mode | Parameters | Proposer | Voter | Arbiter |
|------|------------|:--------:|:-----:|:-------:|
| **1. Local Strategy** | `strategyFn` | ✓ | ✓ | ✓ |
| **2. Webhook Strategy** | `strategyWebhookUrl`, `webhookTokenName` | ✓ | ✓ | ✓ |
| **3. Local Context + LLM** | `contextFn`, `modelId` | ✓ | ✓ | ✗ |
| **4. Webhook Context + LLM** | `contextWebhookUrl`, `webhookTokenName`, `modelId` | ✓ | ✓ | ✗ |
| **5. Built-in Strategy** | `strategyFnName`, `threshold?` | ✓ | ✓ | ✓ |

Arbiters cannot use LLM-based modes because arbitration must be deterministic and auditable.

See [Registering Specialists](/docs/guides/registering-specialists) for detailed examples of each mode.
