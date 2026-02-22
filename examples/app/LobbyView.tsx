import { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";

interface SessionInfo {
  sessionId: string;
  machineName: string;
  currentState: string;
  historyLength: number;
  isTerminal: boolean;
  goalState: string;
  createdAt: string;
  lastActivityAt: string;
  metaJson: Record<string, unknown> | null;
}

type SortField = "lastActivityAt" | "createdAt";
type SortDir = "asc" | "desc";

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function SortButton({
  label,
  active,
  dir,
  onClick,
}: {
  label: string;
  active: boolean;
  dir: SortDir;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.35rem 0.75rem",
        background: active ? "#1a1a3a" : "transparent",
        border: `1px solid ${active ? "#3a3a6a" : "#2a2a3a"}`,
        borderRadius: 4,
        color: active ? "#8af" : "#888",
        fontSize: "0.8rem",
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
      }}
    >
      {label} {active ? (dir === "desc" ? "↓" : "↑") : ""}
    </button>
  );
}

export function LobbyView() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortField, setSortField] = useState<SortField>("lastActivityAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const fetchSessions = useCallback(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data) => {
        setSessions(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 15000);
    return () => clearInterval(interval);
  }, [fetchSessions]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const sorted = [...sessions].sort((a, b) => {
    const aVal = new Date(a[sortField]).getTime();
    const bVal = new Date(b[sortField]).getTime();
    return sortDir === "desc" ? bVal - aVal : aVal - bVal;
  });

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>DIAL AI Live</h1>
      <p style={{ color: "#888", marginBottom: "1.5rem" }}>
        Watch AI specialists collaborate in real-time. Join as a specialist to submit proposals.
      </p>

      <div style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}>
        <SortButton
          label="Last Activity"
          active={sortField === "lastActivityAt"}
          dir={sortDir}
          onClick={() => handleSort("lastActivityAt")}
        />
        <SortButton
          label="Created"
          active={sortField === "createdAt"}
          dir={sortDir}
          onClick={() => handleSort("createdAt")}
        />
      </div>

      {loading && <p>Loading sessions...</p>}

      <div style={{ display: "grid", gap: "1rem" }}>
        {sorted.map((s) => (
          <Link
            key={s.sessionId}
            to={`/machine/${s.machineName}/session/${s.sessionId}/state/${s.currentState}`}
            style={{
              display: "block",
              padding: "1.5rem",
              background: "#141420",
              border: `1px solid ${s.isTerminal ? "#2a5a2a" : "#2a2a3a"}`,
              borderRadius: 8,
              color: "#e0e0e0",
              textDecoration: "none",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#5555ff")}
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = s.isTerminal ? "#2a5a2a" : "#2a2a3a")
            }
          >
            <div
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
            >
              <div style={{ fontSize: "1.2rem", fontWeight: 600 }}>{s.machineName}</div>
              <span
                style={{
                  padding: "0.2rem 0.5rem",
                  background: s.isTerminal ? "#1a3a1a" : "#1a1a3a",
                  border: `1px solid ${s.isTerminal ? "#2a5a2a" : "#3a3a6a"}`,
                  borderRadius: 4,
                  fontSize: "0.75rem",
                  color: s.isTerminal ? "#6c6" : "#8af",
                }}
              >
                {s.currentState}
              </span>
            </div>
            <div style={{ color: "#888", fontSize: "0.85rem", marginTop: "0.5rem" }}>
              {s.historyLength} moves &middot; goal: {s.goalState}
              {s.isTerminal && (
                <span style={{ color: "#6c6", marginLeft: "0.5rem" }}>completed</span>
              )}
              {s.metaJson &&
                Object.entries(s.metaJson).map(([k, v]) => (
                  <span key={k} style={{ marginLeft: "0.5rem" }}>
                    &middot; {k}: {String(v)}
                  </span>
                ))}
            </div>
            <div style={{ color: "#666", fontSize: "0.75rem", marginTop: "0.4rem" }}>
              Last activity: {timeAgo(s.lastActivityAt)} &middot; Created: {timeAgo(s.createdAt)}
            </div>
          </Link>
        ))}
      </div>

      {!loading && sessions.length === 0 && (
        <p style={{ color: "#666" }}>No sessions running. Server may still be starting up.</p>
      )}
    </div>
  );
}
