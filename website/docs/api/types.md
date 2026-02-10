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
  goalState: string;         // Rest state where no action is needed
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
  history: TransitionRecord[];  // All transitions that have occurred
  createdAt: Date;              // When the session was created
}
```

### TransitionRecord

A record of a single state transition.

```typescript
interface TransitionRecord {
  fromState: string;      // State before the transition
  toState: string;        // State after the transition
  transitionName: string; // Name of the transition taken
  reasoning: string;      // Why this transition was chosen
  timestamp: Date;        // When the transition occurred
}
```

## Specialist Types

### Specialist

Union type for all specialist roles.

```typescript
type Specialist = Proposer | Voter;
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
  strategyWebhookUrl?: string;
  contextFn?: (ctx: ProposerContext) => Promise<string>;
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
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
  strategyWebhookUrl?: string;
  contextFn?: (ctx: VoterContext) => Promise<string>;
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
}
```

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

## Decision Types

### Proposal

A proposed state transition.

```typescript
interface Proposal {
  proposalId: string;       // UUID generated on creation
  sessionId: string;        // Session this proposal belongs to
  roundId: string;          // Round this proposal belongs to
  specialistId: string;     // Who submitted this proposal
  isHuman: boolean;         // Whether this was submitted by a human specialist
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
  isHuman: boolean;         // Whether this was cast by a human specialist
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

  // For LLM-based modes:
  modelId?: string;
  contextFn?: (ctx: ProposerContext) => Promise<string>;
  contextWebhookUrl?: string;
  webhookTokenName?: string;
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

  // For LLM-based modes:
  modelId?: string;
  contextFn?: (ctx: VoterContext) => Promise<string>;
  contextWebhookUrl?: string;
  webhookTokenName?: string;
}
```

## Execution Modes

Both proposers and voters support four execution modes. Exactly one must be configured.

| Mode | Parameters | Description |
|------|------------|-------------|
| **Local Strategy** | `strategyFn` | Your function handles everything |
| **Webhook Strategy** | `strategyWebhookUrl`, `webhookTokenName` | Remote service returns decisions |
| **Local Context + LLM** | `contextFn`, `modelId` | You provide context, LLM decides |
| **Webhook Context + LLM** | `contextWebhookUrl`, `webhookTokenName`, `modelId` | Remote context, LLM decides |

See [Registering Specialists](/docs/guides/registering-specialists) for detailed examples of each mode.
