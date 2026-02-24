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
  Arbiter,
  ProposerStrategyResult,
  ArbiterStrategyResult,
  ProposerContext,
  ArbiterContext,
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
  SpecialistMetrics,
  Signal,
  SignalLevel,
  TickStatus,
  TickResult,
  RegisterProposerOptions,
  RegisterArbiterOptions,
  SubmitProposalOptions,
  SubmitArbitrationOptions,
} from "./types.js";

// Re-export store
export type { Store } from "./store.js";
export {
  getStore,
  setStore,
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
  registerArbiter,
  getSpecialist,
  getProposers,
  getArbiter,
  // Enable/disable
  enableSpecialist,
  disableSpecialist,
  getEnabledProposers,
  getEnabledArbiter,
  // State-aware specialist lookup
  getProposersForState,
  getEnabledProposersForState,
  getArbiterForState,
  // Strategy resolution
  resolveProposerStrategy,
  resolveArbiterStrategy,
  // Decision cycle
  submitProposal,
  evaluateConsensus,
  classifyArbitration,
  submitArbitration,
  executeTransition,
  getProposalsForRound,
  // Threshold
  getEffectiveThreshold,
} from "./api.js";

// Re-export engine
export { tick, runSession, selectChampion } from "./engine.js";

// Re-export strategies
export {
  // Proposer strategies
  firstAvailable,
  lastAvailable,
  randomProposer,
  proposerStrategies,
  // Arbiter strategies
  firstProposal,
  alignmentMargin,
  arbiterStrategies,
} from "./strategies.js";

// Re-export alignment
export {
  wilsonLowerBound,
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
  callLlm,
  executeProposerLlm,
  executeContextWebhookProposer,
} from "./llm.js";

// Re-export utilities
export {
  generateUUID,
  loadMachineFromFile,
  validateMachine,
  normalizeMachine,
} from "./utils.js";

// Re-export monitoring
export {
  computeCollapseMetrics,
  computeSignals,
} from "./monitoring.js";

// Re-export config
export {
  DIALAI_BASE_URL,
  DIALAI_PORT,
  DIALAI_API_TOKEN,
  DIALAI_LLM_BASE_URL,
  OPENROUTER_API_TOKEN,
  getConfig,
} from "./config.js";

// ============================================================================
// Convenience Functions
// ============================================================================

import { getStore } from "./store.js";
import { computeCollapseMetrics } from "./monitoring.js";
import type { CollapseMetrics } from "./types.js";

/**
 * Convenience wrapper: computes collapse metrics for a machine
 * by reading from the store.
 */
export async function getCollapseMetrics(machineName: string, state?: string): Promise<CollapseMetrics> {
  const decisions = await getStore().getDecisionRecordsByMachine(machineName);
  const alignment = await getStore().getAlignmentRecordsByMachine(machineName, state);
  return computeCollapseMetrics(decisions, alignment);
}
