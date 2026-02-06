---
sidebar_position: 4
---

# `getSession(sessionId: string): Promise<Session>`

Retrieves a session by ID. Throws if not found.

```typescript
import { getSession } from "dialai";

const session = await getSession("a1b2c3d4-...");
```
