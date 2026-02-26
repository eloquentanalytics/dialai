# DIAL Machine Patterns

Copy-paste-ready patterns for common DIAL machine configurations.

## 1. Minimal Machine

Single transition with `runSession()` defaults (auto-registers `firstAvailable` proposer and `firstProposal` arbiter):

```typescript
import { runSession } from "dialai";
import type { MachineDefinition } from "dialai";

const machine: MachineDefinition = {
  machineName: "simple-task",
  initialState: "pending",
  goalState: "done",
  states: {
    pending: {
      prompt: "Should we complete this task?",
      transitions: { complete: "done" },
    },
    done: {},
  },
};

const session = await runSession(machine);
console.log(session.currentState); // "done"
```

## 2. Linear Pipeline

Multi-step sequential workflow:

```typescript
const pipeline: MachineDefinition = {
  machineName: "data-pipeline",
  initialState: "queued",
  goalState: "complete",
  states: {
    queued: {
      prompt: "Start processing?",
      transitions: { start: "processing" },
    },
    processing: {
      prompt: "Processing complete. Validate results?",
      transitions: { validate: "validating" },
    },
    validating: {
      prompt: "Validation passed. Finalize?",
      transitions: { finalize: "complete" },
    },
    complete: {},
  },
};

const session = await runSession(pipeline);
// queued -> processing -> validating -> complete
console.log(session.history.length); // 3
```

## 3. Branching with Rejection Loops

Approve/reject with loop back:

```typescript
const review: MachineDefinition = {
  machineName: "code-review",
  initialState: "draft",
  goalState: "merged",
  states: {
    draft: {
      prompt: "Review this PR. Approve or request changes?",
      transitions: {
        approve: "merged",
        request_changes: "revision",
      },
    },
    revision: {
      prompt: "Author has addressed feedback. Approve or request more changes?",
      transitions: {
        approve: "merged",
        request_changes: "revision",
      },
    },
    merged: {},
  },
};
```

## 4. Human-in-the-Loop

AI proposes, human forces via `submitArbitration`:

```typescript
import {
  createSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  submitArbitration,
  getSession,
} from "dialai";

const machine: MachineDefinition = {
  machineName: "content-moderation",
  initialState: "pending_review",
  goalState: "resolved",
  states: {
    pending_review: {
      prompt: "Review this content. Approve, flag, or remove?",
      transitions: {
        approve: "resolved",
        flag: "flagged",
        remove: "removed",
      },
    },
    flagged: {
      prompt: "Flagged content. Escalate or resolve?",
      transitions: {
        escalate: "escalated",
        resolve: "resolved",
      },
    },
    escalated: {
      prompt: "Senior review. Approve or remove?",
      transitions: {
        approve: "resolved",
        remove: "removed",
      },
    },
    resolved: {},
    removed: {},
  },
};

// Create session and register AI proposer + human specialist
const session = await createSession(machine);

await registerProposer({
  specialistId: "ai-moderator",
  machineName: "content-moderation",
  strategyFnName: "firstAvailable",
});

await registerProposer({
  specialistId: "human-moderator",
  machineName: "content-moderation",
  strategyFnName: "firstAvailable",
  isHuman: true,
});

await registerArbiter({
  specialistId: "mod-arbiter",
  machineName: "content-moderation",
  strategyFnName: "alignmentMargin",
});

// AI submits its proposal
await submitProposal({
  sessionId: session.sessionId,
  specialistId: "ai-moderator",
});

// Human overrides with a forced decision
const result = await submitArbitration({
  sessionId: session.sessionId,
  specialistId: "human-moderator",
  transitionName: "flag",
  reasoning: "Content needs further review",
});

console.log(result.executed); // true
console.log(result.isHuman);  // true

const updated = await getSession(session.sessionId);
console.log(updated.currentState); // "flagged"
```

## 5. Multi-Agent Consensus

Multiple proposers with `alignmentMargin` arbiter:

