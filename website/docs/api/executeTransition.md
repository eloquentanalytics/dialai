---
sidebar_position: 8
---

# `executeTransition(sessionId, transitionName, toState, reasoning?): Promise<Session>`

Validates the transition from the current state, records it in `session.history` with the given `reasoning`, updates `currentState`, and clears all proposals and votes for the session.

```typescript
import { executeTransition } from "dialai";

const updated = await executeTransition(
  session.sessionId,
  "approve",
  "approved",
  consensus.reasoning
);
console.log(updated.currentState); // "approved"
console.log(updated.history);      // [{ fromState: "review", toState: "approved", reasoning: "...", ... }]
```
