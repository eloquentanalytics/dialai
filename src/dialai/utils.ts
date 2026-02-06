import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { MachineDefinition } from "./types.js";

/**
 * Loads a machine definition from a JSON file.
 * This is shared between CLI and MCP server modes.
 */
export function loadMachineFromFile(filePath: string): MachineDefinition {
  const resolvedPath = resolve(filePath);
  try {
    const raw = readFileSync(resolvedPath, "utf-8");
    return JSON.parse(raw) as MachineDefinition;
  } catch (err) {
    throw new Error(
      `Failed to read machine file: ${resolvedPath}\n${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
}
