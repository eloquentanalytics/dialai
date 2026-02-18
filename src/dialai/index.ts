/**
 * DIAL AI - Dynamic Integration between AI and Labor
 *
 * A coordination framework for AI and human specialists making
 * decisions together within state machines.
 */

// Re-export all types
export type {
  MachineDefinition,
  StateDefinition,
  Session,
  TransitionRecord,
  Specialist,
  SpecialistDefinition,
  Proposer,
  Voter,
  Arbiter,
  ProposerStrategyResult,
  VoterStrategyResult,
  ArbiterStrategyResult,
  SelectionVoterContext,
  SelectionVoterStrategyResult,
  SelectionVote,
  ProposerContext,
  VoterContext,
  ArbiterContext,
  HumanGoldExample,
  Proposal,
  Vote,
  VoteChoice,
  ConsensusResult,
  ArbitrationResult,
  ArbitrationPath,
  AlignmentRecord,
  Exemplar,
  AlignmentEvaluationResult,
  AccuracyEvaluationResult,
  RegisterProposerOptions,
  RegisterVoterOptions,
  RegisterArbiterOptions,
  SubmitProposalOptions,
  SubmitVoteOptions,
  SubmitSelectionVoteOptions,
  SubmitArbitrationOptions,
} from "./types.js";

// Re-export store
export {
  sessions,
  specialists,
  proposals,
  votes,
  alignmentRecords,
  exemplars,
  selectionVotes,
  clear,
} from "./store.js";

// Re-export API functions
export {
  // Session management
  createSession,
  getSession,
  getSessions,
  // Specialist registration
  registerProposer,
  registerVoter,
  registerArbiter,
  getSpecialist,
  getProposers,
  getVoters,
  getArbiter,
  // Enable/disable
  enableSpecialist,
  disableSpecialist,
  getEnabledProposers,
  getEnabledVoters,
  getEnabledArbiter,
  // Strategy resolution
  resolveProposerStrategy,
  resolveVoterStrategy,
  resolveArbiterStrategy,
  // Decision cycle
  submitProposal,
  submitVote,
  submitSelectionVote,
  checkHumanPrimacy,
  evaluateConsensus,
  classifyArbitration,
  submitArbitration,
  executeTransition,
  getProposalsForRound,
  getVotesForRound,
  getSelectionVotesForRound,
} from "./api.js";

// Re-export engine
export { runSession, getEffectiveThreshold, selectChampion } from "./engine.js";

// Re-export strategies
export {
  // Proposer strategies
  firstAvailable,
  lastAvailable,
  randomProposer,
  weightedRandom,
  proposerStrategies,
  // Voter strategies
  preferA,
  preferB,
  both,
  neither,
  randomVoter,
  randomAll,
  preferGoal,
  preferShorterPath,
  voterStrategies,
  // Selection voter strategies
  preferFirst,
  preferHighestAlignment,
  selectionVoterStrategies,
  // Arbiter strategies
  firstProposal,
  aheadByK,
  mostSimilar,
  pairwiseConsensus,
  alignmentWeightedMargin,
  arbiterStrategies,
} from "./strategies.js";

// Re-export alignment
export {
  isHumanSpecialist,
  getAlignmentScore,
  updateAlignment,
  computeAlignmentUpdates,
  updateAlignmentAfterHumanDecision,
  getAllAlignmentRecords,
} from "./alignment.js";

// Re-export exemplars
export { createExemplar, getExemplars } from "./exemplars.js";

// Re-export evaluation
export {
  computeAlignmentFromExemplars,
  computeAccuracyFromExemplars,
  evaluateAlignment,
  evaluateAccuracy,
} from "./evaluation.js";

// Re-export LLM/webhook execution
export {
  executeWebhook,
  executeProposerWebhook,
  executeVoterWebhook,
  callLlm,
  executeProposerLlm,
  executeVoterLlm,
  executeContextWebhookProposer,
  executeContextWebhookVoter,
} from "./llm.js";

// Re-export utilities
export {
  generateUUID,
  loadMachineFromFile,
  validateMachine,
  normalizeMachine,
} from "./utils.js";

// Re-export config
export {
  DIALAI_BASE_URL,
  DIALAI_PORT,
  DIALAI_API_TOKEN,
  DIALAI_LLM_BASE_URL,
  OPENROUTER_API_TOKEN,
  getConfig,
} from "./config.js";
