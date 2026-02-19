/**
 * DIAL AI Type Definitions
 *
 * Complete type definitions for the dialai library.
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * The blueprint for a state machine. Defines the states, transitions, and prompts.
 */
export interface MachineDefinition {
  /** Unique identifier for this machine type */
  machineName: string;
  /** State where sessions start */
  initialState: string;
  /** Rest state where the session is headed */
  goalState: string;
  /** Map of state names to state definitions */
  states: Record<string, StateDefinition>;
  /** Optional specialists to register when running this machine */
  specialists?: SpecialistDefinition[];
  /** Default consensus threshold for the machine (risk dial) */
  consensusThreshold?: number;
}

/**
 * Definition of a single state in the machine.
 */
export interface StateDefinition {
  /** Decision prompt for this state */
  prompt?: string;
  /** Map of transition names to target states */
  transitions?: Record<string, string>;
  /** Consensus threshold override for this state (risk dial) */
  consensusThreshold?: number;
  /** Per-state specialist declarations (overrides machine-level when present) */
  specialists?: SpecialistDefinition[];
}

/**
 * A running instance of a state machine.
 */
export interface Session {
  /** UUID generated at creation */
  sessionId: string;
  /** Name of the machine being run */
  machineName: string;
  /** Current state in the machine */
  currentState: string;
  /** ID of the current decision round */
  currentRoundId: string;
  /** The full machine definition */
  machine: MachineDefinition;
  /** All executed transitions in order */
  history: TransitionRecord[];
  /** When the session was created */
  createdAt: Date;
}

/**
 * A record of a single state transition.
 */
export interface TransitionRecord {
  /** Name of the transition taken */
  transitionName: string;
  /** Why this transition was chosen */
  reasoning: string;
  /** When the transition was executed */
  executionTimestamp: Date;
  /** Arbitrary metadata from the winning proposal */
  metaJson?: Record<string, unknown>;
}

// ============================================================================
// Specialist Types
// ============================================================================

/**
 * Union type for all specialist roles.
 */
export type Specialist = Proposer | Arbiter;

/**
 * Specialist definition for machine JSON files.
 */
export interface SpecialistDefinition {
  role: "proposer" | "arbiter";
  specialistId: string;
  machineName?: string;
  isHuman?: boolean;
  /** Per-state: don't solicit but still registered */
  disabled?: boolean;
  strategyFn?: string;
  strategyFnName?: string;
  strategyWebhookUrl?: string;
  contextFn?: string;
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
  threshold?: number;
}

/**
 * A specialist that proposes state transitions.
 */
export interface Proposer {
  role: "proposer";
  specialistId: string;
  machineName: string;
  /** If true, can force arbitration decisions */
  isHuman?: boolean;
  /** Whether this specialist is enabled (default true) */
  enabled?: boolean;
  /** Local strategy function */
  strategyFn?: (ctx: ProposerContext) => Promise<ProposerStrategyResult>;
  /** Built-in strategy name */
  strategyFnName?: string;
  /** External webhook URL */
  strategyWebhookUrl?: string;
  /** Local context function for LLM mode */
  contextFn?: (ctx: ProposerContext) => Promise<string>;
  /** Webhook context URL for LLM mode */
  contextWebhookUrl?: string;
  /** Model ID for LLM-based modes */
  modelId?: string;
  /** Environment variable name for webhook token */
  webhookTokenName?: string;
  /** Strategy-specific threshold */
  threshold?: number;
}

/**
 * Result from a proposer strategy function.
 */
export interface ProposerStrategyResult {
  transitionName: string;
  toState: string;
  reasoning: string;
}

/**
 * A specialist that evaluates consensus and determines winning proposals.
 */
export interface Arbiter {
  role: "arbiter";
  specialistId: string;
  machineName: string;
  /** Whether this specialist is enabled (default true) */
  enabled?: boolean;
  /** Local strategy function */
  strategyFn?: (ctx: ArbiterContext) => Promise<ArbiterStrategyResult>;
  /** Built-in strategy name */
  strategyFnName?: string;
  /** External webhook URL */
  strategyWebhookUrl?: string;
  /** Environment variable name for webhook token */
  webhookTokenName?: string;
  /** Strategy-specific threshold */
  threshold?: number;
}

