---
sidebar_position: 13
---

# Types Reference

Complete type definitions for the `dialai` library. All types are exported from the main package.

```typescript
import type {
  MachineDefinition,
  StateDefinition,
  SpecialistDefinition,
  Session,
  TransitionRecord,
  Specialist,
  Proposer,
  Arbiter,
  ProposerContext,
  ArbiterContext,
  ProposerStrategyResult,
  ArbiterStrategyResult,
  HumanGoldExample,
  Proposal,
  ConsensusResult,
  ArbitrationResult,
  ArbitrationPath,
  AlignmentRecord,
  Exemplar,
  AlignmentEvaluationResult,
  AccuracyEvaluationResult,
  DecisionRecord,
  CollapseMetrics,
  TickResult,
  TickStatus,
  SubmitProposalOptions,
  SubmitArbitrationOptions,
} from "dialai";
```

## Core Types

### MachineDefinition

The blueprint for a state machine. Defines the states, transitions, and prompts.

```typescript
interface MachineDefinition {
  machineName: string;                    // Unique identifier for this machine type
  initialState: string;                   // State where sessions start
  goalState: string;                      // Rest state where the session is headed
  states: Record<string, StateDefinition>;
  specialists?: SpecialistDefinition[];   // Optional specialists to register
  consensusThreshold?: number;            // Default consensus threshold (ahead-by-k)
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
  currentRoundId: string;       // ID of the current decision round
  machine: MachineDefinition;   // The full machine definition
  history: TransitionRecord[];  // All executed transitions in order
  createdAt: Date;              // When the session was created
  metaJson?: Record<string, unknown>;  // Arbitrary session-level metadata
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
type Specialist = Proposer | Arbiter;
```

### Proposer

A specialist that proposes state transitions.

```typescript
interface Proposer {
  role: "proposer";
  specialistId: string;
  machineName: string;
  isHuman?: boolean;              // If true, can force arbitration decisions
  enabled?: boolean;              // Whether this specialist is enabled (default true)
  strategyFn?: (ctx: ProposerContext) => Promise<ProposerStrategyResult>;
  strategyFnName?: string;        // Built-in strategy name
  strategyWebhookUrl?: string;
  contextFn?: (ctx: ProposerContext) => Promise<string>;
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
  enabled?: boolean;              // Whether this specialist is enabled (default true)
  strategyFn?: (ctx: ArbiterContext) => Promise<ArbiterStrategyResult>;
  strategyFnName?: string;        // Built-in: "aheadByK" | "firstProposal"
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
  metaJson?: Record<string, unknown>;   // Session-level metadata
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

### ArbiterContext

Context provided to arbiter strategy functions.

```typescript
interface ArbiterContext {
  sessionId: string;            // Current session ID
  roundId: string;              // Current round ID
  currentState: string;         // Current state name
  prompt: string;               // Decision prompt for this state
  machineName: string;          // Machine name
  proposals: Proposal[];        // All proposals in this round
  alignmentScores?: Record<string, number>;  // Alignment scores by specialistId
  humanGoldExamples?: HumanGoldExample[];    // Human gold examples (for mostSimilar)
  history: TransitionRecord[];  // All previous transitions
  threshold: number;            // Configured threshold for this arbiter
  metaJson?: Record<string, unknown>;  // Session-level metadata
}
```

**Example usage in a strategy function:**

```typescript
const arbiterStrategy = async (ctx: ArbiterContext) => {
  // Alignment-weighted margin (matching the built-in aheadByK)
  const scores = ctx.alignmentScores ?? {};
  const groups = new Map<string, { score: number; bestId: string; bestAlign: number }>();
  let totalAlign = 0;

  for (const p of ctx.proposals) {
    const align = scores[p.specialistId] ?? 0;
    totalAlign += align;
    const g = groups.get(p.transitionName);
    if (g) {
      g.score += align;
      if (align > g.bestAlign) { g.bestAlign = align; g.bestId = p.proposalId; }
    } else {
      groups.set(p.transitionName, { score: align, bestId: p.proposalId, bestAlign: align });
    }
  }

  if (totalAlign === 0) {
    return { consensusReached: false, reasoning: "Cold start: no alignment data" };
  }

  const sorted = [...groups.entries()].sort((a, b) => b[1].score - a[1].score);
  const margin = (sorted[0][1].score - (sorted[1]?.[1].score ?? 0)) / totalAlign;

  if (ctx.threshold < 1 && margin >= ctx.threshold) {
    return {
      consensusReached: true,
      winningProposalId: sorted[0][1].bestId,
      reasoning: `Margin ${margin.toFixed(2)} >= threshold ${ctx.threshold}`,
    };
  }

  return { consensusReached: false, reasoning: `Margin ${margin.toFixed(2)} below threshold ${ctx.threshold}` };
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
  createdAt: Date;          // When the proposal was created
}
```

The cost tracking fields enable measuring the economic cost of AI delegation. DIAL tracks these per-specialist to answer: what does it cost to delegate this decision to AI?

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
  strategyFnName?: string;  // Built-in: "firstAvailable", "lastAvailable", "random"

  // For LLM-based modes:
  modelId?: string;
  contextFn?: (ctx: ProposerContext) => Promise<string>;
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
  strategyFnName?: string;  // Built-in: "aheadByK" | "firstProposal"

  // For webhooks:
  webhookTokenName?: string;

  // For built-in strategies:
  threshold?: number;  // Strategy-specific threshold (see Consensus Strategies)
}
```

