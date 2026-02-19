import type {
  MachineDefinition,
  ProposerContext,
  ProposerStrategyResult,
  ArbiterContext,
  ArbiterStrategyResult,
  Session,
  Proposal,
  TickResult,
  CollapseMetrics,
  DecisionRecord,
} from "dialai";

export interface MachineModule {
  definition: MachineDefinition;
  strategies?: Record<
    string,
    | ((ctx: ProposerContext) => Promise<ProposerStrategyResult>)
    | ((ctx: ArbiterContext) => Promise<ArbiterStrategyResult>)
  >;
}

export interface ScreenProps {
  session: Session;
  machine: MachineDefinition;
  proposals: Proposal[];
  lastTickResults: TickResult[];
  collapseMetrics: CollapseMetrics | null;
  decisions: DecisionRecord[];
  onForceTransition: (transitionName: string, reasoning?: string) => Promise<void>;
  onSubmitProposal: (transitionName: string, reasoning?: string) => Promise<void>;
}
