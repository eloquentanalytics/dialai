---
sidebar_position: 1
---

# Examples

This section contains example implementations demonstrating `dialai` library usage. For the concepts behind these examples, see [Concepts](/docs/concepts/intro).

## Minimal Example

The simplest possible machine: one state with one transition.

```bash
# Create machine.json
cat > machine.json << 'EOF'
{
  "machineName": "simple-task",
  "initialState": "pending",
  "goalState": "done",
  "states": {
    "pending": {
      "prompt": "Should we complete this task?",
      "transitions": { "complete": "done" }
    },
    "done": {}
  }
}
EOF

# Run it
npx dialai machine.json
```

Output:

```
Machine:       simple-task
Initial state: pending
Goal state:    done
Final state:   done
Session ID:    a1b2c3d4-...
```

## Programmatic Usage

The same machine, run programmatically:

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

## Multi-Step Pipeline

A 3-state machine that requires 2 cycles to reach the goal:

```typescript
const pipeline: MachineDefinition = {
  machineName: "pipeline",
  initialState: "queued",
  goalState: "complete",
  states: {
    queued: {
      prompt: "Start processing?",
      transitions: { start: "processing" },
    },
    processing: {
      prompt: "Processing complete. Finalize?",
      transitions: { finalize: "complete" },
    },
    complete: {},
  },
};

const session = await runSession(pipeline);
// Transitions: queued → processing → complete
console.log(session.history.length); // 2
```

## Full Decision Cycle

Walk through the complete decision cycle step by step:

```typescript
import {
  createSession,
  getSession,
  registerProposer,
  registerArbiter,
  submitProposal,
  evaluateConsensus,
  executeTransition,
  clear,
} from "dialai";
import type { MachineDefinition } from "dialai";

// Reset state
await clear();

const machine: MachineDefinition = {
  machineName: "review",
  initialState: "pending",
  goalState: "approved",
  states: {
    pending: {
      prompt: "Review this item. Approve or reject?",
      transitions: {
        approve: "approved",
        reject: "rejected",
      },
    },
    approved: {},
    rejected: {},
  },
};

// Step 1: Create session
const session = await createSession(machine);
console.log("Created session:", session.sessionId);
console.log("Current state:", session.currentState); // "pending"

// Step 2: Register specialists
await registerProposer({
  specialistId: "optimist",
  machineName: "review",
  strategyFn: async (ctx) => ({
    transitionName: "approve",
    toState: "approved",
    reasoning: "Looks good to me",
  }),
});

await registerProposer({
  specialistId: "pessimist",
  machineName: "review",
  strategyFn: async (ctx) => ({
    transitionName: "reject",
    toState: "rejected",
    reasoning: "Needs more work",
  }),
});

await registerArbiter({
  specialistId: "review-arbiter",
  machineName: "review",
  strategyFnName: "alignmentMargin",
});

// Step 3: Submit proposals (invoke strategies)
const p1 = await submitProposal({ sessionId: session.sessionId, specialistId: "optimist" });
const p2 = await submitProposal({ sessionId: session.sessionId, specialistId: "pessimist" });
console.log("Proposal 1:", p1.transitionName, "→", p1.toState);
console.log("Proposal 2:", p2.transitionName, "→", p2.toState);

// Step 4: Evaluate consensus
const result = await evaluateConsensus(session.sessionId);
console.log("Consensus reached:", result.consensusReached);
console.log("Winner:", result.winningProposalId);

// Step 5: Execute transition
if (result.consensusReached && result.winningProposalId) {
  const winner = [p1, p2].find(p => p.proposalId === result.winningProposalId)!;
  await executeTransition(
    session.sessionId,
    winner.transitionName,
    winner.toState,
    result.reasoning
  );
}

// Fetch the updated session (the original variable is stale after transition)
const updated = await getSession(session.sessionId);
console.log("Final state:", updated.currentState); // "approved"
console.log("History:", updated.history);
```

## Custom Proposer Strategies

Different proposer strategies for different use cases:

### First Available Transition

```typescript
await registerProposer({
  specialistId: "first-transition",
  machineName: "my-task",
  strategyFn: async (ctx) => {
    const name = Object.keys(ctx.transitions)[0];
    return {
      transitionName: name,
      toState: ctx.transitions[name],
      reasoning: "First available transition",
    };
  },
});
```

### Goal-Directed