**Note:** Arbiters do not support LLM-based modes (`contextFn + modelId`, `contextWebhookUrl + modelId`) because arbitration must be deterministic and auditable. See [Consensus Strategies](/docs/concepts/consensus-strategies) for details on built-in arbiter strategies.

## Execution Modes

Proposers support five execution modes. Arbiters support three (no LLM modes). Exactly one must be configured.

| Mode | Parameters | Proposer | Arbiter |
|------|------------|:--------:|:-------:|
| **1. Local Strategy** | `strategyFn` | ✓ | ✓ |
| **2. Webhook Strategy** | `strategyWebhookUrl`, `webhookTokenName` | ✓ | ✓ |
| **3. Local Context + LLM** | `contextFn`, `modelId` | ✓ | ✗ |
| **4. Webhook Context + LLM** | `contextWebhookUrl`, `webhookTokenName`, `modelId` | ✓ | ✗ |
| **5. Built-in Strategy** | `strategyFnName`, `threshold?` | ✓ | ✓ |

Arbiters cannot use LLM-based modes because arbitration must be deterministic and auditable.

See [Registering Specialists](/docs/guides/registering-specialists) for detailed examples of each mode.

## Additional Types

### StateDefinition

Definition of a single state in the machine.

```typescript
interface StateDefinition {
  prompt?: string;                         // Decision prompt for this state
  transitions?: Record<string, string>;    // Map of transition names to target states
  consensusThreshold?: number;             // Consensus threshold override for this state
  specialists?: SpecialistDefinition[];    // Per-state specialist declarations
}
```

### SpecialistDefinition

Specialist definition for machine JSON files (used in `MachineDefinition.specialists`).

```typescript
interface SpecialistDefinition {
  role: "proposer" | "arbiter";
  specialistId: string;
  machineName?: string;
  isHuman?: boolean;
  disabled?: boolean;           // Per-state: don't solicit but still registered
  strategyFn?: string;
  strategyFnName?: string;
  strategyWebhookUrl?: string;
  contextFn?: string;
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
  threshold?: number;
}
```

### HumanGoldExample

Human gold example for similarity-based arbitration.

```typescript
interface HumanGoldExample {
  transitionName: string;                  // The expected transition
  reasoning: string;                       // The reasoning for this decision
  metaJson?: Record<string, unknown>;      // Arbitrary metadata
}
```

### ProposerStrategyResult

Result from a proposer strategy function.

```typescript
interface ProposerStrategyResult {
  transitionName: string;
  toState: string;
  reasoning: string;
}
```

### ArbiterStrategyResult

Result from an arbiter strategy function.

```typescript
interface ArbiterStrategyResult {
  consensusReached: boolean;
  winningProposalId?: string;
  reasoning: string;
}
```

### ArbitrationPath

Pure classification of which path `submitArbitration` should take.

```typescript
type ArbitrationPath =
  | { type: "stale" }
  | { type: "humanOverride"; transitionName: string; toState: string }
  | { type: "notHuman" }
  | { type: "invalidTransition"; reason: string }
  | { type: "noProposals" }
  | { type: "evaluate" };
```

### AlignmentRecord

Tracks how well a specialist aligns with human decisions.

```typescript
interface AlignmentRecord {
  specialistId: string;       // The specialist being tracked
  machineName: string;        // The machine this alignment is for
  state?: string;             // When present, alignment is tracked per-state
  matchingChoices: number;    // Number of times specialist matched human choice
  totalComparisons: number;   // Total number of comparisons
  alignmentScore: number;     // Wilson score lower bound of matchingChoices / totalComparisons
  lastUpdated: Date;          // When this record was last updated
}
```

