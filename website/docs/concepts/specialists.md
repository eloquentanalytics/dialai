---
sidebar_position: 3
---

# Specialists

Specialists are the "pluggable" actors that participate in sessions. They can be AI models or humans.

## Roles

### Proposers

Proposers analyze the current state and suggest what transition should happen next. Any number of proposers can participate. A proposer's strategy function receives the current state name and available transitions, and returns a proposed transition.

### Voters

Voters evaluate proposals and express preferences between them. They compare pairs of proposals and vote for A, B, BOTH, or NEITHER. A voter's strategy function receives two proposals and returns a vote choice.

### Arbiters

Arbitration is built into the framework via the `evaluateConsensus` function. It uses voting with human override.

## Human vs AI Specialists

**Human specialists** are identified by including "human" (case-insensitive) anywhere in their `specialistId` (e.g., `human-reviewer`, `specialist.human.jane`). When a human specialist votes, their choice wins immediately — no further vote tallying is needed.

**AI specialists** participate through voting. Each vote counts equally.

## Registering a Specialist

```typescript
import { registerSpecialist } from "dialai";

// Register a proposer with an inline strategy
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

// Register a voter
registerSpecialist({
  specialistId: "ai-voter-1",
  machineName: "my-task",
  role: "voter",
  strategy: (proposalA, proposalB) => {
    return {
      voteFor: "A",
      reasoning: "Proposal A moves closer to the goal",
    };
  },
});
```

### Registration Options

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `specialistId` | `string` | Yes | Unique identifier. Include "human" for human specialists. |
| `machineName` | `string` | Yes | Which session type this specialist participates in |
| `role` | `"proposer" \| "voter" \| "arbiter"` | Yes | The specialist's role |
| `strategy` | `ProposerStrategy \| VoterStrategy` | Yes | The strategy function |