```typescript
await registerProposer({
  specialistId: "goal-directed",
  machineName: "my-task",
  strategyFn: async (ctx) => {
    // Prefer transitions that lead to terminal states
    for (const [name, target] of Object.entries(ctx.transitions)) {
      if (target === "done" || target === "approved" || target === "completed") {
        return {
          transitionName: name,
          toState: target,
          reasoning: `Direct path to goal: ${target}`,
        };
      }
    }
    // Fallback to first
    const name = Object.keys(ctx.transitions)[0];
    return {
      transitionName: name,
      toState: ctx.transitions[name],
      reasoning: "No direct path to goal",
    };
  },
});
```

### History-Aware

```typescript
await registerProposer({
  specialistId: "history-aware",
  machineName: "my-task",
  strategyFn: async (ctx) => {
    // Avoid transitions we've taken before
    const previousTransitions = new Set(ctx.history.map(h => h.transitionName));

    for (const [name, target] of Object.entries(ctx.transitions)) {
      if (!previousTransitions.has(name)) {
        return {
          transitionName: name,
          toState: target,
          reasoning: `New transition: ${name}`,
        };
      }
    }

    // All transitions have been taken, pick first
    const name = Object.keys(ctx.transitions)[0];
    return {
      transitionName: name,
      toState: ctx.transitions[name],
      reasoning: "All transitions already taken",
    };
  },
});
```

## Machine JSON Examples

### Document Review Workflow

```json
{
  "machineName": "document-review",
  "initialState": "submitted",
  "goalState": "published",
  "states": {
    "submitted": {
      "prompt": "Review the document. Approve, request revisions, or reject?",
      "transitions": {
        "approve": "published",
        "revise": "revision_requested",
        "reject": "rejected"
      }
    },
    "revision_requested": {
      "prompt": "Author has revised. Approve now or request more changes?",
      "transitions": {
        "approve": "published",
        "revise": "revision_requested",
        "reject": "rejected"
      }
    },
    "published": {},
    "rejected": {}
  }
}
```

### Support Ticket Triage

```json
{
  "machineName": "support-ticket",
  "initialState": "new",
  "goalState": "resolved",
  "states": {
    "new": {
      "prompt": "Triage this ticket: escalate, assign, or resolve?",
      "transitions": {
        "escalate": "escalated",
        "assign": "in_progress",
        "resolve": "resolved"
      }
    },
    "escalated": {
      "prompt": "Senior review complete. Assign or resolve?",
      "transitions": {
        "assign": "in_progress",
        "resolve": "resolved"
      }
    },
    "in_progress": {
      "prompt": "Work complete. Resolve or escalate?",
      "transitions": {
        "resolve": "resolved",
        "escalate": "escalated"
      }
    },
    "resolved": {}
  }
}
```

### Agentic Workflow

```json
{
  "machineName": "coding-agent",
  "initialState": "operating",
  "goalState": "done",
  "states": {
    "operating": {
      "prompt": "Agent is working. Continue, use tool, replan, or finalize?",
      "transitions": {
        "use_tool": "tool_selection",
        "replan": "planning",
        "finalize": "done"
      }
    },
    "tool_selection": {
      "prompt": "Which tool should the agent use?",
      "transitions": {
        "selected": "operating"
      }
    },
    "planning": {
      "prompt": "What should the new plan be?",
      "transitions": {
        "resume": "operating"
      }
    },
    "done": {}
  }
}
```

## Testing Patterns

### Isolated Test Setup

```typescript
import { clear, createSession, runSession } from "dialai";
import { describe, it, beforeEach, expect } from "vitest";

describe("MyMachine", () => {
  beforeEach(async () => {
    await clear(); // Reset all state between tests
  });

  it("reaches goal state", async () => {
    const session = await runSession(machine);
    expect(session.currentState).toBe(machine.goalState);
  });

  it("records history", async () => {
    const session = await runSession(machine);
    expect(session.history.length).toBeGreaterThan(0);
  });
});
```

### Testing Specific Transitions

```typescript
it("takes approve transition when proposer prefers it", async () => {
  await clear();

  await registerProposer({
    specialistId: "always-approve",
    machineName: "review",
    strategyFn: async (ctx) => ({
      transitionName: "approve",
      toState: "approved",
      reasoning: "Prefer approval",
    }),
  });

  const session = await runSession(machine);

  const approvalTransition = session.history.find(
    h => h.transitionName === "approve"
  );
  expect(approvalTransition).toBeDefined();
});
```
