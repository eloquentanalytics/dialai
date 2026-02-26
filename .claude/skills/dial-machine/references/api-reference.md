# DIAL API Reference

Complete API types and function signatures for the `dialai` library. All exports are available from the top-level `"dialai"` package.

## Core Types

### `MachineDefinition`

```typescript
interface MachineDefinition {
  machineName: string;                      // Unique identifier for this machine type
  initialState: string;                     // State where sessions start
  goalState: string;                        // Rest state where the session is headed
  states: Record<string, StateDefinition>;  // Map of state names to definitions
  specialists?: SpecialistDefinition[];     // Optional machine-level specialists
  consensusThreshold?: number;              // Default consensus threshold (0-1)
}
```

### `StateDefinition`

```typescript
interface StateDefinition {
  prompt?: string;                          // Decision prompt for this state
  transitions?: Record<string, string>;     // Map of transition names to target states
  consensusThreshold?: number;              // Override threshold for this state
  specialists?: SpecialistDefinition[];     // Per-state specialist declarations
}
```

### `Session`

```typescript
interface Session {
  sessionId: string;               // UUID generated at creation
  machineName: string;             // Name of the machine being run
  currentState: string;            // Current state in the machine
  currentRoundId: string;          // ID of the current decision round
  machine: MachineDefinition;      // The full machine definition
  history: TransitionRecord[];     // All executed transitions in order
  createdAt: Date;                 // When the session was created
  metaJson?: Record<string, unknown>; // Arbitrary session-level metadata
}
```

### `TransitionRecord`

```typescript
interface TransitionRecord {
  transitionName: string;          // Name of the transition taken
  reasoning: string;               // Why this transition was chosen
  executionTimestamp: Date;        // When the transition was executed
  metaJson?: Record<string, unknown>; // Arbitrary metadata from the winning proposal
}
```

## Specialist Types

### `SpecialistDefinition`

Used in machine JSON for declaring specialists:

```typescript
interface SpecialistDefinition {
  role: "proposer" | "arbiter";
  specialistId: string;
  machineName?: string;            // Defaults to the machine's machineName
  isHuman?: boolean;
  disabled?: boolean;              // Per-state: registered but not solicited
  strategyFn?: string;
  strategyFnName?: string;         // Built-in strategy name
  strategyWebhookUrl?: string;
  contextFn?: string;
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
  threshold?: number;
}
```

### `Proposer`

```typescript
interface Proposer {
  role: "proposer";
  specialistId: string;
  machineName: string;
  isHuman?: boolean;
  enabled?: boolean;               // Default true
  strategyFn?: (ctx: ProposerContext) => Promise<ProposerStrategyResult>;
  strategyFnName?: string;
  strategyWebhookUrl?: string;
  contextFn?: (ctx: ProposerContext) => Promise<string>;
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
  threshold?: number;
}
```

### `Arbiter`

```typescript
interface Arbiter {
  role: "arbiter";
  specialistId: string;
  machineName: string;
  enabled?: boolean;               // Default true
  strategyFn?: (ctx: ArbiterContext) => Promise<ArbiterStrategyResult>;
  strategyFnName?: string;
  strategyWebhookUrl?: string;
  webhookTokenName?: string;
  threshold?: number;
}
```

### `ProposerStrategyResult`

```typescript
interface ProposerStrategyResult {
  transitionName: string;
  toState: string;
  reasoning: string;
}
```

### `ArbiterStrategyResult`

```typescript
interface ArbiterStrategyResult {
  consensusReached: boolean;
  winningProposalId?: string;
  reasoning: string;
}
```

## Context Types

### `ProposerContext`

Provided to proposer strategy functions:

```typescript
interface ProposerContext {
  sessionId: string;
  currentState: string;
  prompt: string;                           // Decision prompt for this state
  transitions: Record<string, string>;      // Available transitions (name -> target)
  history: TransitionRecord[];              // All previous transitions
  metaJson?: Record<string, unknown>;       // Session-level metadata
}
```

### `ArbiterContext`

Provided to arbiter strategy functions:

```typescript
interface ArbiterContext {
  sessionId: string;
  roundId: string;
  currentState: string;
  prompt: string;
  machineName: string;
  proposals: Proposal[];                    // All proposals in this round
  alignmentScores?: Record<string, number>; // Alignment scores by specialistId
  humanGoldExamples?: HumanGoldExample[];   // Human gold examples
  history: TransitionRecord[];
  threshold?: number;                       // Configured threshold for this arbiter
  metaJson?: Record<string, unknown>;
}
```

## Decision Types

### `Proposal`

