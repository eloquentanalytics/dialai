/**
 * DIAL AI Monitoring — Pure Computation Functions
 *
 * Computes progressive collapse metrics and actionable signals
 * from decision records and alignment data. No store access —
 * all data passed as arguments.
 */

import type {
  DecisionRecord,
  AlignmentRecord,
  CollapseMetrics,
  SpecialistMetrics,
  Signal,
} from "./types.js";

const DEFAULT_RECENT_WINDOW = 10;
const THIN_MARGIN_BUFFER = 0.1;
const LOW_ALIGNMENT_THRESHOLD = 0.5;

/**
 * Computes collapse metrics from decision records and alignment data.
 */
export function computeCollapseMetrics(
  decisions: DecisionRecord[],
  alignmentRecords: AlignmentRecord[],
  recentWindow: number = DEFAULT_RECENT_WINDOW
): CollapseMetrics {
  const totalDecisions = decisions.length;
  const humanDecisions = decisions.filter((d) => d.isHuman).length;
  const aiDecisions = totalDecisions - humanDecisions;
  const collapseRatio = totalDecisions > 0 ? aiDecisions / totalDecisions : 0;

  // Recent window
  const recentDecisions = decisions.slice(-recentWindow);
  const recentAi = recentDecisions.filter((d) => !d.isHuman).length;
  const recentCollapseRatio =
    recentDecisions.length > 0 ? recentAi / recentDecisions.length : 0;

  // Average consensus margin of AI decisions
  const aiMargins = decisions
    .filter((d) => !d.isHuman && d.consensusMargin !== null)
    .map((d) => d.consensusMargin!);
  const averageConsensusMargin =
    aiMargins.length > 0
      ? aiMargins.reduce((sum, m) => sum + m, 0) / aiMargins.length
      : 0;

  // Alignment scores
  const alignmentScores: Record<string, number> = {};
  for (const r of alignmentRecords) {
    alignmentScores[r.specialistId] = r.alignmentScore;
  }

  // Per-specialist metrics
  const specialistMap = new Map<
    string,
    { total: number; winning: number; alignment: number }
  >();

  for (const d of decisions) {
    for (const p of d.proposals) {
      const existing = specialistMap.get(p.specialistId) ?? {
        total: 0,
        winning: 0,
        alignment: 0,
      };
      existing.total++;
      if (p.transitionName === d.transitionName) {
        existing.winning++;
      }
      specialistMap.set(p.specialistId, existing);
    }
  }

  // Merge alignment scores
  for (const [id, stats] of specialistMap) {
    stats.alignment = alignmentScores[id] ?? 0;
  }

  const specialists: SpecialistMetrics[] = [...specialistMap.entries()].map(
    ([specialistId, stats]) => ({
      specialistId,
      alignment: stats.alignment,
      totalProposals: stats.total,
      winningProposals: stats.winning,
      winRate: stats.total > 0 ? stats.winning / stats.total : 0,
    })
  );

  // Derive machine name from first decision or empty
  const machineName = decisions.length > 0 ? decisions[0].machineName : "";

  // Count exemplars and proposers for signals
  const exemplarCount = humanDecisions;
  const proposerIds = new Set<string>();
  for (const d of decisions) {
    for (const p of d.proposals) {
      proposerIds.add(p.specialistId);
    }
  }

  const signals = computeSignals(
    decisions,
    alignmentRecords,
    exemplarCount,
    proposerIds.size
  );

  return {
    machineName,
    totalDecisions,
    humanDecisions,
    aiDecisions,
    collapseRatio,
    recentCollapseRatio,
    averageConsensusMargin,
    alignmentScores,
    specialists,
    signals,
  };
}

/**
 * Computes actionable signals from decision and alignment data.
 */
export function computeSignals(
  decisions: DecisionRecord[],
  alignmentRecords: AlignmentRecord[],
  _exemplarCount: number,
  proposerCount: number
): Signal[] {
  const signals: Signal[] = [];
  const recentWindow = DEFAULT_RECENT_WINDOW;

  // COLD_START: no alignment data at all
  if (alignmentRecords.length === 0 || alignmentRecords.every((r) => r.totalComparisons === 0)) {
    signals.push({
      level: "action",
      code: "COLD_START",
      message: "No alignment data available — human must decide all transitions",
    });
  }

  // SINGLE_SPECIALIST: only 1 proposer
  if (proposerCount === 1) {
    signals.push({
      level: "warning",
      code: "SINGLE_SPECIALIST",
      message: "Only 1 proposer registered — add more for meaningful consensus",
    });
  }

  // LOW_ALIGNMENT: best specialist alignment < 0.5
  if (alignmentRecords.length > 0) {
    const bestAlignment = Math.max(
      ...alignmentRecords.map((r) => r.alignmentScore)
    );
    if (bestAlignment > 0 && bestAlignment < LOW_ALIGNMENT_THRESHOLD) {
      signals.push({
        level: "warning",
        code: "LOW_ALIGNMENT",
        message: `Best specialist alignment is ${bestAlignment.toFixed(3)} — below ${LOW_ALIGNMENT_THRESHOLD}`,
      });
    }
  }

  // THIN_MARGIN: recent AI decisions have tight margins
  if (decisions.length > 0) {
    const recentDecisions = decisions.slice(-recentWindow);
    const recentAiWithMargin = recentDecisions.filter(
      (d) => !d.isHuman && d.consensusMargin !== null
    );
    if (recentAiWithMargin.length > 0) {
      const thinCount = recentAiWithMargin.filter(
        (d) => d.consensusMargin! < d.threshold + THIN_MARGIN_BUFFER
      ).length;
      if (thinCount > recentAiWithMargin.length / 2) {
        signals.push({
          level: "warning",
          code: "THIN_MARGIN",
          message: `${thinCount}/${recentAiWithMargin.length} recent AI decisions have margins within ${THIN_MARGIN_BUFFER} of threshold`,
        });
      }
    }
  }

  // FULL_COLLAPSE: last N decisions all AI
  if (decisions.length >= recentWindow) {
    const recentDecisions = decisions.slice(-recentWindow);
    if (recentDecisions.every((d) => !d.isHuman)) {
      signals.push({
        level: "info",
        code: "FULL_COLLAPSE",
        message: `Last ${recentWindow} decisions were all AI — full progressive collapse achieved`,
      });
    }
  }

  // ALIGNMENT_PLATEAU: alignment hasn't changed in last N decisions
  if (decisions.length >= recentWindow) {
    const recentDecisions = decisions.slice(-recentWindow);
    const snapshots = recentDecisions.map((d) => d.alignmentSnapshot);
    const allKeys = new Set<string>();
    for (const snap of snapshots) {
      for (const key of Object.keys(snap)) allKeys.add(key);
    }

    let plateaued = allKeys.size > 0;
    for (const key of allKeys) {
      const values = snapshots.map((s) => s[key] ?? 0);
      const first = values[0];
      if (!values.every((v) => v === first)) {
        plateaued = false;
        break;
      }
    }

    if (plateaued) {
      signals.push({
        level: "info",
        code: "ALIGNMENT_PLATEAU",
        message: `Alignment scores unchanged over last ${recentWindow} decisions`,
      });
    }
  }

  return signals;
}
