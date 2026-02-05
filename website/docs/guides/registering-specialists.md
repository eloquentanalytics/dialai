---
sidebar_position: 2
---

# Registering Specialists

Specialists are registered for a specific session type using the `registerSpecialist` function.

## Basic Registration

```typescript
import { registerSpecialist } from "dialai";

registerSpecialist({
  specialistId: "ai-proposer-1",
  machineName: "my-task",
  role: "proposer",
  strategy: (currentState, transitions) => {
    const name = Object.keys(transitions)[0];
    return {
      transitionName: name,
      toState: transitions[name],
      reasoning: "First available transition",
    };
  },
});
```

## Registration Options

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `specialistId` | `string` | Yes | — | Unique identifier for this specialist |
| `machineName` | `string` | Yes | — | Which session type this specialist participates in |
| `role` | `"proposer" \| "voter" \| "arbiter"` | Yes | — | The specialist's role |
| `weight` | `number` | No | `1.0` | Voting weight used in consensus evaluation |
| `strategy` | `ProposerStrategy \| VoterStrategy` | Yes | — | The strategy function |

## Specialist ID Conventions

Any naming scheme works, but including the role and purpose is helpful:

```
ai-proposer-1
ai-voter-gpt4
human-reviewer
human-approver-jane
```

To enable the human override in `evaluateConsensus`, include "human" (case-insensitive) anywhere in the `specialistId`:

```typescript
// These all trigger human primacy:
registerSpecialist({ specialistId: "human-reviewer", ... });
registerSpecialist({ specialistId: "specialist.human.jane", ... });
registerSpecialist({ specialistId: "HUMAN_APPROVER", ... });
```

## Proposer Specialists

A proposer's strategy receives the current state name and the available transitions map, and returns a transition choice:

```typescript
import type { ProposerStrategy } from "dialai";

const myProposer: ProposerStrategy = (currentState, transitions) => {
  // transitions is Record<string, string> — maps transition name → target state
  return {
    transitionName: "approve",
    toState: "approved",
    reasoning: "Document meets standards",
  };
};

registerSpecialist({
  specialistId: "smart-proposer",
  machineName: "document-review",
  role: "proposer",
  strategy: myProposer,
});
```

## Voter Specialists

A voter's strategy receives two proposals and returns a vote:

```typescript
import type { VoterStrategy } from "dialai";

const myVoter: VoterStrategy = (proposalA, proposalB) => {
  // proposalA and proposalB are Proposal objects with:
  //   proposalId, sessionId, specialistId, transitionName, toState, reasoning
  return {
    voteFor: "A", // "A" | "B" | "BOTH" | "NEITHER"
    reasoning: "Proposal A is more aligned with the goal",
  };
};

registerSpecialist({
  specialistId: "quality-voter",
  machineName: "document-review",
  role: "voter",
  strategy: myVoter,
});
```

## Human Specialists

Human specialists can be registered with strategy functions that encode human preferences, or proposals/votes can be submitted directly via `submitProposal` and `submitVote`:

```typescript
// Register a human specialist with a strategy
registerSpecialist({
  specialistId: "human-reviewer",
  machineName: "document-review",
  role: "voter",
  strategy: (proposalA, proposalB) => ({
    voteFor: "B",
    reasoning: "Prefer the more conservative approach",
  }),
});

// Or submit votes directly without a strategy
import { submitVote } from "dialai";

submitVote(
  session.sessionId,
  "human-reviewer",
  proposalA.proposalId,
  proposalB.proposalId,
  "B",
  "I prefer the more conservative approach"
);
```

## Weight Configuration

The `weight` parameter controls how much a specialist's vote counts during consensus evaluation:

```typescript
// Default weight is 1.0
registerSpecialist({
  specialistId: "standard-voter",
  machineName: "my-task",
  role: "voter",
  weight: 1.0,
  strategy: myVoter,
});

// Higher weight = more influence
registerSpecialist({
  specialistId: "senior-voter",
  machineName: "my-task",
  role: "voter",
  weight: 2.0,
  strategy: myVoter,
});
```

Note: Human vote override ignores weights entirely — if a specialist's ID contains "human", their vote wins immediately regardless of weight.
