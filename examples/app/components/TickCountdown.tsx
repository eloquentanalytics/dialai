/**
 * TickCountdown.tsx — Shows countdown to next tick
 */

import { useState, useEffect } from "react";

interface TickMeta {
  lastTickAt: number;
  intervalMs: number;
  nextTickAt: number;
}

interface Props {
  tickMeta: TickMeta | null;
}

export function TickCountdown({ tickMeta }: Props) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!tickMeta) return null;

  const remaining = Math.max(0, Math.ceil((tickMeta.nextTickAt - now) / 1000));
  const total = tickMeta.intervalMs / 1000;
  const pct = total > 0 ? Math.min(100, ((total - remaining) / total) * 100) : 100;

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "0.6rem",
      padding: "0.4rem 0.75rem",
      background: "#141420",
      border: "1px solid #2a2a3a",
      borderRadius: 6,
      fontSize: "0.8rem",
    }}>
      <span style={{ color: "#888" }}>Next tick</span>
      <div style={{
        width: 60,
        height: 4,
        background: "#2a2a3a",
        borderRadius: 2,
        overflow: "hidden",
      }}>
        <div style={{
          width: `${pct}%`,
          height: "100%",
          background: remaining <= 5 ? "#f80" : "#5555ff",
          borderRadius: 2,
          transition: "width 1s linear",
        }} />
      </div>
      <span style={{
        fontFamily: "monospace",
        fontWeight: 600,
        color: remaining <= 5 ? "#f80" : "#ccc",
        minWidth: 24,
        textAlign: "right",
      }}>
        {remaining}s
      </span>
    </div>
  );
}
