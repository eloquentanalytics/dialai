import { SessionHeader } from "../app/components/SessionHeader.js";
import { TransitionPanel } from "../app/components/TransitionPanel.js";
import { ProposalList } from "../app/components/ProposalList.js";
import { HistoryTimeline } from "../app/components/HistoryTimeline.js";
import { CollapseGauge } from "../app/components/CollapseGauge.js";
import { TickCountdown } from "../app/components/TickCountdown.js";
import { SpecialistRoster } from "../app/components/SpecialistRoster.js";
import { VisitorRegistration } from "../app/components/VisitorRegistration.js";
import type { ScreenProps } from "../machines/types.js";

export function DefaultScreen(props: ScreenProps) {
  const { session, machine, proposals, collapseMetrics, onSubmitProposal, isVisitor, visitors, tickMeta, visitorIdentity, onRegister, onLeave } = props;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
        <SessionHeader session={session} />
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
          <TickCountdown tickMeta={tickMeta ?? null} />
          <VisitorRegistration
            identity={visitorIdentity ?? null}
            onRegister={onRegister ?? (async () => {})}
            onLeave={onLeave ?? (() => {})}
          />
        </div>
      </div>

      <SpecialistRoster collapseMetrics={collapseMetrics} visitors={visitors ?? []} />

      {/* Prompt */}
      {machine.states[session.currentState]?.prompt && (
        <div style={{
          padding: "0.8rem 1rem",
          background: "#141420",
          border: "1px solid #2a2a3a",
          borderRadius: 6,
          marginBottom: "1.5rem",
          fontSize: "0.9rem",
          color: "#aaa",
        }}>
          {machine.states[session.currentState].prompt}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
        <div style={{ display: "grid", gap: "1.5rem", alignContent: "start" }}>
          <TransitionPanel
            session={session}
            machine={machine}
            onForceTransition={isVisitor ? onSubmitProposal : async () => {}}
            isVisitor={isVisitor}
          />
          <ProposalList proposals={proposals} />
          <HistoryTimeline history={session.history} />
        </div>
        <div>
          <CollapseGauge metrics={collapseMetrics} />
        </div>
      </div>
    </div>
  );
}
