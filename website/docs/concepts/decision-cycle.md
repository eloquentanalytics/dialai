---
sidebar_position: 4
---

# Decision Cycle

When a session is not in its default state, the system progresses through a repeating cycle until it reaches the goal.

## Asynchronous by Design

The decision cycle is **asynchronous**: proposals and votes arrive in an uncontrolled, unbound manner. There is no defined order or timing—specialists submit their contributions whenever they're ready. The cycle concludes once consensus is reached, but proposals and votes may continue to arrive afterward (they are simply ignored for the completed cycle).

This design accommodates:
- **Heterogeneous response times**: Fast AI models respond in seconds; humans may take hours or days
- **Distributed specialists**: Webhook-based specialists may be across networks with variable latency
- **Late arrivals**: A slow specialist's contribution doesn't block progress if consensus forms first

## The Cycle

### 1. Proposal Collection

Proposals arrive asynchronously from registered proposers for the session's machine. Each proposer's strategy function is invoked with the current state and available transitions, and the resulting proposal is submitted. Proposals may arrive at any time and in any order. Each proposal includes:
- The proposed transition name
- The target state
- Reasoning for the proposal

### 2. Vote Collection

Votes arrive asynchronously as voters evaluate proposals. With multiple proposals, voters compare pairwise using Swiss tournament pairing. Each voter's strategy function is called, and the resulting vote is submitted. Votes may arrive at any time and in any order. See [Arbitration](./arbitration.md) for pairing and early-stopping details.

### 3. Arbitration (Continuous)

After each proposal and vote, `evaluateConsensus` checks whether any proposal has sufficient support. This is not a one-time evaluation—it runs continuously as new contributions arrive. Consensus requires demonstrated support through voting; a single proposal does not automatically win. See [Arbitration](./arbitration.md) for the full rules.

### 4. Transition Execution

If consensus is reached, the winning proposal's transition executes. The session's `currentState` is updated, and all proposals and votes for that session are cleared for the next cycle.

The cycle repeats until the session reaches its `defaultState`.

## The Engine

The `runSession` function automates the full cycle:

```typescript
import { runSession } from "dialai";
import type { MachineDefinition } from "dialai";

const machine: MachineDefinition = {
  machineName: "my-task",
  initialState: "pending",
  defaultState: "done",
  states: {
    pending: {
      prompt: "Should we complete this task?",
      transitions: { complete: "done" },
    },
    done: {},
  },
};

const session = await runSession(machine);
// session.currentState === "done"
```

`runSession` automatically:
1. Creates a session
2. Registers a built-in deterministic proposer (picks the first available transition)
3. Loops: collect proposals → collect votes (if needed) → evaluate consensus → execute transition
4. Returns the completed session

## Error Handling

- If no transitions are available from the current state, the built-in proposer throws
- If consensus cannot be reached (e.g., tied votes with insufficient margin), human input is required—this signals that the decision needs human judgment or that specialists need additional training
- If the winning proposal's transition is invalid, `executeTransition` throws
