---
sidebar_position: 2
---

# Quick Start

This guide will walk you through creating your first DialAI session.

## Creating a Session

A session is an instance of a state machine. Let's start by creating a simple session:

```typescript
import { createSession } from "dialai";

const session = createSession({
  sessionTypeName: "my-task",
  initialState: "idle"
});
```

## Registering Specialists

Specialists are the "pluggable" actors that participate in sessions. They can be AI models or humans:

```typescript
import { registerSpecialist } from "dialai";

await registerSpecialist({
  specialistId: "specialist.my-task.proposer.gpt-4",
  sessionTypeName: "my-task",
  specialistRole: "proposer",
  modelId: "gpt-4"
});
```

## Next Steps

- Learn about [Sessions](/docs/concepts/sessions)
- Understand [Specialists](/docs/concepts/specialists)
- Explore the [Decision Cycle](/docs/concepts/decision-cycle)
