---
sidebar_position: 3
---

# Implementing Strategies

This guide covers how to implement strategy functions for specialists. For the conceptual foundation, see [Specialists](/docs/concepts/specialists) and [Decision Cycle](/docs/concepts/decision-cycle).

Strategies are async functions that define how specialists make decisions. Each specialist is registered with a `strategyFn` that gets called during the decision cycle.

## Proposer Strategy

A proposer `strategyFn` receives a `ProposerContext` and returns a transition choice:

```typescript
const myProposer = async (ctx: ProposerContext) => {
  // ctx.currentState: string - the session's current state name
  // ctx.prompt: string - the decision prompt from the state definition
  // ctx.transitions: Record<string, string> - maps transition name to target state
  // ctx.history: TransitionRecord[] - prior transitions in this session

  // Your logic here: call an LLM, apply rules, etc.

  return {
    transitionName: "complete",
    toState: "done",
    reasoning: "Task is ready to be completed",
  };
};
```

### Proposer strategyFn Signature

```typescript
strategyFn: async (ctx: ProposerContext) => {
  transitionName: string;
  toState: string;
  reasoning: string;
}
```

**Note on `toState`:** Proposers must return `toState` in their response. The engine verifies this value against the machine definition (`machine.states[currentState].transitions[transitionName]`). If the returned `toState` doesn't match what the machine defines, the proposal is rejected.

### Example: Pick the First Transition

```typescript
const firstTransition = async (ctx: ProposerContext) => {
  const name = Object.keys(ctx.transitions)[0];
  return {
    transitionName: name,
    toState: ctx.transitions[name],
    reasoning: "First available transition",
  };
};
```

### Example: Goal-Directed Proposer

```typescript
const goalDirected = async (ctx: ProposerContext) => {
  // Prefer transitions that lead to the goal state
  for (const [name, target] of Object.entries(ctx.transitions)) {
    if (target === "done" || target === "approved" || target === "completed") {
      return {
        transitionName: name,
        toState: target,
        reasoning: `Transition "${name}" leads directly to goal state "${target}"`,
      };
    }
  }
  // Fallback to first transition
  const name = Object.keys(ctx.transitions)[0];
  return {
    transitionName: name,
    toState: ctx.transitions[name],
    reasoning: "No direct path to goal; taking first available transition",
  };
};
```

## Using Strategies with Specialists

Register strategies when creating specialists:

```typescript
import { registerProposer } from "dialai";

registerProposer({
  specialistId: "goal-proposer",
  machineName: "my-task",
  strategyFn: goalDirected,
});
```

## Direct Submission

You can also bypass strategies and submit proposals directly by providing all parameters:

```typescript
import { submitProposal } from "dialai";

// Submit a proposal directly (providing transitionName bypasses strategy)
const proposal = await submitProposal(
  sessionId,
  "manual-proposer",
  session.currentRoundId,
  "approve",
  "Manually approved after review",
  { source: "manual-review" }
);
```

## Strategy Invocation

To invoke a specialist's registered strategy, simply omit the proposal data:

```typescript
import { submitProposal } from "dialai";

// Invoke proposer's strategy (omit transitionName)
const proposal = await submitProposal(
  sessionId,
  "ai-proposer-1",
  session.currentRoundId
);
```
