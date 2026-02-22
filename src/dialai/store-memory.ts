/**
 * DIAL AI In-Memory Store
 *
 * Implements the Store interface using 6 in-memory Maps.
 * This is the default store used when no Postgres is configured.
 */

import type { Store } from "./store.js";
import type {
  Session,
  Specialist,
  Arbiter,
  Proposal,
  AlignmentRecord,
  Exemplar,
  DecisionRecord,
} from "./types.js";

export function createMemoryStore(): Store {
  const _sessions = new Map<string, Session>();
  const _specialists = new Map<string, Specialist | Arbiter>();
  const _proposals = new Map<string, Proposal>();
  const _alignmentRecords = new Map<string, AlignmentRecord>();
  const _exemplars = new Map<string, Exemplar>();
  const _decisionLog = new Map<string, DecisionRecord>();

  return {
    // Sessions
    async getSession(id: string) {
      return _sessions.get(id);
    },
    async setSession(session: Session) {
      _sessions.set(session.sessionId, session);
    },
    async getAllSessions() {
      return [..._sessions.values()];
    },

    // Specialists
    async getSpecialist(id: string) {
      return _specialists.get(id);
    },
    async hasSpecialist(id: string) {
      return _specialists.has(id);
    },
    async setSpecialist(specialist: Specialist | Arbiter) {
      _specialists.set(specialist.specialistId, specialist);
    },
    async getSpecialistsByMachineAndRole(machineName: string, role?: string) {
      return [..._specialists.values()].filter((s) => {
        if (s.machineName !== machineName) return false;
        if (role !== undefined) return s.role === role;
        return true;
      });
    },

    // Proposals
    async getProposal(id: string) {
      return _proposals.get(id);
    },
    async setProposal(proposal: Proposal) {
      _proposals.set(proposal.proposalId, proposal);
    },
    async getProposalsByRound(sessionId: string, roundId: string) {
      return [..._proposals.values()].filter(
        (p) => p.sessionId === sessionId && p.roundId === roundId
      );
    },
    async deleteProposalsBySession(sessionId: string) {
      for (const [id, proposal] of _proposals.entries()) {
        if (proposal.sessionId === sessionId) {
          _proposals.delete(id);
        }
      }
    },

    // Alignment Records
    async getAlignmentRecord(key: string) {
      return _alignmentRecords.get(key);
    },
    async setAlignmentRecord(key: string, record: AlignmentRecord) {
      _alignmentRecords.set(key, record);
    },
    async getAlignmentRecordsByMachine(machineName: string, state?: string) {
      return [..._alignmentRecords.values()].filter((r) => {
        if (r.machineName !== machineName) return false;
        if (state !== undefined) return r.state === state;
        return true;
      });
    },

    // Exemplars
    async setExemplar(exemplar: Exemplar) {
      _exemplars.set(exemplar.exemplarId, exemplar);
    },
    async getExemplarsByMachine(machineName: string, state?: string) {
      const all = [..._exemplars.values()].filter(
        (e) => e.machineName === machineName
      );
      if (state !== undefined) {
        return all.filter((e) => e.state === state);
      }
      return all;
    },

    // Decision Log
    async setDecisionRecord(record: DecisionRecord) {
      _decisionLog.set(record.decisionId, record);
    },
    async getDecisionRecordsByMachine(machineName: string, limit?: number) {
      const all = [..._decisionLog.values()].filter(
        (d) => d.machineName === machineName
      );
      if (limit !== undefined) {
        return all.slice(-limit);
      }
      return all;
    },

    // Lifecycle
    async clear() {
      _sessions.clear();
      _specialists.clear();
      _proposals.clear();
      _alignmentRecords.clear();
      _exemplars.clear();
      _decisionLog.clear();
    },
    async close() {
      // No-op for in-memory store
    },
  };
}
