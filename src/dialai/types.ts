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
export type Specialist = Proposer | Voter | Arbiter;

/**
 * Specialist definition for machine JSON files.
 */
export interface SpecialistDefinition {
  role: "proposer" | "voter" | "arbiter";
  specialistId: string;
  machineName?: string;
  isHuman?: boolean;
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
 * A specialist that votes on proposals.
 */
export interface Voter {
  role: "voter";
  specialistId: string;
  machineName: string;
  /** If true, can force arbitration decisions */
  isHuman?: boolean;
  /** Whether this specialist is enabled (default true) */
  enabled?: boolean;
  /** Type of voter: "pairwise" compares two proposals, "selection" picks one from all */
  voterType?: "pairwise" | "selection";
  /** Local strategy function (for pairwise voters) */
  strategyFn?: (ctx: VoterContext) => Promise<VoterStrategyResult>;
  /** Local strategy function (for selection voters) */
  selectionStrategyFn?: (ctx: SelectionVoterContext) => Promise<SelectionVoterStrategyResult>;
  /** Built-in strategy name */
  strategyFnName?: string;
  /** External webhook URL */
  strategyWebhookUrl?: string;
  /** Local context function for LLM mode */
  contextFn?: (ctx: VoterContext) => Promise<string>;
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
 * Result from a voter strategy function.
 */
export interface VoterStrategyResult {
  voteFor: VoteChoice;
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
 * Context provided to voter strategy functions.
 */
export interface VoterContext {
  /** Current session ID */
  sessionId: string;
  /** Current state name */
  currentState: string;
  /** Decision prompt for this state */
  prompt: string;
  /** First proposal to compare */
  proposalA: Proposal;
  /** Second proposal to compare */
  proposalB: Proposal;
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
  /** All votes in this round */
  votes: Vote[];
  /** Selection votes in this round */
  selectionVotes?: SelectionVote[];
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
 * The possible vote values.
 */
export type VoteChoice = "A" | "B" | "BOTH" | "NEITHER";

/**
 * A vote comparing two proposals.
 */
export interface Vote {
  /** UUID generated on creation */
  voteId: string;
  /** Session this vote belongs to */
  sessionId: string;
  /** Round this vote belongs to */
  roundId: string;
  /** Who cast this vote */
  specialistId: string;
  /** Whether cast by a human specialist */
  isHuman: boolean;
  /** First proposal being compared */
  proposalIdA: string;
  /** Second proposal being compared */
  proposalIdB: string;
  /** The vote choice */
  voteFor: VoteChoice;
  /** Why this vote was cast */
  reasoning: string;
  /** Arbitrary client metadata */
  metaJson?: Record<string, unknown>;
  /** Cost in USD to generate this vote */
  costUSD?: number;
  /** Time in milliseconds to generate */
  latencyMsec?: number;
  /** Input tokens used */
  numInputTokens?: number;
  /** Output tokens used */
  numOutputTokens?: number;
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
// Selection Voter Types
// ============================================================================

/**
 * Context provided to selection voter strategy functions.
 */
export interface SelectionVoterContext {
  /** Current session ID */
  sessionId: string;
  /** Current state name */
  currentState: string;
  /** Decision prompt for this state */
  prompt: string;
  /** Machine name */
  machineName: string;
  /** All proposals in this round */
  proposals: Proposal[];
  /** All previous transitions */
  history: TransitionRecord[];
}

/**
 * Result from a selection voter strategy function.
 */
export interface SelectionVoterStrategyResult {
  /** The proposalId selected */
  selectedProposalId: string;
  /** Reasoning for this selection */
  reasoning: string;
}

/**
 * A selection vote where a voter picks one proposal from all proposals.
 */
export interface SelectionVote {
  /** UUID generated on creation */
  selectionVoteId: string;
  /** Session this vote belongs to */
  sessionId: string;
  /** Round this vote belongs to */
  roundId: string;
  /** Who cast this vote */
  specialistId: string;
  /** Whether cast by a human specialist */
  isHuman: boolean;
  /** The selected proposal ID */
  selectedProposalId: string;
  /** Why this selection was made */
  reasoning: string;
  /** Arbitrary client metadata */
  metaJson?: Record<string, unknown>;
  /** Cost in USD */
  costUSD?: number;
  /** Time in milliseconds */
  latencyMsec?: number;
  /** Input tokens used */
  numInputTokens?: number;
  /** Output tokens used */
  numOutputTokens?: number;
}

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
  /** All pairwise votes that were cast */
  votes: Vote[];
  /** All selection votes that were cast */
  selectionVotes: SelectionVote[];
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
 * Options for registerVoter().
 */
export interface RegisterVoterOptions {
  /** Required: unique identifier */
  specialistId: string;
  /** Required: which machine to participate in */
  machineName: string;
  /** If true, can force arbitration decisions */
  isHuman?: boolean;
  /** Type of voter: "pairwise" (default) or "selection" */
  voterType?: "pairwise" | "selection";

  // Execution mode (exactly one required):
  /** Local async strategy function (for pairwise voters) */
  strategyFn?: (ctx: VoterContext) => Promise<VoterStrategyResult>;
  /** Local async strategy function (for selection voters) */
  selectionStrategyFn?: (ctx: SelectionVoterContext) => Promise<SelectionVoterStrategyResult>;
  /** Built-in strategy name */
  strategyFnName?: string;
  /** External webhook URL */
  strategyWebhookUrl?: string;

  // For LLM-based modes:
  /** Model ID for LLM modes */
  modelId?: string;
  /** Local context function */
  contextFn?: (ctx: VoterContext) => Promise<string>;
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
