import type { Proposal } from "dialai";

interface Props {
  proposals: Proposal[];
}

export function ProposalList({ proposals }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: "0.9rem", marginBottom: "0.75rem", color: "#aaa" }}>
        Current Proposals ({proposals.length})
      </h3>
      {proposals.length === 0 ? (
        <div style={{ color: "#555", fontSize: "0.85rem" }}>Waiting for proposals...</div>
      ) : (
        <div style={{ display: "grid", gap: "0.5rem" }}>
          {proposals.map((p) => (
            <div
              key={p.proposalId}
              style={{
                padding: "0.6rem 0.8rem",
                background: "#141420",
                border: "1px solid #2a2a3a",
                borderRadius: 4,
                fontSize: "0.8rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={{ color: p.isHuman ? "#f8a" : "#8af", fontWeight: 600 }}>
                  {p.specialistId}
                </span>
                <span style={{ fontFamily: "monospace", color: "#888" }}>
                  {p.transitionName}
                </span>
              </div>
              <div style={{ color: "#777", fontSize: "0.75rem" }}>{p.reasoning}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
