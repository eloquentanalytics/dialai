/**
 * useVisitor.ts — Visitor identity stored in localStorage, keyed by machineName
 */

import { useState, useCallback } from "react";

interface Visitor {
  visitorId: string;
  handle: string;
  specialistId: string;
  machineName: string;
  registeredAt: number;
  lastSeenAt: number;
}

function storageKey(machineName: string): string {
  return `dialai-visitor-${machineName}`;
}

function loadFromStorage(machineName: string): Visitor | null {
  try {
    const raw = localStorage.getItem(storageKey(machineName));
    if (raw) return JSON.parse(raw) as Visitor;
  } catch {
    // ignore
  }
  return null;
}

export function useVisitor(machineName: string | undefined) {
  const [identity, setIdentity] = useState<Visitor | null>(
    machineName ? loadFromStorage(machineName) : null
  );

  const register = useCallback(async (handle: string) => {
    if (!machineName) return null;

    const existing = loadFromStorage(machineName);

    const res = await fetch("/api/visitors/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        handle,
        machineName,
        visitorId: existing?.visitorId,
      }),
    });

    if (!res.ok) return null;

    const visitor = await res.json() as Visitor;
    localStorage.setItem(storageKey(machineName), JSON.stringify(visitor));
    setIdentity(visitor);
    return visitor;
  }, [machineName]);

  const clear = useCallback(() => {
    if (machineName) {
      localStorage.removeItem(storageKey(machineName));
    }
    setIdentity(null);
  }, [machineName]);

  return { identity, register, clear };
}
