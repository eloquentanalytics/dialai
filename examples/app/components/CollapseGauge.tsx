import type { CollapseMetrics } from "dialai";

interface Props {
  metrics: CollapseMetrics | null;
}

export function CollapseGauge({ metrics }: Props) {
  if (!metrics) {
    return (
      <div>
        <h3 style={{ fontSize: "0.9rem", marginBottom: "0.75rem", color: "#aaa" }}>Collapse Metrics</h3>
        <div style={{ color: "#555", fontSize: "0.85rem" }}>No metrics yet.</div>
      </div>
    );
  }

  const collapsePercent = (metrics.collapseRatio * 100).toFixed(1);
  const recentPercent = (metrics.recentCollapseRatio * 100).toFixed(1);

  return (
    <div>
      <h3 style={{ fontSize: "0.9rem", marginBottom: "0.75rem", color: "#aaa" }}>Collapse Metrics</h3>

      {/* Collapse bar */}
      <div style={{ marginBottom: "1rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", marginBottom: 4 }}>
          <span>Collapse Ratio</span>
          <span>{collapsePercent}% overall / {recentPercent}% recent</span>
        </div>
        <div style={{ height: 8, background: "#1a1a2e", borderRadius: 4, overflow: "hidden" }}>
          <div
            style={{
              height: "100%",
              width: `${metrics.collapseRatio * 100}%`,
              background: metrics.collapseRatio > 0.8 ? "#4f4" : metrics.collapseRatio > 0.4 ? "#ff4" : "#f44",
              borderRadius: 4,
              transition: "width 0.3s",
            }}
          />
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem", fontSize: "0.8rem" }}>
        <div style={{ padding: "0.5rem", background: "#111118", borderRadius: 4, textAlign: "center" }}>
          <div style={{ color: "#888", fontSize: "0.7rem" }}>Total</div>
          <div style={{ fontWeight: 600 }}>{metrics.totalDecisions}</div>
        </div>
        <div style={{ padding: "0.5rem", background: "#111118", borderRadius: 4, textAlign: "center" }}>
          <div style={{ color: "#888", fontSize: "0.7rem" }}>Human</div>
          <div style={{ fontWeight: 600, color: "#f8a" }}>{metrics.humanDecisions}</div>
        </div>
        <div style={{ padding: "0.5rem", background: "#111118", borderRadius: 4, textAlign: "center" }}>
          <div style={{ color: "#888", fontSize: "0.7rem" }}>AI</div>
          <div style={{ fontWeight: 600, color: "#8af" }}>{metrics.aiDecisions}</div>
        </div>
      </div>

      {/* Specialist alignment */}
      {metrics.specialists.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.5rem" }}>Specialist Alignment</div>
          {metrics.specialists.map((s) => (
            <div
              key={s.specialistId}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.3rem 0",
                fontSize: "0.8rem",
                borderBottom: "1px solid #1a1a2a",
              }}
            >
              <span>{s.specialistId}</span>
              <span style={{ fontFamily: "monospace" }}>
                {s.alignment.toFixed(3)} &middot; {s.winningProposals}/{s.totalProposals} wins
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Signals */}
      {metrics.signals.length > 0 && (
        <div style={{ marginTop: "1rem" }}>
          <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.5rem" }}>Signals</div>
          {metrics.signals.map((s, i) => (
            <div
              key={i}
              style={{
                padding: "0.3rem 0.5rem",
                fontSize: "0.75rem",
                color: s.level === "action" ? "#f44" : s.level === "warning" ? "#fa4" : "#4af",
                background: "#111118",
                borderRadius: 3,
                marginBottom: 2,
              }}
            >
              [{s.code}] {s.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
