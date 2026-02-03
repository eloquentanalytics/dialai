---
sidebar_position: 2
---

# Sessions

A session is an instance of a state machine. The machine defines a default state, other possible states, and transitions between them.

## Session Lifecycle

When a session is created, it starts in its default state. When the session is not in its default state, specialists work together to return it there through the decision cycle.

## Session Types

Each session belongs to a session type, which defines:

- The state machine structure
- Available transitions
- Decision prompts for each state
- Risk dial settings

## Session State

A session tracks:

- Current state name
- Current state parameters (opaque JSON)
- Session metadata (opaque JSON)
- Event history

## Creating a Session

```typescript
import { createSession } from "dialai";

const session = createSession({
  sessionTypeName: "my-task",
  metadataJSONString: JSON.stringify({ userId: "123" }),
  initialParamsJSONString: JSON.stringify({ count: 0 })
});
```
