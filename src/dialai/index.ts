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
  ProposerContext,
  VoterContext,
  ArbiterContext,
  HumanGoldExample,
  Proposal,
  Vote,
  VoteChoice,
  ConsensusResult,
  ArbitrationResult,
  RegisterProposerOptions,
  RegisterVoterOptions,
  RegisterArbiterOptions,
} from "./types.js";

// Re-export store
export {
  sessions,
  specialists,
  proposals,
  votes,
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
  // Decision cycle
  submitProposal,
  submitVote,
  evaluateConsensus,
  submitArbitration,
  executeTransition,
  getProposalsForRound,
  getVotesForRound,
} from "./api.js";

// Re-export engine
export { runSession } from "./engine.js";

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
  // Arbiter strategies
  firstProposal,
  aheadByK,
  mostSimilar,
  pairwiseConsensus,
  arbiterStrategies,
} from "./strategies.js";

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
  getConfig,
} from "./config.js";
