---
sidebar_position: 2
---

# Registering Specialists

Specialists are registered for a specific session type and can be scoped to specific states.

## Basic Registration

```typescript
import { registerSpecialist } from "dialai";

await registerSpecialist({
  specialistId: "specialist.my-task.proposer.gpt-4",
  sessionTypeName: "my-task",
  specialistRole: "proposer",
  strategyFunctionKey: "proposer",
  modelId: "gpt-4",
  displayName: "GPT-4 Proposer",
  weight: 0.0,
  temperature: 0.2,
  maxTokens: 2000
});
```

## Specialist ID Format

The recommended format for specialist IDs is:

```
specialist.{sessionType}.{role}.{provider}_{model}_{tier}
```

Example: `specialist.hanoi.proposer.nvidia_nemotron-3-nano-30b-a3b_free`

This format encodes model parameters in the ID itself, ensuring each model configuration is a distinct specialist.

## State-Scoped Specialists

You can register a specialist to only be available in a specific state:

```typescript
await registerSpecialist({
  specialistId: "specialist.my-task.proposer.gpt-4",
  sessionTypeName: "my-task",
  fromStateName: "working", // Only available in "working" state
  specialistRole: "proposer",
  // ... other fields
});
```

## Human Specialists

Human specialists are identified by including "human" (case-insensitive) anywhere in their `specialistId`:

```typescript
await registerSpecialist({
  specialistId: "specialist.my-task.proposer.human",
  sessionTypeName: "my-task",
  specialistRole: "proposer",
  // ... other fields
});
```

Human votes have weight 1.0 by default.
