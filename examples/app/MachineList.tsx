import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

interface MachineInfo {
  name: string;
  initialState: string;
  goalState: string;
  stateCount: number;
}

export function MachineList() {
  const [machines, setMachines] = useState<MachineInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/machines")
      .then((r) => r.json())
      .then((data) => {
        setMachines(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "2rem" }}>
      <h1 style={{ fontSize: "1.5rem", marginBottom: "0.5rem" }}>DIAL AI Examples</h1>
      <p style={{ color: "#888", marginBottom: "2rem" }}>
        Select a machine to create a new session and watch progressive collapse in action.
      </p>

      {loading && <p>Loading machines...</p>}

      <div style={{ display: "grid", gap: "1rem" }}>
        {machines.map((m) => (
          <Link
            key={m.name}
            to={`/machine/${m.name}/session/new`}
            style={{
              display: "block",
              padding: "1.5rem",
              background: "#141420",
              border: "1px solid #2a2a3a",
              borderRadius: 8,
              color: "#e0e0e0",
              textDecoration: "none",
              transition: "border-color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#5555ff")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#2a2a3a")}
          >
            <div style={{ fontSize: "1.2rem", fontWeight: 600, marginBottom: "0.5rem" }}>
              {m.name}
            </div>
            <div style={{ color: "#888", fontSize: "0.85rem" }}>
              {m.stateCount} states &middot; {m.initialState} &rarr; {m.goalState}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
