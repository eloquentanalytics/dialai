---
sidebar_position: 3
---

# `createSession(machine: MachineDefinition): Promise<Session>`

Creates a new session instance from a machine definition. Generates a UUID, sets `currentState` to `machine.initialState`, and stores the session.

## CLI Usage

```bash
npx dialai machine.json
```

This implicitly creates a session from your machine definition. For programmatic control:

```typescript
import { createSession } from "dialai";

const machine = {
  machineName: "document-review",
  initialState: "pending",
  goalState: "approved",
  states: {
    pending: {
      prompt: "Review the document. Approve or request changes?",
      transitions: { approve: "approved", reject: "rejected" }
    },
    approved: {},
    rejected: {}
  }
};

const session = await createSession(machine);
console.log(session);
```

## Expected Output

```
Session created:
  sessionId:     a1b2c3d4-5678-90ab-cdef-1234567890ab
  machineName:   document-review
  currentState:  pending
  currentRoundId: f1e2d3c4-...
  history:       []
  createdAt:     2024-01-15T10:30:00.000Z
```

## What Happened

1. A new UUID was generated for the session
2. The session was initialized in the machine's `initialState` ("pending")
3. A new round ID was generated for the first decision cycle
4. The session was stored in memory
5. The session object was returned

## Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `machine` | `MachineDefinition` | Yes | The machine definition to instantiate |

See [MachineDefinition](./types.md#machinedefinition) for the complete type definition.

## Return Value

Returns a `Session` object containing:
- `sessionId`: Unique identifier for this session
- `machineName`: Name of the machine being run
- `currentState`: Current state (initially `machine.initialState`)
- `currentRoundId`: ID of the current decision round
- `machine`: The full machine definition
- `history`: Empty array (no transitions yet)
- `createdAt`: Timestamp of creation

See [Session](./types.md#session) for the complete type definition.

## Error Cases

| Error | Cause |
|-------|-------|
| `Invalid machine definition` | Missing required fields (machineName, initialState, goalState, states) |
| `Unknown initial state` | `initialState` does not exist in `states` |