```typescript
interface Proposal {
  proposalId: string;              // UUID generated on creation
  sessionId: string;
  roundId: string;
  specialistId: string;            // Who submitted this proposal
  isHuman: boolean;
  transitionName: string;          // The transition being proposed
  toState: string;                 // Target state of the transition
  reasoning: string;
  metaJson?: Record<string, unknown>;
  costUSD?: number;                // Cost in USD to generate
  latencyMsec?: number;            // Time in milliseconds to generate
  numInputTokens?: number;
  numOutputTokens?: number;
  createdAt: Date;
}
```

### `ConsensusResult`

```typescript
interface ConsensusResult {
  consensusReached: boolean;
  winningProposalId?: string;      // Set if consensus reached
  reasoning: string;
}
```

### `ArbitrationResult`

Returned by `submitArbitration()`:

```typescript
interface ArbitrationResult {
  arbitrationId: string;
  sessionId: string;
  roundId: string;
  specialistId?: string;
  stale: boolean;                  // True if roundId doesn't match current
  guardsPass: boolean;             // True if all guards passed
  guardReason: string;             // Explanation if guards failed
  winningProposalId?: string;
  transitionName?: string;
  toState?: string;
  reasoning?: string;
  executed: boolean;               // Whether transition was executed
  isHuman: boolean;                // Whether this was a human-forced decision
  metaJson?: Record<string, unknown>;
  costUSD?: number;
  latencyMsec?: number;
  numInputTokens?: number;
  numOutputTokens?: number;
}
```

## Registration Options

### `RegisterProposerOptions`

Exactly one execution mode is required. Forbidden combinations are validated at registration time.

```typescript
interface RegisterProposerOptions {
  specialistId: string;                     // Required: unique identifier
  machineName: string;                      // Required: which machine

  isHuman?: boolean;

  // Execution mode (exactly one required):
  strategyFn?: (ctx: ProposerContext) => Promise<ProposerStrategyResult>;
  strategyFnName?: string;                  // Built-in strategy name
  strategyWebhookUrl?: string;              // External webhook URL

  // LLM-based modes:
  modelId?: string;                         // Required with contextFn or contextWebhookUrl
  contextFn?: (ctx: ProposerContext) => Promise<string>;
  contextWebhookUrl?: string;

  webhookTokenName?: string;                // Required with webhook URLs
  threshold?: number;                       // Strategy-specific threshold
}
```

**Five execution modes:**
1. `strategyFn` — local async function that returns `ProposerStrategyResult`
2. `strategyFnName` — name of a built-in strategy (`firstAvailable`, `lastAvailable`, `random`)
3. `strategyWebhookUrl` + `webhookTokenName` — external HTTP endpoint
4. `contextFn` + `modelId` — local function provides context string, DIAL calls the LLM
5. `contextWebhookUrl` + `modelId` + `webhookTokenName` — webhook provides context, DIAL calls the LLM

### `RegisterArbiterOptions`

```typescript
interface RegisterArbiterOptions {
  specialistId: string;                     // Required: unique identifier
  machineName: string;                      // Required: which machine

  // Execution mode (exactly one required):
  strategyFn?: (ctx: ArbiterContext) => Promise<ArbiterStrategyResult>;
  strategyFnName?: string;                  // Built-in strategy name
  strategyWebhookUrl?: string;              // External webhook URL

  webhookTokenName?: string;                // Required with webhook URLs
  threshold?: number;                       // Strategy-specific threshold
}
```

**Three execution modes:**
1. `strategyFn` — local async function
2. `strategyFnName` — name of a built-in strategy (`firstProposal`, `alignmentMargin`)
3. `strategyWebhookUrl` + `webhookTokenName` — external HTTP endpoint

### `SubmitProposalOptions`

```typescript
interface SubmitProposalOptions {
  sessionId: string;               // Required
  specialistId: string;            // Required
  roundId?: string;                // Defaults to session's currentRoundId
  transitionName?: string;         // If omitted, invokes registered strategy
  reasoning?: string;
  metaJson?: Record<string, unknown>;
  costUSD?: number;
  latencyMsec?: number;
  numInputTokens?: number;
  numOutputTokens?: number;
}
```

### `SubmitArbitrationOptions`

```typescript
interface SubmitArbitrationOptions {
  sessionId: string;               // Required
  roundId?: string;                // Defaults to session's currentRoundId
  specialistId?: string;           // Who is calling
  transitionName?: string;         // Force this transition (human only)
  reasoning?: string;
  metaJson?: Record<string, unknown>;
  costUSD?: number;
  latencyMsec?: number;
  numInputTokens?: number;
  numOutputTokens?: number;
}
```

## Function Signatures

### Session Management

```typescript
// Create a new session from a machine definition
async function createSession(
  machine: MachineDefinition,
  metaJson?: Record<string, unknown>
): Promise<Session>;

// Get a session by ID (throws if not found)
async function getSession(sessionId: string): Promise<Session>;

// Get all sessions
async function getSessions(): Promise<Session[]>;
```

