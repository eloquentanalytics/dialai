/**
 * DIAL AI Utilities
 *
 * File loading and helper functions.
 */

import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import type { MachineDefinition } from "./types.js";

/**
 * Generates a new UUID v4.
 */
export function generateUUID(): string {
  return randomUUID();
}

/**
 * Loads a machine definition from a JSON file.
 *
 * @param filePath - Path to the JSON file
 * @returns The parsed machine definition
 * @throws If file cannot be read or JSON is invalid
 */
export async function loadMachineFromFile(
  filePath: string
): Promise<MachineDefinition> {
  const content = await readFile(filePath, "utf-8");
  const machine = JSON.parse(content) as MachineDefinition;
  validateMachine(machine);
  return normalizeMachine(machine);
}

/**
 * Validates a machine definition has all required fields.
 *
 * @param machine - The machine definition to validate
 * @throws If validation fails
 */
export function validateMachine(machine: unknown): asserts machine is MachineDefinition {
  if (!machine || typeof machine !== "object") {
    throw new Error("Invalid machine definition: must be an object");
  }

  const m = machine as Record<string, unknown>;

  if (typeof m.machineName !== "string" || m.machineName.length === 0) {
    throw new Error("Invalid machine definition: missing or invalid machineName");
  }

  if (typeof m.initialState !== "string" || m.initialState.length === 0) {
    throw new Error("Invalid machine definition: missing or invalid initialState");
  }

  // Support both goalState and defaultState (defaultState is legacy)
  const goalState = m.goalState ?? m.defaultState;
  if (typeof goalState !== "string" || (goalState).length === 0) {
    throw new Error("Invalid machine definition: missing or invalid goalState");
  }

  if (!m.states || typeof m.states !== "object") {
    throw new Error("Invalid machine definition: missing or invalid states");
  }

  const states = m.states as Record<string, unknown>;

  // Check initialState exists in states
  if (!(m.initialState in states)) {
    throw new Error(
      `Invalid machine definition: initialState "${m.initialState}" does not exist in states`
    );
  }

  // Check goalState exists in states
  if (!(goalState in states)) {
    throw new Error(
      `Invalid machine definition: goalState "${goalState}" does not exist in states`
    );
  }

  // Validate each state's transitions point to valid states
  for (const [stateName, stateValue] of Object.entries(states)) {
    if (stateValue && typeof stateValue === "object") {
      const state = stateValue as Record<string, unknown>;
      if (state.transitions && typeof state.transitions === "object") {
        const transitions = state.transitions as Record<string, string>;
        for (const [transitionName, targetState] of Object.entries(transitions)) {
          if (!(targetState in states)) {
            throw new Error(
              `Invalid machine definition: transition "${transitionName}" in state "${stateName}" points to non-existent state "${targetState}"`
            );
          }
        }
      }
    }
  }
}

/**
 * Normalizes a machine definition to ensure consistent structure.
 * Handles legacy field names (defaultState -> goalState).
 */
export function normalizeMachine(machine: MachineDefinition): MachineDefinition {
  const normalized = { ...machine };

  // Handle legacy defaultState field
  const machineAny = machine as unknown as { defaultState?: string };
  if (!normalized.goalState && machineAny.defaultState) {
    normalized.goalState = machineAny.defaultState;
  }

  return normalized;
}
