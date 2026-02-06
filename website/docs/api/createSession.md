---
sidebar_position: 3
---

# `createSession(machine: MachineDefinition): Promise<Session>`

Creates a new session instance. Generates a UUID, sets `currentState` to `machine.initialState`, and stores the session.

```typescript
import { createSession } from "dialai";

const session = await createSession(machine);
```