### Specialist Registration

```typescript
// Register a proposer (throws if specialistId already exists)
async function registerProposer(opts: RegisterProposerOptions): Promise<Proposer>;

// Register an arbiter (throws if specialistId already exists)
async function registerArbiter(opts: RegisterArbiterOptions): Promise<Arbiter>;
```

### Decision Cycle

```typescript
// Submit a proposal (invokes strategy if transitionName omitted)
async function submitProposal(opts: SubmitProposalOptions): Promise<Proposal>;

// Evaluate consensus (read-only, does not execute transitions)
async function evaluateConsensus(sessionId: string): Promise<ConsensusResult>;

// Evaluate consensus and execute transition if reached
async function submitArbitration(opts: SubmitArbitrationOptions): Promise<ArbitrationResult>;

// Execute a state transition directly
async function executeTransition(
  sessionId: string,
  transitionName: string,
  toState: string,
  reasoning?: string
): Promise<Session>;
```

### Engine

```typescript
// Run a machine to completion (creates session, registers defaults, loops tick)
async function runSession(machine: MachineDefinition): Promise<Session>;

// Global heartbeat: one atomic step per active session
async function tick(): Promise<TickResult[]>;

// Select the highest-alignment proposer above threshold
async function selectChampion(
  machineName: string,
  threshold: number,
  proposers?: Proposer[],
  state?: string
): Promise<string | undefined>;
```

### Store

```typescript
// Reset all state (sessions, specialists, proposals, alignment records, etc.)
async function clear(): Promise<void>;
```

### Monitoring

```typescript
// Compute collapse metrics for a machine
async function getCollapseMetrics(
  machineName: string,
  state?: string
): Promise<CollapseMetrics>;
```

## Built-in Strategies

### Proposer Strategies

| Name | Behavior |
|---|---|
| `firstAvailable` | Returns the first transition in `ctx.transitions` |
| `lastAvailable` | Returns the last transition in `ctx.transitions` |
| `random` | Returns a randomly selected transition |

All throw if no transitions are available.

### Arbiter Strategies

| Name | Behavior |
|---|---|
| `firstProposal` | Accepts the first proposal by creation timestamp |
| `alignmentMargin` | Alignment-weighted margin consensus |

**`alignmentMargin` details:**
- Single proposal with `threshold <= 1`: auto-approves
- Multiple proposals: groups by `transitionName`, scores each group by summing proposer alignment scores
- `margin = (leaderScore - runnerUpScore) / totalAlignment`
- Consensus when `margin >= threshold` (default threshold = 1, requiring unanimity)
- Cold start (all alignment scores = 0): no consensus, human input required
- Winner: highest-alignment proposer in the winning transition group

## Monitoring Types

### `CollapseMetrics`

```typescript
interface CollapseMetrics {
  machineName: string;
  totalDecisions: number;
  humanDecisions: number;
  aiDecisions: number;
  collapseRatio: number;              // aiDecisions / totalDecisions
  recentCollapseRatio: number;        // Collapse ratio for recent decisions
  averageConsensusMargin: number;
  alignmentScores: Record<string, number>;
  specialists: SpecialistMetrics[];
  signals: Signal[];                  // Actionable signals (info/warning/action)
}
```

### `AlignmentRecord`

```typescript
interface AlignmentRecord {
  specialistId: string;
  machineName: string;
  state?: string;                     // When present, alignment is per-state
  matchingChoices: number;
  totalComparisons: number;
  alignmentScore: number;            // Wilson score lower bound
  lastUpdated: Date;
}
```

### `Exemplar`

```typescript
interface Exemplar {
  exemplarId: string;
  machineName: string;
  state: string;
  context: ProposerContext;           // Session context at decision time
  humanTransitionName: string;
  humanToState: string;
  proposals: Proposal[];              // All proposals that were available
  createdAt: Date;
}
```

### `TickResult`

```typescript
type TickStatus = "solicited" | "advanced" | "needs_human";

interface TickResult {
  sessionId: string;
  machineName: string;
  status: TickStatus;
  currentState: string;
  specialistId?: string;             // Set when status === "solicited"
  previousState?: string;            // Set when status === "advanced"
  transitionName?: string;           // Set when status === "advanced"
  reasoning?: string;                // Set when status === "advanced"
}
```

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `DIALAI_BASE_URL` | `""` | Remote DIAL server URL (proxy mode) |
| `DIALAI_PORT` | — | Port for HTTP server mode |
| `DIALAI_API_TOKEN` | `""` | Bearer token for HTTP server and proxy mode |
| `DIALAI_LLM_BASE_URL` | `"https://openrouter.ai/api/v1"` | OpenAI-compatible LLM endpoint |
| `OPENROUTER_API_TOKEN` | `""` | API token for OpenRouter or compatible provider |
