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

### 3. Create Directory Structure

```bash
mkdir -p src/strategies
mkdir -p src/machines
```

Your project should look like:

```
my-dial-project/
├── src/
│   ├── strategies/     # Specialist strategy implementations
│   │   └── my-task/
│   │       ├── proposer.ts
│   │       └── voter.ts
│   ├── machines/       # State machine definitions
│   │   └── my-task.ts
│   └── index.ts
├── package.json
└── tsconfig.json
```

## Environment Configuration

### API Keys

If you're using LLM specialists, configure your API keys:

```bash
# .env file
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=sk-ant-...
OPENROUTER_API_KEY=sk-or-...
```

Install dotenv if needed:

```bash
npm install dotenv
```

Load in your code:

```typescript
import 'dotenv/config';
```

### Database (Optional)

DIAL can use various storage backends. For development, in-memory storage works. For production, configure your database:

```typescript
import { createDialClient } from 'dialai';

const dial = createDialClient({
  storage: {
    type: 'postgres',
    connectionString: process.env.DATABASE_URL
  }
});
```

## Verify Installation

Create a test file to verify everything works:

```typescript
// src/test-install.ts
import { createDialClient } from 'dialai';

async function main() {
  const dial = createDialClient();
  
  console.log('DIAL installed successfully!');
  console.log('Version:', dial.version);
}

main().catch(console.error);
```

Run it:

```bash
npx tsx src/test-install.ts
```

You should see:
```
DIAL installed successfully!
Version: x.x.x
```

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
const { createDialClient } = await import('dialai');
```

### Need help?

- Check the [GitHub Issues](https://github.com/eloquentanalytics/dialai/issues)
- Search existing discussions
- Open a new issue with your error details
