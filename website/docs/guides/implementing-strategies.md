---
sidebar_position: 3
---

# Implementing Strategies

Strategies are pluggable implementations for specialist roles. They are loaded from `./strategies/{sessionTypeName}/{strategyFunctionKey}.ts`.

## Proposer Strategy

A proposer strategy receives the decision prompt, event stream, and model ID, and returns a proposal:

```typescript
import type { ProposalDecisionInput, SubmitProposalCommand } from "dialai";

export async function myProposer(
  input: ProposalDecisionInput
): Promise<SubmitProposalCommand> {
  const { prompt, eventStream, modelId } = input;

  // Your logic here to generate a proposal
  // Call LLM, analyze state, etc.

  return {
    transitionName: "next",
    toStateName: "working",
    toParamsJSONString: JSON.stringify({ step: 1 }),
    reasoning: "Based on the current state, I propose moving to working state.",
    costUSD: 0.001,
    latencyMsec: 150,
    numInputTokens: 100,
    numOutputTokens: 50
  };
}
```

## Voter Strategy

A voter strategy compares two proposals:

```typescript
import type { VoteDecisionInput, SubmitVoteCommand } from "dialai";

export async function myVoter(
  input: VoteDecisionInput
): Promise<SubmitVoteCommand> {
  const { prompt, eventStream, proposalA, proposalB, modelId } = input;

  // Your logic to compare proposals

  return {
    voteFor: "A", // or "B", "BOTH", "NEITHER"
    reasoning: "Proposal A better aligns with the decision criteria.",
    costUSD: 0.0005,
    latencyMsec: 100,
    numInputTokens: 200,
    numOutputTokens: 30
  };
}
```

## Arbiter Strategy

An arbiter strategy evaluates consensus:

```typescript
import type { ArbiterDecisionInput } from "dialai";

export function myArbiter(
  input: ArbiterDecisionInput
): {
  consensusReached: boolean;
  winningProposalId?: string;
  reasoning: string;
} {
  const { proposals, votes, riskDial } = input;

  // Your consensus logic here

  return {
    consensusReached: true,
    winningProposalId: proposals[0].proposalId,
    reasoning: "Proposal has sufficient weighted support."
  };
}
```
