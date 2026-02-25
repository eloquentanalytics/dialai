---
sidebar_position: 10
---

# `submitArbitration(opts): Promise<ArbitrationResult>`

Evaluates consensus and optionally executes the winning transition. Follows the same unified pattern as `submitProposal`: if the key decision parameter is omitted, the arbiter's strategy is invoked.

## Signature

```typescript
submitArbitration(opts: SubmitArbitrationOptions): Promise<ArbitrationResult>
```

**SubmitArbitrationOptions:**

```typescript
interface SubmitArbitrationOptions {
  sessionId: string;                      // Required: session to arbitrate
  roundId?: string;                       // Omit to use current round
  specialistId?: string;                  // Who is calling (required for override)
  transitionName?: string;                // Force this transition (human only)
  reasoning?: string;                     // Explanation
  metaJson?: Record<string, unknown>;     // Arbitrary metadata
  costUSD?: number;                       // Cost in USD
  latencyMsec?: number;                   // Time in milliseconds
  numInputTokens?: number;                // Input tokens
  numOutputTokens?: number;               // Output tokens
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `sessionId` | `string` | Yes | Session identifier |
| `roundId` | `string` | No | Associates arbitration with current state round; omit to use current round |
| `specialistId` | `string` | No | Who is calling; required when forcing a transition |
| `transitionName` | `string` | No | If provided, force this transition (requires human specialist) |
| `reasoning` | `string` | No | Explanation for the arbitration decision |
| `metaJson` | `object` | No | Arbitrary client metadata (opaque to DIAL) |
| `costUSD` | `number` | No | Cost in USD to generate this arbitration decision |
| `latencyMsec` | `number` | No | Time in milliseconds to generate this decision |
| `numInputTokens` | `number` | No | Number of input tokens used |
| `numOutputTokens` | `number` | No | Number of output tokens used |

## Behavior

- **Without `transitionName`**: Runs consensus guards → if consensus reached, executes winning transition
- **With `transitionName`**: Forces the transition immediately, but only if `specialistId` refers to a specialist registered with `isHuman: true`

This follows the same pattern as `submitProposal`:
- AI specialists (`isHuman: false`) must omit the key param to invoke their strategy
- Human specialists (`isHuman: true`) can provide explicit values

## Guards (Deterministic)

When checking for consensus (no `transitionName`), these guards are checked:

1. **Round ID match**: The provided `roundId` must match `session.currentRoundId`
2. **Proposal existence**: At least one proposal must exist for the current round
3. **Consensus threshold**: The leading transition's alignment-weighted margin must exceed the threshold (configurable per-state; `alignmentMargin` strategy defaults to `1` if none configured)

When forcing a transition (with `transitionName`):

1. **Round ID match**: The provided `roundId` must match `session.currentRoundId`
2. **Human required**: The `specialistId` must refer to a specialist registered with `isHuman: true`

If any guard fails, `guardsPass: false` and `executed: false` are returned with the reason.

## ArbitrationResult

```typescript
interface ArbitrationResult {
  arbitrationId: string;       // unique identifier for this arbitration
  sessionId: string;           // the session this arbitration is for
  roundId: string;             // the round this arbitration is for
  specialistId?: string;       // who called this arbitration
  stale: boolean;              // roundId mismatch
  guardsPass: boolean;         // all guards passed
  guardReason: string;         // explanation if guards failed
  winningProposalId?: string;  // the winning proposal (if consensus)
  transitionName?: string;     // the transition to execute
  toState?: string;            // the target state
  reasoning?: string;          // synthesized or provided reasoning
  executed: boolean;           // whether transition was executed
  isHuman: boolean;            // whether this was a human-forced decision
  metaJson?: Record<string, unknown>;
  costUSD?: number;            // cost in USD for this arbitration
  latencyMsec?: number;        // time in milliseconds
  numInputTokens?: number;     // input tokens used
  numOutputTokens?: number;    // output tokens used
}
```

## Examples

### Check for Consensus (Auto-Execute if Found)

Any specialist (AI or human) can check for consensus:

```typescript
import { submitArbitration } from "dialai";

const result = await submitArbitration({
  sessionId: session.sessionId,
  roundId: session.currentRoundId,
});

if (result.executed) {
  console.log("Transitioned to:", result.toState);
} else if (result.stale) {
  console.log("Round ID mismatch - decision cycle already completed");
} else {
  console.log("No consensus yet:", result.guardReason);
}
```

### Human Override (Force Transition)

Only a human specialist can force a transition when consensus isn't reached:

```typescript
import { submitArbitration } from "dialai";

// Human decides to approve, bypassing normal consensus
const result = await submitArbitration({
  sessionId: session.sessionId,
  roundId: session.currentRoundId,
  specialistId: "human-reviewer",  // must be registered with isHuman: true
  transitionName: "approve",
  reasoning: "Reviewed and approved by manager",
  metaJson: { approvedBy: "jane@example.com" },
});

console.log(result.executed); // true
```

If an AI specialist tries to force a transition, it is rejected:

```typescript
// This will fail - AI cannot force arbitration
const result = await submitArbitration({
  sessionId: session.sessionId,
  roundId: session.currentRoundId,
  specialistId: "ai-specialist",  // not registered with isHuman: true
  transitionName: "approve",
  reasoning: "I think we should approve",
});

console.log(result.executed);   // false
console.log(result.guardReason); // "Only human specialists can force arbitration"
```

### After Each Proposal

```typescript
import { submitProposal, submitArbitration } from "dialai";

// Submit proposals
const proposal1 = await submitProposal({
  sessionId: session.sessionId,
  specialistId: "ai-proposer-1",
  roundId: session.currentRoundId,
});

// Check if consensus reached
let result = await submitArbitration({ sessionId: session.sessionId, roundId: session.currentRoundId });
if (result.executed) return;

const proposal2 = await submitProposal({
  sessionId: session.sessionId,
  specialistId: "ai-proposer-2",
  roundId: session.currentRoundId,
});

// Check again
result = await submitArbitration({ sessionId: session.sessionId, roundId: session.currentRoundId });
if (result.executed) return;

// No consensus - wait for human to decide
// Human can call: submitArbitration({ sessionId, roundId, specialistId: "human-reviewer", transitionName: "approve", reasoning: "reason" })
```
