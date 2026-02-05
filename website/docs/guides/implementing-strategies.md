---
sidebar_position: 3
---

# Implementing Strategies

Strategies are functions that define how specialists make decisions. Each specialist is registered with a strategy function that gets called during the decision cycle.

## Proposer Strategy

A proposer strategy receives the current state name and available transitions, and returns a transition choice:

```typescript
import type { ProposerStrategy } from "dialai";

const myProposer: ProposerStrategy = (currentState, transitions) => {
  // currentState: string - the session's current state name
  // transitions: Record<string, string> - maps transition name → target state

  // Your logic here: call an LLM, apply rules, etc.

  return {
    transitionName: "complete",
    toState: "done",
    reasoning: "Task is ready to be completed",
  };
};
```

### ProposerStrategy Type

```typescript
type ProposerStrategy = (
  currentState: string,
  transitions: Record<string, string>
) => {
  transitionName: string;
  toState: string;
  reasoning: string;
};
```

### Example: Pick the First Transition

```typescript
const firstTransition: ProposerStrategy = (_currentState, transitions) => {
  const name = Object.keys(transitions)[0];
  return {
    transitionName: name,
    toState: transitions[name],
    reasoning: "First available transition",
  };
};
```

### Example: Goal-Directed Proposer

```typescript
const goalDirected: ProposerStrategy = (_currentState, transitions) => {
  // Prefer transitions that lead to the goal state
  for (const [name, target] of Object.entries(transitions)) {
    if (target === "done" || target === "approved" || target === "completed") {
      return {
        transitionName: name,
        toState: target,
        reasoning: `Transition "${name}" leads directly to goal state "${target}"`,
      };
    }
  }
  // Fallback to first transition
  const name = Object.keys(transitions)[0];
  return {
    transitionName: name,
    toState: transitions[name],
    reasoning: "No direct path to goal; taking first available transition",
  };
};
```

## Voter Strategy

A voter strategy compares two proposals and returns a preference:

```typescript
import type { VoterStrategy } from "dialai";

const myVoter: VoterStrategy = (proposalA, proposalB) => {
  // proposalA, proposalB: Proposal objects with:
  //   proposalId, sessionId, specialistId, transitionName, toState, reasoning

  // Your logic to compare proposals

  return {
    voteFor: "A", // "A" | "B" | "BOTH" | "NEITHER"
    reasoning: "Proposal A better aligns with the decision criteria",
  };
};
```

### VoterStrategy Type

```typescript
type VoterStrategy = (
  proposalA: Proposal,
  proposalB: Proposal
) => {
  voteFor: VoteChoice; // "A" | "B" | "BOTH" | "NEITHER"
  reasoning: string;
};
```

### Example: Prefer Goal-Reaching Proposals

```typescript
const goalVoter: VoterStrategy = (proposalA, proposalB) => {
  const aReachesGoal = proposalA.toState === "done";
  const bReachesGoal = proposalB.toState === "done";

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
import { registerSpecialist } from "dialai";

registerSpecialist({
  specialistId: "goal-proposer",
  machineName: "my-task",
  role: "proposer",
  strategy: goalDirected,
});

registerSpecialist({
  specialistId: "goal-voter",
  machineName: "my-task",
  role: "voter",
  strategy: goalVoter,
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
