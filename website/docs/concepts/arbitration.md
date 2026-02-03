---
sidebar_position: 5
---

# Arbitration

Consensus is evaluated by **Arbiter** specialists. Like proposers, voters, and tools, arbiters are implemented as pluggable strategies.

## Default Strategy: Weighted Ahead-by-K

The default arbiter uses a simple weighted vote comparison:

- LLMs begin with weight 0.0 (no autonomous authority)
- Humans begin with weight 1.0 (full authority)
- If a human votes, that decision wins immediately
- Otherwise, the leading proposal must be ahead by k weighted votes to reach consensus

## Risk Dial

The risk dial is a state-level configuration defined in the state machine's meta. It represents a **confidence threshold** for when the system is allowed to take a **fast lane** through the decision cycle.

It gates **how much of the decision cycle is "opened up"**:

- **Below threshold**: run the full proposal + voting cycle (safer, slower, more expensive)
- **Above threshold**: allow an **express lane** where a single trusted LLM ("champion") proposes, and that proposal is **immediately evaluated** with cheap guardrails

If guardrails trip (e.g. human override, deterministic check failures, repeated regressions, or other configured "suboptimal move" criteria), the dial effectively **snaps back** to full voting mode.

## Custom Arbiters

You can implement custom arbitration strategies by creating a strategy file:

```typescript
// strategies/my-session-type/arbiter.ts
export function myArbiter(input: ArbiterDecisionInput) {
  // Custom consensus logic
  return {
    consensusReached: boolean,
    winningProposalId?: string,
    reasoning: string
  };
}
```
