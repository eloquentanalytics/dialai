---
sidebar_position: 5
---

# `getSessions(): Promise<Session[]>`

Returns all stored sessions. Useful for listing active sessions or debugging.

## CLI Usage

```typescript
import { createSession, getSessions } from "dialai";

// Create a few sessions
await createSession(machine1);
await createSession(machine2);
await createSession(machine1);  // Another instance of machine1

// List all sessions
const all = await getSessions();
console.log(`Total sessions: ${all.length}`);

all.forEach(s => {
  console.log(`  ${s.sessionId}: ${s.machineName} @ ${s.currentState}`);
});
```

## Expected Output

```
Total sessions: 3
  a1b2c3d4-...: document-review @ pending
  e5f6g7h8-...: code-review @ in_review
  i9j0k1l2-...: document-review @ approved
```

## What Happened

1. All sessions were retrieved from the in-memory store
2. Sessions were returned as an array
3. Sessions from all machine types are included

## Parameters

None.

## Return Value

Returns an array of `Session` objects. See [Session](./types.md#session) for the complete type definition.

The array may be empty if no sessions have been created.

## Filtering Sessions

The function returns all sessions. Filter in your application code:

```typescript
const all = await getSessions();

// Filter by machine name
const reviewSessions = all.filter(s => s.machineName === "document-review");

// Filter by state
const pendingSessions = all.filter(s => s.currentState === "pending");

// Filter by completion (at goal state)
const completed = all.filter(s => s.currentState === s.machine.goalState);
```

## Error Cases

This function does not throw errors. Returns an empty array if no sessions exist.
