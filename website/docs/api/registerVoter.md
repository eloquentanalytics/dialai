---
sidebar_position: 7
---

# `registerVoter(opts): Promise<Voter>`

Registers a voter for a session type. Supports the same four execution modes as `registerProposer`. See the [registering specialists guide](../guides/registering-specialists.md) for details.

```typescript
import { registerVoter } from "dialai";

const voter = await registerVoter({
  specialistId: "ai-voter-1",
  machineName: "my-task",
  strategyFn: async (ctx) => ({
    voteFor: "A",
    reasoning: "Proposal A is better aligned",
  }),
});
```
