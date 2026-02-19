/**
 * hanoi-puzzle.ts — Pure puzzle logic for Tower of Hanoi
 *
 * No runtime dialai imports — safe for browser bundling.
 * Screens import from here; the machine module re-exports these.
 */

export const PEG_NAMES = ["A", "B", "C"] as const;

export const MOVES = [
  { name: "A_to_B", from: 0, to: 1 },
  { name: "A_to_C", from: 0, to: 2 },
  { name: "B_to_A", from: 1, to: 0 },
  { name: "B_to_C", from: 1, to: 2 },
  { name: "C_to_A", from: 2, to: 0 },
  { name: "C_to_B", from: 2, to: 1 },
] as const;

export type Move = (typeof MOVES)[number];

const MOVE_MAP: Map<string, Move> = new Map(MOVES.map((m) => [m.name, m]));

export function getPegStacks(disks: number[]): number[][] {
  const pegs: number[][] = [[], [], []];
  for (let d = 0; d < disks.length; d++) pegs[disks[d]].push(d);
  for (const peg of pegs) peg.sort((a, b) => a - b);
  return pegs;
}

export function isMoveValid(disks: number[], fromPeg: number, toPeg: number): boolean {
  const pegs = getPegStacks(disks);
  if (pegs[fromPeg].length === 0) return false;
  if (pegs[toPeg].length === 0) return true;
  return pegs[fromPeg][0] < pegs[toPeg][0];
}

export function applyMoveToDisks(disks: number[], fromPeg: number, toPeg: number): void {
  if (!isMoveValid(disks, fromPeg, toPeg)) return;
  const pegs = getPegStacks(disks);
  disks[pegs[fromPeg][0]] = toPeg;
}

export function getValidMoves(disks: number[]): Move[] {
  return MOVES.filter((m) => isMoveValid(disks, m.from, m.to));
}

export function isSolved(disks: number[]): boolean {
  return disks.every((d) => d === 2);
}

export function formatDisks(disks: number[]): string {
  const pegs = getPegStacks(disks);
  const labels = ["s", "M", "L"];
  return PEG_NAMES.map(
    (name, i) => `${name}:[${pegs[i].map((d) => labels[d]).join("")}]`
  ).join(" ");
}

/** Replay transition history to reconstruct current disk positions. */
export function replayMoves(history: Array<{ transitionName: string }>): number[] {
  const disks = [0, 0, 0];
  for (const { transitionName } of history) {
    const move = MOVE_MAP.get(transitionName);
    if (!move) continue;
    applyMoveToDisks(disks, move.from, move.to);
  }
  return disks;
}

export function buildOptimalMoveTable(): Map<string, string> {
  const table = new Map<string, string>();
  const goal = "222";

  for (let d0 = 0; d0 < 3; d0++)
    for (let d1 = 0; d1 < 3; d1++)
      for (let d2 = 0; d2 < 3; d2++) {
        const state = `${d0}${d1}${d2}`;
        if (state === goal) continue;
        const visited = new Set([state]);
        const queue: Array<{ state: string; firstMove: string }> = [];

        for (const move of MOVES) {
          const disks = state.split("").map(Number);
          if (!isMoveValid(disks, move.from, move.to)) continue;
          applyMoveToDisks(disks, move.from, move.to);
          const next = disks.join("");
          if (next === goal) { table.set(state, move.name); break; }
          if (!visited.has(next)) {
            visited.add(next);
            queue.push({ state: next, firstMove: move.name });
          }
        }
        if (table.has(state)) continue;

        while (queue.length > 0) {
          const { state: curr, firstMove } = queue.shift()!;
          for (const move of MOVES) {
            const disks = curr.split("").map(Number);
            if (!isMoveValid(disks, move.from, move.to)) continue;
            applyMoveToDisks(disks, move.from, move.to);
            const next = disks.join("");
            if (next === goal) { table.set(state, firstMove); break; }
            if (!visited.has(next)) {
              visited.add(next);
              queue.push({ state: next, firstMove });
            }
          }
          if (table.has(state)) break;
        }
      }
  return table;
}

const OPTIMAL_TABLE = buildOptimalMoveTable();

export function getOptimalMove(disks: number[], transitions: Record<string, string>): { transitionName: string; toState: string; reasoning: string } {
  const stateKey = disks.join("");
  const moveName = OPTIMAL_TABLE.get(stateKey);
  if (!moveName) throw new Error(`No optimal move from "${stateKey}"`);
  return {
    transitionName: moveName,
    toState: transitions[moveName],
    reasoning: `Optimal: ${moveName}`,
  };
}
