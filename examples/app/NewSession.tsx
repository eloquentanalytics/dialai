import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";

export function NewSession() {
  const { name } = useParams<{ name: string }>();
  const navigate = useNavigate();
  const [numDisks, setNumDisks] = useState(3);
  const isHanoi = name === "hanoi";

  const createSession = useCallback(
    (metaJson?: Record<string, unknown>) => {
      if (!name) return;
      fetch(`/api/machines/${name}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(metaJson ? { metaJson } : {}),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.url) navigate(data.url, { replace: true });
        })
        .catch((e) => console.error("Failed to create session:", e));
    },
    [name, navigate]
  );

  // Non-hanoi machines: auto-create immediately
  useEffect(() => {
    if (!isHanoi) createSession();
  }, [isHanoi, createSession]);

  if (!isHanoi) {
    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
        <p>Creating session for {name}...</p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.4rem", marginBottom: "1.5rem" }}>New Hanoi Session</h1>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <span style={{ color: "#ccc", fontSize: "0.9rem" }}>Disks</span>
        <input
          type="range"
          min={1}
          max={10}
          value={numDisks}
          onChange={(e) => setNumDisks(parseInt(e.target.value, 10))}
          style={{ flex: 1, accentColor: "#5555ff", cursor: "pointer" }}
        />
        <span
          style={{
            fontFamily: "monospace",
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "#eee",
            minWidth: 28,
            textAlign: "center",
          }}
        >
          {numDisks}
        </span>
      </label>

      <div style={{ color: "#888", fontSize: "0.8rem", marginBottom: "1.5rem" }}>
        Optimal solution: {2 ** numDisks - 1} moves
      </div>

      <button
        onClick={() => createSession({ numDisks })}
        style={{
          width: "100%",
          padding: "0.75rem",
          background: "#2a2a5a",
          border: "1px solid #4444aa",
          borderRadius: 6,
          color: "#eee",
          fontSize: "0.95rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#6666ff")}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#4444aa")}
      >
        Start
      </button>
    </div>
  );
}