```typescript
import {
  clear,
  createSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  submitArbitration,
  getSession,
} from "dialai";

await clear();

const machine: MachineDefinition = {
  machineName: "investment-decision",
  initialState: "analysis",
  goalState: "executed",
  consensusThreshold: 0.6,
  states: {
    analysis: {
      prompt: "Analyze this investment. Buy, hold, or sell?",
      transitions: {
        buy: "executed",
        hold: "monitoring",
        sell: "executed",
      },
    },
    monitoring: {
      prompt: "Re-evaluate position. Buy or sell?",
      transitions: {
        buy: "executed",
        sell: "executed",
      },
    },
    executed: {},
  },
};

const session = await createSession(machine);

// Register multiple AI proposers with different strategies
await registerProposer({
  specialistId: "bull-analyst",
  machineName: "investment-decision",
  strategyFn: async (ctx) => ({
    transitionName: "buy",
    toState: ctx.transitions["buy"],
    reasoning: "Bullish indicators suggest buying",
  }),
});

await registerProposer({
  specialistId: "bear-analyst",
  machineName: "investment-decision",
  strategyFn: async (ctx) => ({
    transitionName: "hold",
    toState: ctx.transitions["hold"],
    reasoning: "Market uncertainty suggests holding",
  }),
});

await registerProposer({
  specialistId: "quant-analyst",
  machineName: "investment-decision",
  strategyFn: async (ctx) => ({
    transitionName: "buy",
    toState: ctx.transitions["buy"],
    reasoning: "Quantitative signals are positive",
  }),
});

// Register alignment-based arbiter
await registerArbiter({
  specialistId: "investment-arbiter",
  machineName: "investment-decision",
  strategyFnName: "alignmentMargin",
  threshold: 0.6,
});

// Submit all proposals
await submitProposal({ sessionId: session.sessionId, specialistId: "bull-analyst" });
await submitProposal({ sessionId: session.sessionId, specialistId: "bear-analyst" });
await submitProposal({ sessionId: session.sessionId, specialistId: "quant-analyst" });

// Arbitrate
const result = await submitArbitration({ sessionId: session.sessionId });
console.log(result.executed);       // depends on alignment scores
console.log(result.guardReason);    // explains consensus decision
```

## 6. LLM-Powered Proposer

Use `contextFn` + `modelId` to have DIAL call an LLM:

```typescript
await registerProposer({
  specialistId: "llm-reviewer",
  machineName: "document-review",
  contextFn: async (ctx) => {
    return `You are a document reviewer. The document is in state "${ctx.currentState}".

Prompt: ${ctx.prompt}

Available actions:
${Object.entries(ctx.transitions)
  .map(([name, target]) => `- "${name}" -> goes to "${target}"`)
  .join("\n")}

Previous actions taken:
${ctx.history.length > 0 ? ctx.history.map((h) => `- ${h.transitionName}: ${h.reasoning}`).join("\n") : "None"}

${ctx.metaJson ? `Additional context: ${JSON.stringify(ctx.metaJson)}` : ""}

Choose the best action and explain your reasoning.`;
  },
  modelId: "anthropic/claude-sonnet-4",
});
```

Requires `OPENROUTER_API_TOKEN` in the environment (or set `DIALAI_LLM_BASE_URL` for a different OpenAI-compatible provider).

## 7. Per-State Specialists

Different specialists for different states in the machine definition:

```typescript
const machine: MachineDefinition = {
  machineName: "hiring-pipeline",
  initialState: "screening",
  goalState: "hired",
  states: {
    screening: {
      prompt: "Screen this candidate. Pass or reject?",
      transitions: {
        pass: "interview",
        reject: "rejected",
      },
      specialists: [
        { role: "proposer", specialistId: "hr-screener", strategyFnName: "firstAvailable" },
        { role: "arbiter", specialistId: "screening-arbiter", strategyFnName: "firstProposal" },
      ],
    },
    interview: {
      prompt: "Interview complete. Hire or reject?",
      transitions: {
        hire: "hired",
        reject: "rejected",
      },
      specialists: [
        { role: "proposer", specialistId: "interviewer-1", strategyFnName: "firstAvailable" },
        { role: "proposer", specialistId: "interviewer-2", strategyFnName: "lastAvailable" },
        { role: "arbiter", specialistId: "hiring-arbiter", strategyFnName: "alignmentMargin" },
      ],
    },
    hired: {},
    rejected: {},
  },
};
```

## 8. Embedded Specialists in JSON

Complete runnable JSON machine with specialists (save as `.json` and run with `npx dialai`):

```json
{
  "machineName": "approval-flow",
  "initialState": "submitted",
  "goalState": "approved",
  "specialists": [
    {
      "role": "proposer",
      "specialistId": "auto-approver",
      "strategyFnName": "firstAvailable"
    },
    {
      "role": "arbiter",
      "specialistId": "flow-arbiter",
      "strategyFnName": "firstProposal"
    }
  ],
  "states": {
    "submitted": {
      "prompt": "Review submission. Approve or reject?",
      "transitions": {
        "approve": "approved",
        "reject": "rejected"
      }
    },
    "approved": {},
    "rejected": {}
  }
}
```

```bash
npx dialai approval-flow.json
```

## 9. Session Metadata

Pass runtime context via `metaJson`:

```typescript
import { createSession, runSession } from "dialai";

// Pass metadata at session creation
const session = await createSession(machine, {
  documentId: "doc-12345",
  submittedBy: "user@example.com",
  priority: "high",
});

// Access in strategy functions via ctx.metaJson
await registerProposer({
  specialistId: "priority-aware",
  machineName: "document-review",
  strategyFn: async (ctx) => {
    const priority = ctx.metaJson?.priority as string;

    if (priority === "high") {
      // Fast-track high priority items
      return {
        transitionName: "approve",
        toState: ctx.transitions["approve"],
        reasoning: "High priority item - fast-tracking approval",
      };
    }

    const [name, target] = Object.entries(ctx.transitions)[0];
    return { transitionName: name, toState: target, reasoning: "Standard processing" };
  },
});
```

