---
sidebar_position: 11
---

# `evaluateConsensus(sessionId): Promise<ConsensusResult>`

Evaluates whether consensus has been reached for a session without executing any transition. This is a read-only operation that checks the current state of proposals.

## CLI Usage

Check consensus state programmatically after proposals have been submitted:

```typescript
import { createSession, registerProposer, registerArbiter, submitProposal, evaluateConsensus } from "dialai";

// Setup
const session = await createSession(machine);
await registerProposer({ specialistId: "p1", machineName: machine.machineName, strategyFnName: "firstAvailable" });
await registerProposer({ specialistId: "p2", machineName: machine.machineName, strategyFnName: "random" });
await registerArbiter({ specialistId: "arbiter", machineName: machine.machineName, strategyFnName: "alignmentMargin", threshold: 1 });

// Submit proposals
const propA = await submitProposal({ sessionId: session.sessionId, specialistId: "p1" });
const propB = await submitProposal({ sessionId: session.sessionId, specialistId: "p2" });

// Check consensus (read-only)
const result = await evaluateConsensus(session.sessionId);
console.log(result);
```

## Expected Output

```typescript
{
  consensusReached: true,
  winningProposalId: "abc123-...",
  reasoning: "Proposal ahead by 1 (threshold: 1)"
}
```

Or if no consensus:

```typescript
{
  consensusReached: false,
  winningProposalId: undefined,
  reasoning: "Lead of 0 below threshold 1"
}
```

## What Happened

1. The function gathered all proposals for the current round
2. The registered arbiter's strategy counted proposals per transition
3. The result indicates whether consensus was reached, without modifying any state

## Programmatic Usage

```typescript
import { evaluateConsensus } from "dialai";

const result = await evaluateConsensus(session.sessionId);

if (result.consensusReached) {
  console.log("Winner:", result.winningProposalId);
  // Optionally execute the transition
  await submitArbitration({ sessionId: session.sessionId, roundId: session.currentRoundId });
} else {
  console.log("No consensus yet:", result.reasoning);
  // Request more proposals or wait for human
}
```

## Parameters

| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session identifier |

## Return Value

Returns a `ConsensusResult` object:

```typescript
interface ConsensusResult {
  consensusReached: boolean;      // Whether consensus was achieved
  winningProposalId?: string;     // ID of the winning proposal (if consensus)
  reasoning: string;              // Explanation of the result
}
```

See [ConsensusResult](./types.md#consensusresult) for the complete type definition.

## Difference from submitArbitration

| Function | Behavior |
|----------|----------|
| `evaluateConsensus` | Read-only check. Returns consensus status without side effects. |
| `submitArbitration` | Check + execute. Evaluates consensus and executes the transition if consensus is reached. |

Use `evaluateConsensus` when you want to:
- Check consensus status without executing
- Implement custom logic before deciding to execute
- Poll for consensus in a loop
- Display consensus status to users

Use `submitArbitration` when you want to:
- Evaluate and execute in a single atomic operation
- Let the system handle transition execution
- Track arbitration decisions with cost/latency metadata

## Error Cases

| Error | Cause |
|-------|-------|
| `Session not found` | Invalid sessionId |
| `No arbiter registered` | No arbiter is registered for this machine |
