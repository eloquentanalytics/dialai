import type { Session, Specialist, Proposal, Vote } from "./types.js";

export const sessions = new Map<string, Session>();
export const specialists = new Map<string, Specialist>();
export const proposals = new Map<string, Proposal>();
export const votes = new Map<string, Vote>();

export function clear(): void {
  sessions.clear();
  specialists.clear();
  proposals.clear();
  votes.clear();
}
