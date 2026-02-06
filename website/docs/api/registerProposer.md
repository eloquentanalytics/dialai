---
sidebar_position: 6
---

# `registerProposer(opts): Promise<Proposer>`

Registers a proposer for a session type. Supports four execution modes: `strategyFn`, `strategyWebhookUrl`, `contextFn + modelId`, or `contextWebhookUrl + modelId`. See the [registering specialists guide](../guides/registering-specialists.md) for details on all modes.

```typescript
import { registerProposer } from "dialai";

const proposer = await registerProposer({
  specialistId: "ai-proposer-1",
  machineName: "my-task",
  strategyFn: async (ctx) => ({
    transitionName: Object.keys(ctx.transitions)[0],
    toState: Object.values(ctx.transitions)[0],
    reasoning: "First available",
  }),
});
```