/**
 * Result from an arbiter strategy function.
 */
export interface ArbiterStrategyResult {
  consensusReached: boolean;
  winningProposalId?: string;
  reasoning: string;
}

// ============================================================================
// Context Types
// ============================================================================

/**
 * Context provided to proposer strategy functions.
 */
export interface ProposerContext {
  /** Current session ID */
  sessionId: string;
  /** Current state name */
  currentState: string;
  /** Decision prompt for this state */
  prompt: string;
  /** Available transitions (name → target) */
  transitions: Record<string, string>;
  /** All previous transitions */
  history: TransitionRecord[];
}

/**
 * Human gold example for similarity-based arbitration.
 */
export interface HumanGoldExample {
  /** The expected transition */
  transitionName: string;
  /** The reasoning for this decision */
  reasoning: string;
  /** Arbitrary metadata */
  metaJson?: Record<string, unknown>;
}

/**
 * Context provided to arbiter strategy functions.
 */
export interface ArbiterContext {
  /** Current session ID */
  sessionId: string;
  /** Current round ID */
  roundId: string;
  /** Current state name */
  currentState: string;
  /** Decision prompt for this state */
  prompt: string;
  /** Machine name */
  machineName: string;
  /** All proposals in this round */
  proposals: Proposal[];
  /** Alignment scores by specialistId */
  alignmentScores?: Record<string, number>;
  /** Human gold examples (for mostSimilar) */
  humanGoldExamples?: HumanGoldExample[];
  /** All previous transitions */
  history: TransitionRecord[];
  /** Configured threshold for this arbiter */
  threshold: number;
}

// ============================================================================
// Decision Types
// ============================================================================

/**
 * A proposed state transition.
 */
export interface Proposal {
  /** UUID generated on creation */
  proposalId: string;
  /** Session this proposal belongs to */
  sessionId: string;
  /** Round this proposal belongs to */
  roundId: string;
  /** Who submitted this proposal */
  specialistId: string;
  /** Whether submitted by a human specialist */
  isHuman: boolean;
  /** The transition being proposed */
  transitionName: string;
  /** Target state of the transition */
  toState: string;
  /** Why this transition was proposed */
  reasoning: string;
  /** Arbitrary client metadata */
  metaJson?: Record<string, unknown>;
  /** Cost in USD to generate this proposal */
  costUSD?: number;
  /** Time in milliseconds to generate */
  latencyMsec?: number;
  /** Input tokens used */
  numInputTokens?: number;
  /** Output tokens used */
  numOutputTokens?: number;
  /** When the proposal was created */
  createdAt: Date;
}

/**
 * The result of evaluating consensus.
 */
export interface ConsensusResult {
  /** Whether consensus was achieved */
  consensusReached: boolean;
  /** ID of the winning proposal (if consensus) */
  winningProposalId?: string;
  /** Explanation of the result */
  reasoning: string;
}

/**
 * The result of a submitArbitration call.
 */
export interface ArbitrationResult {
  /** UUID for this arbitration */
  arbitrationId: string;
  /** Session this arbitration is for */
  sessionId: string;
  /** Round this arbitration is for */
  roundId: string;
  /** Who called this arbitration */
  specialistId?: string;
  /** True if roundId doesn't match current */
  stale: boolean;
  /** True if all guards passed */
  guardsPass: boolean;
  /** Explanation if guards failed */
  guardReason: string;
  /** The winning proposal (if consensus) */
  winningProposalId?: string;
  /** The transition to execute */
  transitionName?: string;
  /** The target state */
  toState?: string;
  /** Synthesized or provided reasoning */
  reasoning?: string;
  /** Whether transition was executed */
  executed: boolean;
  /** Whether this was a human-forced decision */
  isHuman: boolean;
  /** Client metadata */
  metaJson?: Record<string, unknown>;
  /** Cost in USD for this arbitration */
  costUSD?: number;
  /** Time in milliseconds */
  latencyMsec?: number;
  /** Input tokens used */
  numInputTokens?: number;
  /** Output tokens used */
  numOutputTokens?: number;
}

