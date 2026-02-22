/**
 * VisitorRegistration.tsx — Inline registration / identity display
 */

import { useState } from "react";

interface Props {
  identity: { handle: string; specialistId: string } | null;
  onRegister: (handle: string) => Promise<unknown>;
  onLeave: () => void;
}

export function VisitorRegistration({ identity, onRegister, onLeave }: Props) {
  const [handle, setHandle] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (identity) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.75rem",
        padding: "0.4rem 0.75rem",
        background: "#1a2a1a",
        border: "1px solid #2a5a2a",
        borderRadius: 6,
        fontSize: "0.8rem",
      }}>
        <span style={{ color: "#6c6" }}>Playing as:</span>
        <span style={{ color: "#eee", fontWeight: 600 }}>{identity.handle}</span>
        <button
          onClick={onLeave}
          style={{
            padding: "0.2rem 0.5rem",
            background: "transparent",
            border: "1px solid #4a3a3a",
            borderRadius: 4,
            color: "#a66",
            fontSize: "0.7rem",
            cursor: "pointer",
          }}
        >
          Leave
        </button>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim() || submitting) return;
    setSubmitting(true);
    await onRegister(handle.trim());
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
      }}
    >
      <input
        type="text"
        placeholder="Your name"
        value={handle}
        onChange={(e) => setHandle(e.target.value)}
        maxLength={20}
        style={{
          padding: "0.35rem 0.6rem",
          background: "#1a1a2e",
          border: "1px solid #3a3a5a",
          borderRadius: 4,
          color: "#eee",
          fontSize: "0.8rem",
          width: 120,
        }}
      />
      <button
        type="submit"
        disabled={!handle.trim() || submitting}
        style={{
          padding: "0.35rem 0.75rem",
          background: "#2a2a5a",
          border: "1px solid #4444aa",
          borderRadius: 4,
          color: "#eee",
          fontSize: "0.8rem",
          cursor: handle.trim() ? "pointer" : "default",
          opacity: handle.trim() ? 1 : 0.5,
        }}
      >
        Join as Specialist
      </button>
    </form>
  );
}
