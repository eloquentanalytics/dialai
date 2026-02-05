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

export type ProposerStrategy = (
  currentState: string,
  transitions: Record<string, string>
) => { transitionName: string; toState: string; reasoning: string };

export type VoterStrategy = (
  proposalA: Proposal,
  proposalB: Proposal
) => { voteFor: VoteChoice; reasoning: string };

export interface Specialist {
  specialistId: string;
  machineName: string;
  role: "proposer" | "voter" | "arbiter";
  weight: number;
  strategy: ProposerStrategy | VoterStrategy;
}

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