### Exemplar

A snapshot of context when a human forces a decision.

```typescript
interface Exemplar {
  exemplarId: string;                 // UUID for this exemplar
  machineName: string;                // Machine name
  state: string;                      // The state when the decision was made
  context: ProposerContext;           // The session context at decision time
  humanTransitionName: string;        // The transition the human chose
  humanToState: string;               // The state the human transitioned to
  proposals: Proposal[];              // All proposals that were available
  createdAt: Date;                    // When this exemplar was created
}
```

### AlignmentEvaluationResult

Result of evaluating a specialist's alignment with human decisions.

```typescript
interface AlignmentEvaluationResult {
  specialistId: string;        // The specialist evaluated
  machineName: string;         // Machine name
  totalExemplars: number;      // Total exemplars evaluated against
  matchingDecisions: number;   // Number of matching decisions
  alignmentScore: number;      // Wilson score lower bound of matchingDecisions / totalExemplars
}
```

### AccuracyEvaluationResult

Result of evaluating a specialist's accuracy metrics.

```typescript
interface AccuracyEvaluationResult {
  specialistId: string;          // The specialist evaluated
  machineName: string;           // Machine name
  totalDecisions: number;        // Number of decisions evaluated
  transitionMatchRate: number;   // Rate of matching transitions
  stateMatchRate: number;        // Rate of matching target states
  totalCostUSD: number;          // Total cost in USD
  avgLatencyMsec: number;        // Average latency in milliseconds
}
```

### DecisionRecord

A record of a single arbitration decision, captured for monitoring.

```typescript
interface DecisionRecord {
  decisionId: string;
  sessionId: string;
  machineName: string;
  roundId: string;
  fromState: string;
  toState: string;
  transitionName: string;
  isHuman: boolean;
  proposals: Proposal[];                     // Snapshot of all proposals
  alignmentSnapshot: Record<string, number>; // Alignment scores at decision time
  consensusMargin: number | null;            // Margin from aheadByK, or null if human-forced
  threshold: number;                         // Arbiter threshold at decision time
  timestamp: Date;
}
```

### CollapseMetrics

Computed metrics for progressive collapse monitoring.

```typescript
interface CollapseMetrics {
  machineName: string;
  totalDecisions: number;
  humanDecisions: number;
  aiDecisions: number;
  collapseRatio: number;
  recentCollapseRatio: number;
  averageConsensusMargin: number;
  alignmentScores: Record<string, number>;
  specialists: SpecialistMetrics[];
  signals: Signal[];
}
```

### TickResult / TickStatus

Types for tick-based orchestration.

```typescript
type TickStatus =
  | "solicited"    // triggered one proposer to submit
  | "advanced"     // consensus reached, transition executed
  | "needs_human"; // all proposals in, no consensus

interface TickResult {
  sessionId: string;
  machineName: string;
  status: TickStatus;
  currentState: string;
  specialistId?: string;    // Set when status === 'solicited'
  previousState?: string;   // Set when status === 'advanced'
  transitionName?: string;  // Set when status === 'advanced'
  reasoning?: string;       // Set when status === 'advanced'
}
```

## Submit Options

### SubmitProposalOptions

Options for `submitProposal()`.

```typescript
interface SubmitProposalOptions {
  sessionId: string;                      // Required: session to submit to
  specialistId: string;                   // Required: who is submitting
  roundId?: string;                       // Round ID (optional, uses current)
  transitionName?: string;                // Transition to propose (invokes strategy if omitted)
  reasoning?: string;                     // Explanation
  metaJson?: Record<string, unknown>;     // Arbitrary metadata
  costUSD?: number;                       // Cost in USD
  latencyMsec?: number;                   // Time in milliseconds
  numInputTokens?: number;                // Input tokens
  numOutputTokens?: number;               // Output tokens
}
```

### SubmitArbitrationOptions

Options for `submitArbitration()`.

```typescript
interface SubmitArbitrationOptions {
  sessionId: string;                      // Required: session to arbitrate
  roundId?: string;                       // Round ID (optional, uses current)
  specialistId?: string;                  // Who is calling
  transitionName?: string;                // Force this transition (human only)
  reasoning?: string;                     // Explanation
  metaJson?: Record<string, unknown>;     // Arbitrary metadata
  costUSD?: number;                       // Cost in USD
  latencyMsec?: number;                   // Time in milliseconds
  numInputTokens?: number;                // Input tokens
  numOutputTokens?: number;               // Output tokens
}
```
