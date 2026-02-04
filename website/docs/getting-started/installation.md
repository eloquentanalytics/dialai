---
sidebar_position: 1
---

# Installation

Get DIAL up and running in your project.

## Prerequisites

- **Node.js** 18+ (LTS recommended)
- **npm** or **pnpm** or **yarn**
- **TypeScript** 5.0+ (recommended)

## Quick Install

```bash
# Using npm
npm install dialai

# Using pnpm
pnpm add dialai

# Using yarn
yarn add dialai
```

## Project Setup

### 1. Initialize a New Project

If you're starting fresh:

```bash
mkdir my-dial-project
cd my-dial-project
npm init -y
npm install dialai typescript @types/node tsx
npx tsc --init
```

### 2. Configure TypeScript

Ensure your `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

### 3. Add `"type": "module"` to package.json

DIAL is an ESM package:

```json
{
  "type": "module"
}
```

## Verify Installation

Create a test file to verify everything works:

```typescript
// src/test-install.ts
import { createSession, runSession } from "dialai";
import type { MachineDefinition } from "dialai";

const machine: MachineDefinition = {
  sessionTypeName: "test",
  initialState: "start",
  defaultState: "end",
  states: {
    start: { transitions: { finish: "end" } },
    end: {},
  },
};

const session = runSession(machine);
console.log("DIAL installed successfully!");
console.log("Session reached:", session.currentState); // "end"
```

Run it:

```bash
npx tsx src/test-install.ts
```

You should see:
```
DIAL installed successfully!
Session reached: end
```

## CLI Usage

DIAL includes a CLI that runs a machine JSON file to completion:

```bash
npx dialai machine.json
```

See [Quick Start](./quick-start.md) for a full example.

## What's Next?

Now that DIAL is installed, you're ready to:

1. **[Quick Start](./quick-start.md)** — Build your first state machine with AI and human specialists
2. **[Learn Concepts](../concepts/intro.md)** — Understand sessions, specialists, and decision cycles
3. **[Build State Machines](../guides/state-machines.md)** — Model your tasks as state machines

## Troubleshooting

### "Module not found" errors

Ensure you're using a compatible Node.js version:

```bash
node --version  # Should be 18+
```

### TypeScript compilation errors

Make sure your tsconfig uses `NodeNext` module resolution:

```json
{
  "compilerOptions": {
    "module": "NodeNext",
    "moduleResolution": "NodeNext"
  }
}
```

### ESM/CJS issues

DIAL is an ESM package. If you're in a CommonJS project, either:

1. Add `"type": "module"` to your `package.json`, or
2. Use dynamic imports:

```typescript
const { runSession } = await import("dialai");
```

### Need help?

- Check the [GitHub Issues](https://github.com/eloquentanalytics/dialai/issues)
- Search existing discussions
- Open a new issue with your error details
