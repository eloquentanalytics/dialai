---
sidebar_position: 3
---

# Specialists

Specialists are the "pluggable" actors that participate in sessions. They can be AI models or humans.

## Roles

### Proposers

Proposers analyze the current state and suggest what transition should happen next. Any number of LLM or Human proposers can participate.

### Voters

Voters evaluate proposals and express preferences between them. They compare pairs of proposals and vote for A, B, BOTH, or NEITHER.

### Arbiters

Arbiters evaluate consensus and determine when sufficient agreement has been reached. There is one deterministic strategy that evaluates consensus.

### Tools

Tools perform synchronous function-like transitions when requested. One designated deterministic strategy performs transitions when requested.

## Human vs AI Specialists

**Human specialists** are identified by including "human" (case-insensitive) anywhere in their `specialistId` (e.g., `specialist.sheep.human`, `human_operator_1`). Human votes have weight 1.0 by default.

**AI specialists** (LLMs) start with weight 0.0 and must earn trust through demonstrated alignment with human choices.

## Registering a Specialist

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
