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

export interface Visitor {
  visitorId: string;
  handle: string;
  specialistId: string;
  machineName: string;
  registeredAt: number;
  lastSeenAt: number;
}

export interface TickMeta {
  lastTickAt: number;
  intervalMs: number;
  nextTickAt: number;
}

export interface VisitorIdentity {
  visitorId: string;
  handle: string;
  specialistId: string;
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
  isVisitor?: boolean;
  visitors?: Visitor[];
  tickMeta?: TickMeta | null;
  visitorIdentity?: VisitorIdentity | null;
  onRegister?: (handle: string) => Promise<unknown>;
  onLeave?: () => void;
}