// ============================================================================
// Arbitration Classification Types
// ============================================================================

/**
 * Pure classification of which path submitArbitration should take.
 */
export type ArbitrationPath =
  | { type: "stale" }
  | { type: "humanOverride"; transitionName: string; toState: string }
  | { type: "notHuman" }
  | { type: "invalidTransition"; reason: string }
  | { type: "noProposals" }
  | { type: "evaluate" };

// ============================================================================
// Alignment Types
// ============================================================================

/**
 * Tracks how well a specialist aligns with human decisions.
 */
export interface AlignmentRecord {
  /** The specialist being tracked */
  specialistId: string;
  /** The machine this alignment is for */
  machineName: string;
  /** When present, alignment is tracked per-state */
  state?: string;
  /** Number of times specialist matched human choice */
  matchingChoices: number;
  /** Total number of comparisons */
  totalComparisons: number;
  /** Calculated alignment score (matchingChoices / totalComparisons) */
  alignmentScore: number;
  /** When this record was last updated */
  lastUpdated: Date;
}

/**
 * A snapshot of context when a human forces a decision.
 */
export interface Exemplar {
  /** UUID for this exemplar */
  exemplarId: string;
  /** Machine name */
  machineName: string;
  /** The state when the decision was made */
  state: string;
  /** The session context at decision time */
  context: ProposerContext;
  /** The transition the human chose */
  humanTransitionName: string;
  /** The state the human transitioned to */
  humanToState: string;
  /** All proposals that were available */
  proposals: Proposal[];
  /** When this exemplar was created */
  createdAt: Date;
}

// ============================================================================
// Evaluation Types
// ============================================================================

/**
 * Result of evaluating a specialist's alignment with human decisions.
 */
export interface AlignmentEvaluationResult {
  /** The specialist evaluated */
  specialistId: string;
  /** Machine name */
  machineName: string;
  /** Total exemplars evaluated against */
  totalExemplars: number;
  /** Number of matching decisions */
  matchingDecisions: number;
  /** Alignment score (matchingDecisions / totalExemplars) */
  alignmentScore: number;
}

/**
 * Result of evaluating a specialist's accuracy metrics.
 */
export interface AccuracyEvaluationResult {
  /** The specialist evaluated */
  specialistId: string;
  /** Machine name */
  machineName: string;
  /** Number of decisions evaluated */
  totalDecisions: number;
  /** Rate of matching transitions */
  transitionMatchRate: number;
  /** Rate of matching target states */
  stateMatchRate: number;
  /** Total cost in USD */
  totalCostUSD: number;
  /** Average latency in milliseconds */
  avgLatencyMsec: number;
}

// ============================================================================
// Monitoring Types
// ============================================================================

/**
 * A record of a single arbitration decision, captured for monitoring.
 */
export interface DecisionRecord {
  decisionId: string;
  sessionId: string;
  machineName: string;
  roundId: string;
  fromState: string;
  toState: string;
  transitionName: string;
  isHuman: boolean;
  /** Snapshot of all proposals before they're deleted */
  proposals: Proposal[];
  /** Alignment scores at decision time */
  alignmentSnapshot: Record<string, number>;
  /** Consensus margin from aheadByK, or null if human-forced */
  consensusMargin: number | null;
  /** The arbiter threshold at decision time */
  threshold: number;
  timestamp: Date;
}

/**
 * Computed metrics for progressive collapse monitoring.
 */
