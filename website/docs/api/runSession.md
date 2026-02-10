---
sidebar_position: 2
---

# `runSession(machine: MachineDefinition): Promise<Session>`

Runs a machine to completion. Creates a session, registers a built-in deterministic proposer, and loops through the decision cycle until `currentState === defaultState`.

```typescript
import { runSession } from "dialai";

const session = await runSession(machine);
```
