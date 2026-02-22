/**
 * visitors.ts — Visitor specialist store
 */

import { registerProposer, disableSpecialist, generateUUID } from "dialai";

export interface Visitor {
  visitorId: string;
  handle: string;
  specialistId: string;
  machineName: string;
  registeredAt: number;
  lastSeenAt: number;
}

// visitorId → Visitor
const visitors = new Map<string, Visitor>();

export async function registerVisitor(
  handle: string,
  machineName: string,
  existingVisitorId?: string
): Promise<Visitor> {
  // Idempotent: reuse existing visitor if visitorId provided
  if (existingVisitorId && visitors.has(existingVisitorId)) {
    const existing = visitors.get(existingVisitorId)!;
    existing.lastSeenAt = Date.now();
    return existing;
  }

  const visitorId = existingVisitorId ?? generateUUID();
  const shortId = visitorId.slice(0, 6);
  const specialistId = `visitor-${handle}-${shortId}`;

  // Register as a real dialai Proposer (isHuman, then disabled).
  // strategyFnName is required by registerProposer but never invoked
  // because the specialist is immediately disabled.
  await registerProposer({
    specialistId,
    machineName,
    isHuman: true,
    strategyFnName: "firstAvailable",
  });
  disableSpecialist(specialistId);

  const visitor: Visitor = {
    visitorId,
    handle,
    specialistId,
    machineName,
    registeredAt: Date.now(),
    lastSeenAt: Date.now(),
  };

  visitors.set(visitorId, visitor);
  return visitor;
}

export function getVisitorsForMachine(machineName: string): Visitor[] {
  return [...visitors.values()].filter((v) => v.machineName === machineName);
}

export function getVisitor(visitorId: string): Visitor | undefined {
  return visitors.get(visitorId);
}
