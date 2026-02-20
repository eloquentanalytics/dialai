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
  computeView?: (session: Session) => Record<string, unknown>;
}

export interface ScreenProps {
  session: Session;
  machine: MachineDefinition;
  proposals: Proposal[];
  lastTickResults: TickResult[];
  collapseMetrics: CollapseMetrics | null;
  decisions: DecisionRecord[];
  view: Record<string, unknown> | null;
  onForceTransition: (transitionName: string, reasoning?: string) => Promise<void>;
  onSubmitProposal: (transitionName: string, reasoning?: string) => Promise<void>;
}