## 10. Testing Patterns

### Basic vitest Setup

```typescript
import { clear, runSession, createSession, registerProposer, registerArbiter } from "dialai";
import { describe, it, beforeEach, expect } from "vitest";
import type { MachineDefinition } from "dialai";

const machine: MachineDefinition = {
  machineName: "test-workflow",
  initialState: "start",
  goalState: "end",
  states: {
    start: {
      prompt: "Begin?",
      transitions: { proceed: "middle", skip: "end" },
    },
    middle: {
      prompt: "Continue?",
      transitions: { finish: "end" },
    },
    end: {},
  },
};

describe("test-workflow", () => {
  beforeEach(async () => {
    await clear();
  });

  it("reaches goal state", async () => {
    const session = await runSession(machine);
    expect(session.currentState).toBe("end");
  });

  it("records transition history", async () => {
    const session = await runSession(machine);
    expect(session.history.length).toBeGreaterThan(0);
    expect(session.history.every((h) => h.transitionName)).toBe(true);
  });
});
```

### Test a Specific Transition

```typescript
it("takes the skip transition when configured", async () => {
  await clear();

  await registerProposer({
    specialistId: "skipper",
    machineName: "test-workflow",
    strategyFn: async (ctx) => ({
      transitionName: "skip",
      toState: ctx.transitions["skip"],
      reasoning: "Skipping to end",
    }),
  });

  const session = await runSession(machine);
  expect(session.history).toHaveLength(1);
  expect(session.history[0].transitionName).toBe("skip");
  expect(session.currentState).toBe("end");
});
```

### Test Multi-Step Path

```typescript
it("follows the full path through middle", async () => {
  await clear();

  await registerProposer({
    specialistId: "full-path",
    machineName: "test-workflow",
    strategyFn: async (ctx) => {
      if (ctx.currentState === "start") {
        return {
          transitionName: "proceed",
          toState: ctx.transitions["proceed"],
          reasoning: "Going through middle",
        };
      }
      return {
        transitionName: "finish",
        toState: ctx.transitions["finish"],
        reasoning: "Finishing up",
      };
    },
  });

  const session = await runSession(machine);
  expect(session.history).toHaveLength(2);
  expect(session.history[0].transitionName).toBe("proceed");
  expect(session.history[1].transitionName).toBe("finish");
});
```

## 11. Anti-Patterns

### Goal state with transitions

The goal state should have no transitions. Adding transitions to the goal state means the session will never be considered terminal:

```typescript
// WRONG
states: {
  done: {
    transitions: { restart: "start" }, // goal state should have no transitions
  },
}

// RIGHT
states: {
  done: {}, // goal state is empty
}
```

### Mixing execution modes

Each specialist must have exactly one execution mode. Combining them causes a registration error:

```typescript
// WRONG - strategyFn + strategyFnName
await registerProposer({
  specialistId: "confused",
  machineName: "my-machine",
  strategyFn: async (ctx) => ({ ... }),
  strategyFnName: "firstAvailable",        // ERROR: two execution modes
});

// WRONG - strategyFn + modelId
await registerProposer({
  specialistId: "confused",
  machineName: "my-machine",
  strategyFn: async (ctx) => ({ ... }),
  modelId: "anthropic/claude-sonnet-4",   // ERROR: modelId only for contextFn/contextWebhookUrl
});
```

### Forgetting `clear()` in tests

Without `clear()`, specialists and sessions from previous tests leak into the next test:

```typescript
// WRONG
describe("my tests", () => {
  it("test 1", async () => {
    await registerProposer({ specialistId: "bot", ... });
    // ...
  });

  it("test 2", async () => {
    // ERROR: "Specialist already exists: bot"
    await registerProposer({ specialistId: "bot", ... });
  });
});

// RIGHT
describe("my tests", () => {
  beforeEach(async () => {
    await clear();
  });
  // ...
});
```

### `contextFn` without `modelId`

When using LLM mode, both `contextFn` and `modelId` are required:

```typescript
// WRONG
await registerProposer({
  specialistId: "llm-bot",
  machineName: "my-machine",
  contextFn: async (ctx) => "some prompt",
  // ERROR: contextFn requires modelId
});

// RIGHT
await registerProposer({
  specialistId: "llm-bot",
  machineName: "my-machine",
  contextFn: async (ctx) => "some prompt",
  modelId: "anthropic/claude-sonnet-4",
});
```

### Webhook without `webhookTokenName`

Webhook URLs require authentication:

```typescript
// WRONG
await registerProposer({
  specialistId: "webhook-bot",
  machineName: "my-machine",
  strategyWebhookUrl: "https://api.example.com/propose",
  // ERROR: webhookTokenName required
});

// RIGHT
await registerProposer({
  specialistId: "webhook-bot",
  machineName: "my-machine",
  strategyWebhookUrl: "https://api.example.com/propose",
  webhookTokenName: "MY_API_TOKEN",
});
```
