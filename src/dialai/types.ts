export interface MachineDefinition {
  machineName: string;
  initialState: string;
  defaultState: string;
  states: Record<
    string,
    {
      prompt?: string;
      transitions?: Record<string, string>;
    }
  >;
}

export interface TransitionRecord {
  fromState: string;
  toState: string;
  transitionName: string;
  reasoning: string;
  timestamp: Date;
}

export interface Session {
  sessionId: string;
  machineName: string;
  currentState: string;
  machine: MachineDefinition;
  history: TransitionRecord[];
  createdAt: Date;
}

export interface ProposerContext {
  sessionId: string;
  currentState: string;
  prompt: string;
  transitions: Record<string, string>;
  history: TransitionRecord[];
}

export interface VoterContext {
  sessionId: string;
  currentState: string;
  prompt: string;
  proposalA: Proposal;
  proposalB: Proposal;
  history: TransitionRecord[];
}

export interface Proposer {
  role: "proposer";
  specialistId: string;
  machineName: string;
  strategyFn?: (ctx: ProposerContext) => Promise<{ transitionName: string; toState: string; reasoning: string }>;
  strategyWebhookUrl?: string;
  contextFn?: (ctx: ProposerContext) => Promise<string>;
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
}

export interface Voter {
  role: "voter";
  specialistId: string;
  machineName: string;
  strategyFn?: (ctx: VoterContext) => Promise<{ voteFor: VoteChoice; reasoning: string }>;
  strategyWebhookUrl?: string;
  contextFn?: (ctx: VoterContext) => Promise<string>;
  contextWebhookUrl?: string;
  modelId?: string;
  webhookTokenName?: string;
}

export type Specialist = Proposer | Voter;

export interface Proposal {
  proposalId: string;
  sessionId: string;
  specialistId: string;
  transitionName: string;
  toState: string;
  reasoning: string;
}

export interface Vote {
  voteId: string;
  sessionId: string;
  specialistId: string;
  proposalIdA: string;
  proposalIdB: string;
  voteFor: VoteChoice;
  reasoning: string;
}

export type VoteChoice = "A" | "B" | "BOTH" | "NEITHER";

export interface ConsensusResult {
  consensusReached: boolean;
  winningProposalId?: string;
  reasoning: string;
}
