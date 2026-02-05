---
sidebar_position: 4
---

# Decision Cycle

When a session is not in its default state, the system progresses through a repeating cycle until it reaches the goal.

## The Cycle

### 1. Proposal Solicitation

The engine solicits proposals from all registered proposers for the session's type. Each proposer's strategy function is called with the current state and available transitions.

### 2. Proposal Submission

Proposers submit their recommendations. Each proposal includes:
- The proposed transition name
- The target state
- Reasoning for the proposal

### 3. Vote Solicitation

If there are 2 or more proposals, voters compare them pairwise using Swiss tournament pairing. Rather than exhaustively comparing every possible pair, the system pairs proposals with similar accumulated support first (where the comparison is most informative), round-robins through available voters, and checks for consensus after each vote. Voting stops as soon as a proposal crosses the ahead-by-k consensus threshold — remaining pairs are never evaluated. The full O(N²) pairwise comparison is the theoretical worst case; in practice, consensus typically resolves well before it.

### 4. Arbitration

The built-in `evaluateConsensus` function aggregates votes to determine if a proposal has sufficient support:

- **0 proposals** — No consensus
- **1 proposal** — Auto-consensus (single proposal wins immediately)
- **2+ proposals** — Human votes override; otherwise vote tallying with ahead-by-k threshold (k=1)

### 5. Transition Execution

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

const session = runSession(machine);
// session.currentState === "done"
```

`runSession` automatically:
1. Creates a session
2. Registers a built-in deterministic proposer (picks the first available transition)
3. Loops: solicit proposals → solicit votes (if needed) → evaluate consensus → execute transition
4. Returns the completed session

## Error Handling

- If no transitions are available from the current state, the built-in proposer throws
- If consensus cannot be reached (e.g., tied votes with insufficient margin), the engine throws
- If the winning proposal's transition is invalid, `executeTransition` throws
