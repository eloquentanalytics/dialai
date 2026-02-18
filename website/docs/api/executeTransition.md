---
sidebar_position: 9
---

# `executeTransition(sessionId, transitionName, toState, reasoning?): Promise<Session>`

Executes a state transition on a session. Validates the transition is valid from the current state, records it in history, updates `currentState`, and clears all proposals for the session.

## CLI Usage

Transitions are typically executed automatically by the decision cycle. For manual control:

```typescript
import { createSession, executeTransition } from "dialai";

const session = await createSession(machine);
console.log("Before:", session.currentState);  // "pending"

const updated = await executeTransition(
  session.sessionId,
  "approve",
  "approved",
  "Manual approval by administrator"
);

console.log("After:", updated.currentState);   // "approved"
console.log("History:", updated.history);
```

## Expected Output

```
Before: pending
After:  approved
History: [
  {
    transitionName: "approve",
    reasoning: "Manual approval by administrator",
    executionTimestamp: "2024-01-15T10:35:00.000Z"
  }
]
```

## What Happened

1. The transition "approve" was validated against the current state's available transitions
2. The transition was valid: pending → approved
3. A new history record was created with the transition details
4. `currentState` was updated to "approved"
5. A new round ID was generated for the next decision cycle
6. All proposals for this session were cleared
7. The updated session was returned

## Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session to transition |
| `transitionName` | `string` | Yes | Name of the transition to execute |
| `toState` | `string` | Yes | Target state of the transition |
| `reasoning` | `string` | No | Explanation for the transition |

## Return Value

Returns the updated `Session` object. See [Session](./types.md#session) for the complete type definition.

Key changes in the returned session:
- `currentState`: Updated to the new state
- `currentRoundId`: Regenerated for the new round
- `history`: Appended with a new `TransitionRecord`

## Transition Validation

The function validates that:
1. The session exists
2. The current state has transitions defined
3. The `transitionName` exists in the current state's transitions
4. The `toState` matches the transition's target

If validation fails, an error is thrown and no state change occurs.

## Error Cases

| Error | Cause |
|-------|-------|
| `Session not found` | Invalid sessionId |
| `No transitions available` | Current state has no transitions (terminal state) |
| `Invalid transition` | Transition name not found in current state |
| `State mismatch` | Provided toState doesn't match transition's target |
