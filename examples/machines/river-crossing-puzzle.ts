/**
 * river-crossing-puzzle.ts — Pure puzzle logic for Wolf-Goat-Cabbage
 *
 * No runtime dialai imports — safe for browser bundling.
 * Screens import from here; the machine module re-exports these.
 */

export const ITEM_SHORT = ["F", "W", "G", "C"] as const;
export const ITEM_NAMES = ["Farmer", "Wolf", "Goat", "Cabbage"] as const;

export interface Move {
  name: string;
  item: number | null;
}

export const MOVES: Move[] = [
  { name: "cross_alone", item: null },
  { name: "take_wolf", item: 1 },
  { name: "take_goat", item: 2 },
  { name: "take_cabbage", item: 3 },
];

export function isSafe(items: number[]): boolean {
  const [f, w, g, c] = items;
  if (w === g && f !== w) return false;
  if (g === c && f !== g) return false;
  return true;
}

function applyMoveToItems(items: number[], move: Move): number[] | null {
  const result = [...items];
  const farmerSide = result[0];
  if (move.item !== null && result[move.item] !== farmerSide) return null;
  result[0] = 1 - farmerSide;
  if (move.item !== null) result[move.item] = 1 - farmerSide;
  return isSafe(result) ? result : null;
}

/** Replay transition history to reconstruct current board. */
export function replayMoves(history: Array<{ transitionName: string }>): number[] {
  let items = [0, 0, 0, 0];
  for (const { transitionName } of history) {
    const move = MOVES.find((m) => m.name === transitionName);
    if (!move) continue;
    const next = applyMoveToItems(items, move);
    if (next) items = next;
  }
  return items;
}

export function getValidMoves(items: number[]): Array<{ move: Move; target: number[] }> {
  const results: Array<{ move: Move; target: number[] }> = [];
  for (const move of MOVES) {
    const target = applyMoveToItems(items, move);
    if (target !== null) results.push({ move, target });
  }
  return results;
}

export function isSolved(items: number[]): boolean {
  return items.every((i) => i === 1);
}

export function formatItems(items: number[]): string {
  const left: string[] = [];
  const right: string[] = [];
  for (let i = 0; i < 4; i++) {
    if (items[i] === 0) left.push(ITEM_SHORT[i]);
    else right.push(ITEM_SHORT[i]);
  }
  return `L:[${left.join(",")}] R:[${right.join(",")}]`;
}

function buildOptimalMoveTable(): Map<string, string> {
  const goal = "1111";
  const table = new Map<string, string>();

  const safeStates: string[] = [];
  for (let bits = 0; bits < 16; bits++) {
    const items = [(bits >> 3) & 1, (bits >> 2) & 1, (bits >> 1) & 1, bits & 1];
    const state = items.join("");
    if (isSafe(items) && state !== goal) safeStates.push(state);
  }

  for (const start of safeStates) {
    const startItems = start.split("").map(Number);
    const visited = new Set([start]);
    const queue: Array<{ items: number[]; firstMove: string }> = [];

    for (const { move, target } of getValidMoves(startItems)) {
      const key = target.join("");
      if (key === goal) { table.set(start, move.name); break; }
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ items: target, firstMove: move.name });
      }
    }
    if (table.has(start)) continue;

    while (queue.length > 0) {
      const { items: curr, firstMove } = queue.shift()!;
      for (const { target } of getValidMoves(curr)) {
        const key = target.join("");
        if (key === goal) { table.set(start, firstMove); break; }
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ items: target, firstMove });
        }
      }
      if (table.has(start)) break;
    }
  }

  return table;
}

const OPTIMAL_TABLE = buildOptimalMoveTable();

export function getOptimalMove(items: number[], transitions: Record<string, string>): { transitionName: string; toState: string; reasoning: string } {
  const key = items.join("");
  const moveName = OPTIMAL_TABLE.get(key);
  if (!moveName) throw new Error(`No optimal move from "${key}"`);
  return {
    transitionName: moveName,
    toState: transitions[moveName],
    reasoning: `Optimal: ${moveName}`,
  };
}
