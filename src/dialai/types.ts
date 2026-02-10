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
}

/**
 * Definition of a single state in the machine.
 */
export interface StateDefinition {
  /** Decision prompt for this state */
  prompt?: string;
  /** Map of transition names to target states */
  transitions?: Record<string, string>;
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
  /** Local strategy function */
  strategyFn?: (ctx: VoterContext) => Promise<VoterStrategyResult>;
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
  /** All proposals in this round */
  proposals: Proposal[];
  /** All votes in this round */
  votes: Vote[];
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

  // Execution mode (exactly one required):
  /** Local async strategy function */
  strategyFn?: (ctx: VoterContext) => Promise<VoterStrategyResult>;
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
