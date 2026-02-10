---
sidebar_position: 4
---

# `getSession(sessionId: string): Promise<Session>`

Retrieves a session by its ID. Returns the full session object including current state, history, and machine definition.

## CLI Usage

Sessions are typically managed internally, but you can retrieve them programmatically:

```typescript
import { createSession, getSession } from "dialai";

// Create a session
const session = await createSession(machine);
console.log("Created:", session.sessionId);

// Later, retrieve it by ID
const retrieved = await getSession(session.sessionId);
console.log(retrieved);
```

## Expected Output

```
{
  sessionId: "a1b2c3d4-5678-90ab-cdef-1234567890ab",
  machineName: "document-review",
  currentState: "pending",
  currentRoundId: "f1e2d3c4-...",
  machine: { ... },
  history: [],
  createdAt: "2024-01-15T10:30:00.000Z"
}
```

## What Happened

1. The session store was queried with the provided ID
2. The matching session object was returned with all its current data
3. If no session exists with that ID, an error is thrown

## Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | The UUID of the session to retrieve |

## Return Value

Returns a `Session` object. See [Session](./types.md#session) for the complete type definition.

The returned session includes:
- Current state and round information
- Full transition history
- The original machine definition
- Creation timestamp

## Error Cases

| Error | Cause |
|-------|-------|
| `Session not found` | No session exists with the provided sessionId |
