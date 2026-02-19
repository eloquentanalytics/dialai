import type { TransitionRecord } from "dialai";

interface Props {
  history: TransitionRecord[];
}

export function HistoryTimeline({ history }: Props) {
  return (
    <div>
      <h3 style={{ fontSize: "0.9rem", marginBottom: "0.75rem", color: "#aaa" }}>
        History ({history.length})
      </h3>
      {history.length === 0 ? (
        <div style={{ color: "#555", fontSize: "0.85rem" }}>No transitions yet.</div>
      ) : (
        <div
          style={{
            maxHeight: 300,
            overflowY: "auto",
            display: "grid",
            gap: "0.25rem",
            fontSize: "0.8rem",
            fontFamily: "monospace",
          }}
        >
          {history.map((t, i) => (
            <div
              key={i}
              style={{
                padding: "0.4rem 0.6rem",
                background: "#111118",
                borderRadius: 3,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <span>
                <span style={{ color: "#666", marginRight: "0.5rem" }}>
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span style={{ color: "#aaf" }}>{t.transitionName}</span>
              </span>
              <span style={{ color: "#555", fontSize: "0.7rem", maxWidth: "50%", textAlign: "right" }}>
                {t.reasoning.length > 60 ? t.reasoning.slice(0, 57) + "..." : t.reasoning}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
