/**
 * machine-loader.ts — Auto-discover and load machine modules from machines/
 */

import { readdir } from "node:fs/promises";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import type { MachineModule } from "../machines/types.js";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const MACHINES_DIR = join(__dirname, "..", "machines");

export async function loadMachines(): Promise<Map<string, MachineModule>> {
  const modules = new Map<string, MachineModule>();
  const files = await readdir(MACHINES_DIR);

  for (const file of files) {
    if (file === "types.ts" || file === "types.js") continue;
    if (file.includes("-puzzle")) continue;
    if (!file.endsWith(".ts") && !file.endsWith(".js")) continue;

    const modulePath = join(MACHINES_DIR, file);
    const mod = (await import(modulePath)) as { default: MachineModule };
    const machineModule = mod.default;

    if (!machineModule?.definition?.machineName) {
      console.warn(`Skipping ${file}: no valid MachineModule default export`);
      continue;
    }

    const name = machineModule.definition.machineName;
    modules.set(name, machineModule);
    console.log(`  Loaded machine: ${name} (${basename(file)})`);
  }

  return modules;
}
