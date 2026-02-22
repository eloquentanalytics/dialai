/**
 * SpecialistRoster.tsx — Shows AI specialists and human visitors
 */

import type { CollapseMetrics } from "dialai";

interface Visitor {
  visitorId: string;
  handle: string;
  specialistId: string;
}

interface Props {
  collapseMetrics: CollapseMetrics | null;
  visitors: Visitor[];
}

export function SpecialistRoster({ collapseMetrics, visitors }: Props) {
  const aiSpecialists = collapseMetrics?.specialists ?? [];

  if (aiSpecialists.length === 0 && visitors.length === 0) return null;

  return (
    <div style={{
      padding: "0.6rem 0.75rem",
      background: "#141420",
      border: "1px solid #2a2a3a",
      borderRadius: 6,
      fontSize: "0.75rem",
    }}>
      <div style={{ color: "#888", marginBottom: "0.4rem", fontSize: "0.7rem" }}>Specialists</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {aiSpecialists.map((s) => (
          <span
            key={s.specialistId}
            style={{
              padding: "0.15rem 0.4rem",
              background: "#1a1a3a",
              border: "1px solid #3a3a5a",
              borderRadius: 3,
              color: "#8af",
              fontFamily: "monospace",
            }}
            title={`AI | alignment: ${(s.alignment * 100).toFixed(1)}% | wins: ${s.winningProposals}/${s.totalProposals}`}
          >
            {s.specialistId}
          </span>
        ))}
        {visitors.map((v) => (
          <span
            key={v.visitorId}
            style={{
              padding: "0.15rem 0.4rem",
              background: "#2a1a2a",
              border: "1px solid #5a3a5a",
              borderRadius: 3,
              color: "#f8a",
              fontFamily: "monospace",
            }}
            title={`Human visitor: ${v.handle}`}
          >
            {v.handle}
          </span>
        ))}
      </div>
    </div>
  );
}
