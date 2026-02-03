---
sidebar_position: 4
---

# Decision Cycle

When a session is not in its default state and no Tool specialist is registered for the current state, the system progresses through a repeating cycle.

## The Five Phases

### 1. Proposal Solicitation

Ask proposers what transition should happen next. The system solicits proposals from all registered proposers for the current state.

### 2. Proposal Submission

Proposers submit their recommendations with reasoning. Each proposal includes:
- The proposed transition name
- The target state name
- Parameters for the target state
- Reasoning for the proposal

### 3. Vote Solicitation

Voters compare pairs of proposals. The system generates pairwise comparisons and solicits votes from all registered voters.

### 4. Arbitration

Arbiters aggregate votes to determine if a proposal has sufficient support. The default arbiter uses weighted voting:
- LLMs begin with weight 0.0 (no autonomous authority)
- Humans begin with weight 1.0 (full authority)
- If a human votes, that decision wins immediately
- Otherwise, the leading proposal must be ahead by k weighted votes to reach consensus

### 5. Transition Execution

If consensus is reached, execute the winning proposal's transition. The cycle repeats until the session returns to its default state.

## Fast Path (Express Lane)

If the risk dial crosses a confidence threshold, the system can temporarily enter an **express lane** where it:
- Selects one trusted LLM specialist (a "champion") to submit the proposal
- Skips broad proposal solicitation
- Immediately evaluates the champion proposal with cheap guardrails

If the champion makes a suboptimal move, the system drops back into the full (slower, more expensive) proposal + voting mode until confidence is rebuilt.
