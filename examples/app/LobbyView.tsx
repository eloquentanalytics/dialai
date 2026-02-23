import { useEffect, useState, useCallback, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";

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

type SortField = "lastActivityAt" | "createdAt" | "historyLength";
type SortDir = "asc" | "desc";
type StatusFilter = "all" | "active" | "completed";

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
        padding: "0.5rem 1rem",
        background: active ? "rgba(85, 85, 255, 0.15)" : "rgba(255, 255, 255, 0.03)",
        border: `1px solid ${active ? "rgba(85, 85, 255, 0.4)" : "rgba(255, 255, 255, 0.1)"}`,
        borderRadius: "8px",
        color: active ? "#8af" : "#aaa",
        fontSize: "0.85rem",
        cursor: "pointer",
        fontWeight: active ? 600 : 400,
        transition: "all 0.2s ease",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
      }}
      onMouseEnter={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.03)";
          e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
        }
      }}
    >
      {label}
      <span style={{ 
        opacity: active ? 1 : 0.3,
        transform: active && dir === "desc" ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease"
      }}>
        ↑
      </span>
    </button>
  );
}

function StatCard({ title, value, color }: { title: string; value: number | string; color: string }) {
  return (
    <div style={{
      background: "rgba(20, 20, 32, 0.6)",
      border: `1px solid rgba(255, 255, 255, 0.05)`,
      borderTop: `2px solid ${color}`,
      borderRadius: "12px",
      padding: "1.2rem",
      flex: 1,
      minWidth: "140px",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem"
    }}>
      <div style={{ color: "#888", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.5px" }}>{title}</div>
      <div style={{ color: "#fff", fontSize: "2rem", fontWeight: 700, lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export function LobbyView() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Filtering & Sorting State
  const [sortField, setSortField] = useState<SortField>("lastActivityAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [machineFilter, setMachineFilter] = useState<string>("all");

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

  const uniqueMachines = useMemo(() => {
    return Array.from(new Set(sessions.map(s => s.machineName)));
  }, [sessions]);

  const filteredAndSorted = useMemo(() => {
    return sessions
      .filter((s) => {
        const matchesSearch = s.sessionId.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              s.machineName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === "all" || 
                              (statusFilter === "completed" && s.isTerminal) || 
                              (statusFilter === "active" && !s.isTerminal);
        const matchesMachine = machineFilter === "all" || s.machineName === machineFilter;
        return matchesSearch && matchesStatus && matchesMachine;
      })
      .sort((a, b) => {
        if (sortField === "historyLength") {
           return sortDir === "desc" ? b.historyLength - a.historyLength : a.historyLength - b.historyLength;
        }
        const aVal = new Date(a[sortField]).getTime();
        const bVal = new Date(b[sortField]).getTime();
        return sortDir === "desc" ? bVal - aVal : aVal - bVal;
      });
  }, [sessions, sortField, sortDir, searchQuery, statusFilter, machineFilter]);

  // Stats calculations
  const totalActive = sessions.filter(s => !s.isTerminal).length;
  const totalCompleted = sessions.filter(s => s.isTerminal).length;
  
  // Calculate average moves for completed sessions
  const completedSessions = sessions.filter(s => s.isTerminal);
  const avgMoves = completedSessions.length > 0 
    ? Math.round(completedSessions.reduce((sum, s) => sum + s.historyLength, 0) / completedSessions.length) 
    : 0;

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "2rem", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header Section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "2rem" }}>
        <div>
          <h1 style={{ fontSize: "2.5rem", fontWeight: 800, margin: "0 0 0.5rem 0", background: "linear-gradient(90deg, #fff, #8af)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            DIAL AI Command Center
          </h1>
          <p style={{ color: "#888", fontSize: "1.1rem", margin: 0 }}>
            Monitor and manage AI specialist collaboration across active missions.
          </p>
        </div>
        <div style={{ display: "flex", gap: "1rem" }}>
          <button 
            onClick={() => navigate("/new/hanoi")}
            style={{ padding: "0.6rem 1.2rem", background: "#4a4ae6", border: "none", borderRadius: "8px", color: "white", fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "#5c5cf5"}
            onMouseLeave={e => e.currentTarget.style.background = "#4a4ae6"}
          >
            + New Hanoi
          </button>
          <button 
            onClick={() => navigate("/new/river-crossing")}
            style={{ padding: "0.6rem 1.2rem", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "8px", color: "white", fontWeight: 600, cursor: "pointer", transition: "background 0.2s" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.15)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
          >
            + New River Crossing
          </button>
        </div>
      </div>

      {/* Stats Dashboard */}
      <div style={{ display: "flex", gap: "1rem", marginBottom: "2.5rem", flexWrap: "wrap" }}>
        <StatCard title="Total Missions" value={sessions.length} color="#888" />
        <StatCard title="Active Now" value={totalActive} color="#4a4ae6" />
        <StatCard title="Completed" value={totalCompleted} color="#2a8a2a" />
        <StatCard title="Avg Moves (Completed)" value={avgMoves || "-"} color="#a88a2a" />
      </div>

      {/* Controls Bar */}
      <div style={{ 
        display: "flex", 
        flexWrap: "wrap",
        gap: "1rem", 
        marginBottom: "2rem",
        background: "rgba(20, 20, 32, 0.4)",
        padding: "1rem",
        borderRadius: "12px",
        border: "1px solid rgba(255,255,255,0.05)",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <div style={{ display: "flex", gap: "1rem", flex: "1 1 auto" }}>
          <input 
            type="text" 
            placeholder="Search sessions or machines..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: "0.5rem 1rem",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#fff",
              flex: 1,
              minWidth: "200px"
            }}
          />
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            style={{
              padding: "0.5rem",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#fff",
              cursor: "pointer"
            }}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active Only</option>
            <option value="completed">Completed Only</option>
          </select>
          <select 
            value={machineFilter} 
            onChange={(e) => setMachineFilter(e.target.value)}
            style={{
              padding: "0.5rem",
              background: "rgba(0,0,0,0.2)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "8px",
              color: "#fff",
              cursor: "pointer"
            }}
          >
            <option value="all">All Machines</option>
            {uniqueMachines.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <SortButton label="Last Activity" active={sortField === "lastActivityAt"} dir={sortDir} onClick={() => handleSort("lastActivityAt")} />
          <SortButton label="Created" active={sortField === "createdAt"} dir={sortDir} onClick={() => handleSort("createdAt")} />
          <SortButton label="Moves" active={sortField === "historyLength"} dir={sortDir} onClick={() => handleSort("historyLength")} />
        </div>
      </div>

      {loading && sessions.length === 0 && (
        <div style={{ textAlign: "center", padding: "4rem", color: "#888" }}>
          <div style={{ 
            width: "40px", height: "40px", 
            border: "3px solid rgba(255,255,255,0.1)", 
            borderTopColor: "#4a4ae6", 
            borderRadius: "50%", 
            margin: "0 auto 1rem auto",
            animation: "spin 1s linear infinite" 
          }} />
          <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
          Loading sessions...
        </div>
      )}

      {/* Grid of Sessions */}
      <div style={{ 
        display: "grid", 
        gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", 
        gap: "1.5rem" 
      }}>
        {filteredAndSorted.map((s) => (
          <Link
            key={s.sessionId}
            to={`/machine/${s.machineName}/session/${s.sessionId}/state/${s.currentState}`}
            style={{
              display: "flex",
              flexDirection: "column",
              background: "linear-gradient(145deg, rgba(30, 30, 45, 0.7), rgba(20, 20, 30, 0.9))",
              border: `1px solid ${s.isTerminal ? "rgba(42, 138, 42, 0.4)" : "rgba(85, 85, 255, 0.2)"}`,
              borderRadius: "16px",
              color: "#e0e0e0",
              textDecoration: "none",
              transition: "all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)",
              overflow: "hidden",
              position: "relative",
              boxShadow: "0 4px 20px rgba(0,0,0,0.2)"
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-4px)";
              e.currentTarget.style.boxShadow = `0 8px 30px ${s.isTerminal ? "rgba(42, 138, 42, 0.15)" : "rgba(85, 85, 255, 0.15)"}`;
              e.currentTarget.style.borderColor = s.isTerminal ? "rgba(42, 138, 42, 0.8)" : "rgba(85, 85, 255, 0.6)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.2)";
              e.currentTarget.style.borderColor = s.isTerminal ? "rgba(42, 138, 42, 0.4)" : "rgba(85, 85, 255, 0.2)";
            }}
          >
            {/* Card Header */}
            <div style={{ 
              padding: "1.2rem 1.5rem", 
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              display: "flex", 
              justifyContent: "space-between", 
              alignItems: "flex-start",
              background: s.isTerminal ? "linear-gradient(90deg, rgba(42,138,42,0.1), transparent)" : "linear-gradient(90deg, rgba(85,85,255,0.1), transparent)"
            }}>
              <div>
                <div style={{ fontSize: "0.75rem", color: "#888", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "0.2rem" }}>
                  {s.machineName}
                </div>
                <div style={{ fontSize: "1.1rem", fontWeight: 600, fontFamily: "monospace", color: "#fff" }}>
                  {s.sessionId.substring(0, 8)}...
                </div>
              </div>
              <span
                style={{
                  padding: "0.3rem 0.8rem",
                  background: s.isTerminal ? "rgba(42, 138, 42, 0.15)" : "rgba(85, 85, 255, 0.15)",
                  border: `1px solid ${s.isTerminal ? "rgba(42, 138, 42, 0.4)" : "rgba(85, 85, 255, 0.4)"}`,
                  borderRadius: "20px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: s.isTerminal ? "#6c6" : "#8af",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem"
                }}
              >
                {!s.isTerminal && (
                  <span style={{ 
                    width: "6px", height: "6px", borderRadius: "50%", background: "#8af",
                    boxShadow: "0 0 8px #8af" 
                  }} />
                )}
                {s.isTerminal ? "COMPLETED" : "ACTIVE"}
              </span>
            </div>

            {/* Card Body */}
            <div style={{ padding: "1.5rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
              
              <div>
                <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.2rem" }}>Current State</div>
                <div style={{ 
                  background: "rgba(0,0,0,0.2)", 
                  padding: "0.6rem", 
                  borderRadius: "6px",
                  fontFamily: "monospace",
                  fontSize: "0.9rem",
                  color: "#ddd",
                  border: "1px solid rgba(255,255,255,0.03)"
                }}>
                  {s.currentState.length > 40 ? s.currentState.substring(0, 40) + "..." : s.currentState}
                </div>
              </div>

              <div style={{ display: "flex", gap: "1.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.2rem" }}>Moves</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 600, color: "#fff" }}>{s.historyLength}</div>
                </div>
                {s.metaJson && Object.keys(s.metaJson).length > 0 && (
                  <div>
                    <div style={{ fontSize: "0.8rem", color: "#888", marginBottom: "0.2rem" }}>Config</div>
                    <div style={{ fontSize: "0.9rem", color: "#ccc", display: "flex", gap: "0.5rem" }}>
                      {Object.entries(s.metaJson).slice(0, 2).map(([k, v]) => (
                        <span key={k} style={{ background: "rgba(255,255,255,0.05)", padding: "2px 6px", borderRadius: "4px" }}>
                          {k}: {String(v)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Card Footer */}
            <div style={{ 
              padding: "1rem 1.5rem", 
              background: "rgba(0,0,0,0.15)", 
              borderTop: "1px solid rgba(255,255,255,0.03)",
              display: "flex",
              justifyContent: "space-between",
              fontSize: "0.75rem",
              color: "#666"
            }}>
              <span title={new Date(s.lastActivityAt).toLocaleString()}>
                Updated {timeAgo(s.lastActivityAt)}
              </span>
              <span title={new Date(s.createdAt).toLocaleString()}>
                Created {timeAgo(s.createdAt)}
              </span>
            </div>
            
            {/* Progress Bar (Indeterminate for active, full for completed) */}
            <div style={{ 
              position: "absolute", bottom: 0, left: 0, right: 0, height: "3px",
              background: s.isTerminal 
                ? "#2a8a2a" 
                : "linear-gradient(90deg, #4a4ae6 0%, #8af 50%, #4a4ae6 100%)",
              backgroundSize: "200% 100%",
              animation: s.isTerminal ? "none" : "gradient 2s linear infinite"
            }} />
            <style>{`@keyframes gradient { 0% { background-position: 100% 0; } 100% { background-position: -100% 0; } }`}</style>
          </Link>
        ))}
      </div>

      {!loading && filteredAndSorted.length === 0 && (
        <div style={{ 
          textAlign: "center", 
          padding: "4rem 2rem", 
          background: "rgba(255,255,255,0.02)", 
          borderRadius: "16px",
          border: "1px dashed rgba(255,255,255,0.1)",
          marginTop: "2rem"
        }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.5 }}>📭</div>
          <h3 style={{ margin: "0 0 0.5rem 0", color: "#ccc" }}>No sessions found</h3>
          <p style={{ color: "#888", margin: 0 }}>
            {sessions.length === 0 
              ? "The server may still be starting up, or no missions have been created yet." 
              : "Try adjusting your search or filters to find what you're looking for."}
          </p>
          {sessions.length === 0 && (
            <button 
              onClick={() => navigate("/new/hanoi")}
              style={{ marginTop: "1.5rem", padding: "0.8rem 1.5rem", background: "#4a4ae6", border: "none", borderRadius: "8px", color: "white", fontWeight: 600, cursor: "pointer" }}
            >
              Start First Mission
            </button>
          )}
        </div>
      )}
    </div>
  );
}
