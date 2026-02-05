---
sidebar_position: 3
---

# Implementing Strategies

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

## Voter Strategy

A voter `strategyFn` receives a `VoterContext` and returns a preference:

```typescript
const myVoter = async (ctx: VoterContext) => {
  // ctx.proposalA, ctx.proposalB: Proposal objects with:
  //   proposalId, sessionId, specialistId, transitionName, toState, reasoning
  // ctx.currentState: string
  // ctx.prompt: string
  // ctx.history: TransitionRecord[]

  // Your logic to compare proposals

  return {
    voteFor: "A", // "A" | "B" | "BOTH" | "NEITHER"
    reasoning: "Proposal A better aligns with the decision criteria",
  };
};
```

### Voter strategyFn Signature

```typescript
strategyFn: async (ctx: VoterContext) => {
  voteFor: VoteChoice; // "A" | "B" | "BOTH" | "NEITHER"
  reasoning: string;
}
```

### Example: Prefer Goal-Reaching Proposals

```typescript
const goalVoter = async (ctx: VoterContext) => {
  const aReachesGoal = ctx.proposalA.toState === "done";
  const bReachesGoal = ctx.proposalB.toState === "done";

  if (aReachesGoal && !bReachesGoal) {
    return { voteFor: "A", reasoning: "Proposal A reaches the goal state" };
  }
  if (bReachesGoal && !aReachesGoal) {
    return { voteFor: "B", reasoning: "Proposal B reaches the goal state" };
  }
  if (aReachesGoal && bReachesGoal) {
    return { voteFor: "BOTH", reasoning: "Both proposals reach the goal" };
  }
  return { voteFor: "NEITHER", reasoning: "Neither proposal reaches the goal" };
};
```

## Using Strategies with Specialists

Register strategies when creating specialists:

```typescript
import { registerProposer, registerVoter } from "dialai";

registerProposer({
  specialistId: "goal-proposer",
  machineName: "my-task",
  strategyFn: goalDirected,
});

registerVoter({
  specialistId: "goal-voter",
  machineName: "my-task",
  strategyFn: goalVoter,
});
```

## Direct Submission

You can also bypass strategies and submit proposals or votes directly:

```typescript
import { submitProposal, submitVote } from "dialai";

// Submit a proposal without a registered strategy
const proposal = submitProposal(
  sessionId,
  "manual-proposer",
  "approve",
  "approved",
  "Manually approved after review"
);

// Submit a vote directly
const vote = submitVote(
  sessionId,
  "manual-voter",
  proposalA.proposalId,
  proposalB.proposalId,
  "A",
  "Prefer proposal A"
);
```