export interface CollapseMetrics {
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

/**
 * Per-specialist performance metrics.
 */
export interface SpecialistMetrics {
  specialistId: string;
  alignment: number;
  totalProposals: number;
  winningProposals: number;
  winRate: number;
}

export type SignalLevel = "info" | "warning" | "action";

/**
 * An actionable signal from monitoring analysis.
 */
export interface Signal {
  level: SignalLevel;
  code: string;
  message: string;
}

// ============================================================================
// Tick Orchestration Types
// ============================================================================

/**
 * Status of a single session after one tick.
 */
export type TickStatus =
  | "solicited"    // triggered one proposer to submit
  | "advanced"     // consensus reached, transition executed
  | "needs_human"; // all proposals in, no consensus

/**
 * Result of ticking a single session.
 * Terminal sessions are omitted from tick results.
 */
export interface TickResult {
  sessionId: string;
  machineName: string;
  status: TickStatus;
  currentState: string;
  /** Set when status === 'solicited' */
  specialistId?: string;
  /** Set when status === 'advanced' */
  previousState?: string;
  /** Set when status === 'advanced' */
  transitionName?: string;
  /** Set when status === 'advanced' */
  reasoning?: string;
}

// ============================================================================
// Registration Options
// ============================================================================

/**
 * Options for registerProposer().
 */
export interface RegisterProposerOptions {
  /** Required: unique identifier */
  specialistId: string;
  /** Required: which machine to participate in */
  machineName: string;
  /** If true, can force arbitration decisions */
  isHuman?: boolean;

  // Execution mode (exactly one required):
  /** Local async strategy function */
  strategyFn?: (ctx: ProposerContext) => Promise<ProposerStrategyResult>;
  /** Built-in strategy name */
  strategyFnName?: string;
  /** External webhook URL */
  strategyWebhookUrl?: string;

  // For LLM-based modes:
  /** Model ID for LLM modes */
  modelId?: string;
  /** Local context function */
  contextFn?: (ctx: ProposerContext) => Promise<string>;
  /** Webhook context URL */
  contextWebhookUrl?: string;
  /** Environment variable name for webhook token */
  webhookTokenName?: string;

  // For built-in strategies:
  /** Strategy-specific threshold */
  threshold?: number;
}

/**
 * Options for registerArbiter().
 */
export interface RegisterArbiterOptions {
  /** Required: unique identifier */
  specialistId: string;
  /** Required: which machine to participate in */
  machineName: string;

  // Execution mode (exactly one required):
  /** Local async strategy function */
  strategyFn?: (ctx: ArbiterContext) => Promise<ArbiterStrategyResult>;
  /** Built-in strategy name */
  strategyFnName?: string;
  /** External webhook URL */
  strategyWebhookUrl?: string;

  // For webhooks:
  /** Environment variable name for webhook token */
  webhookTokenName?: string;

  // For built-in strategies:
  /** Strategy-specific threshold */
  threshold?: number;
}

// ============================================================================
// Submit Options Types
// ============================================================================

/**
 * Options for submitProposal().
 */
export interface SubmitProposalOptions {
  /** Required: session to submit to */
  sessionId: string;
  /** Required: who is submitting */
  specialistId: string;
  /** Round ID (optional, uses current) */
  roundId?: string;
  /** Transition to propose (optional, invokes strategy) */
  transitionName?: string;
  /** Explanation */
  reasoning?: string;
  /** Arbitrary metadata */
  metaJson?: Record<string, unknown>;
  /** Cost in USD */
  costUSD?: number;
  /** Time in milliseconds */
  latencyMsec?: number;
  /** Input tokens */
  numInputTokens?: number;
  /** Output tokens */
  numOutputTokens?: number;
}

/**
 * Options for submitArbitration().
 */
export interface SubmitArbitrationOptions {
  /** Required: session to arbitrate */
  sessionId: string;
  /** Round ID (optional, uses current) */
  roundId?: string;
  /** Who is calling */
  specialistId?: string;
  /** Force this transition (human only) */
  transitionName?: string;
  /** Explanation */
  reasoning?: string;
  /** Arbitrary metadata */
  metaJson?: Record<string, unknown>;
  /** Cost in USD */
  costUSD?: number;
  /** Time in milliseconds */
  latencyMsec?: number;
  /** Input tokens */
  numInputTokens?: number;
  /** Output tokens */
  numOutputTokens?: number;
}
