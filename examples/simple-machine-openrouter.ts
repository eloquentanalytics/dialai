#!/usr/bin/env npx tsx
/**
 * simple-machine-openrouter.ts
 *
 * Runs the "simple-task" state machine using OpenRouter LLMs for proposing
 * transitions and synthesizing consensus reasoning.
 *
 * Usage:
 *   OPENROUTER_API_TOKEN=sk-... npx tsx examples/simple-machine-openrouter.ts
 *
 * Optional env vars:
 *   OPENROUTER_MODEL - model to use (default: openai/gpt-4o-mini)
 */

import {
  createSession,
  submitProposal,
  evaluateConsensus,
  executeTransition,
  getSession,
} from "../src/dialai/index.js";
import type {
  MachineDefinition,
  Proposal,
} from "../src/dialai/index.js";
import { getCompletion } from "./get-completion-from-openai-compatible-endpoint.js";

const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

const machine: MachineDefinition = {
  machineName: "simple-task",
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

const NUM_PROPOSERS = 3;

function parseJsonResponse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      return JSON.parse(match[1].trim());
    }
    throw new Error(`Failed to parse JSON from LLM response: ${text}`);
  }
}

async function getAIProposal(
  proposerName: string,
  currentState: string,
  prompt: string,
  transitions: Record<string, string>
): Promise<{ transitionName: string; toState: string; reasoning: string }> {
  const transitionList = Object.entries(transitions)
    .map(([name, target]) => `"${name}" -> state "${target}"`)
    .join(", ");

  const response = await getCompletion(
    [
      {
        role: "system",
        content:
          `You are ${proposerName}, a specialist in a deliberation. ` +
          `Answer the question and choose a transition. ` +
          `Respond ONLY with JSON: {"transitionName": "<name>", "reasoning": "<your reasoning>"}`,
      },
      {
        role: "user",
        content:
          `Current state: "${currentState}"\n` +
          `Question: ${prompt}\n` +
          `Available transitions: ${transitionList}\n\n` +
          `Choose a transition and explain your reasoning.`,
      },
    ],
    { model }
  );

  const parsed = parseJsonResponse(response) as {
    transitionName: string;
    reasoning: string;
  };

  if (!transitions[parsed.transitionName]) {
    throw new Error(
      `AI proposed invalid transition "${parsed.transitionName}". ` +
        `Valid: ${Object.keys(transitions).join(", ")}`
    );
  }

  return {
    transitionName: parsed.transitionName,
    toState: transitions[parsed.transitionName],
    reasoning: parsed.reasoning,
  };
}

async function synthesizeReasoning(
  winningProposal: Proposal,
  allProposals: Proposal[]
): Promise<string> {
  const supportingReasoning = allProposals
    .filter((p) => p.transitionName === winningProposal.transitionName)
    .map((p) => `  ${p.specialistId}: ${p.reasoning}`)
    .join("\n");

  const response = await getCompletion(
    [
      {
        role: "system",
        content:
          "You are synthesizing a final reasoning for a state machine transition. " +
          "Based on the proposal reasoning and supporting proposer reasoning, " +
          "provide a concise synthesis explaining why this transition should occur. " +
          "Respond with plain text, no JSON.",
      },
      {
        role: "user",
        content:
          `Winning transition: "${winningProposal.transitionName}" -> ${winningProposal.toState}\n` +
          `Proposal reasoning: ${winningProposal.reasoning}\n\n` +
          `Supporting proposer reasoning:\n` +
          `${supportingReasoning || "  (no explicit support reasoning)"}\n\n` +
          `Synthesize the final reasoning for this transition.`,
      },
    ],
    { model }
  );

  return response.trim();
}

async function main(): Promise<void> {
  console.log("=== simple-machine-openrouter ===");
  console.log(`Model: ${model}`);
  console.log();

  const session = await createSession(machine);
  console.log(`Session:       ${session.sessionId}`);
  console.log(`Machine:       ${machine.machineName}`);
  console.log(`Initial state: ${session.currentState}`);
  console.log(`Goal state:    ${machine.defaultState}`);
  console.log();

  while (session.currentState !== machine.defaultState) {
    const stateConfig = machine.states[session.currentState];
    const prompt = stateConfig?.prompt ?? "";
    const transitions = stateConfig?.transitions ?? {};

    console.log(`--- State: "${session.currentState}" ---`);
    console.log(`Prompt: ${prompt}`);
    console.log();

    // Phase 1: Solicit proposals from AI proposers (in parallel)
    console.log("Phase 1: Soliciting proposals...");
    const aiProposals = await Promise.all(
      Array.from({ length: NUM_PROPOSERS }, (_, i) =>
        getAIProposal(
          `proposer-${i + 1}`,
          session.currentState,
          prompt,
          transitions
        )
      )
    );

    const proposalResults: Proposal[] = [];
    for (let i = 0; i < aiProposals.length; i++) {
      const ap = aiProposals[i];
      const proposal = await submitProposal(
        session.sessionId,
        `openrouter-proposer-${i + 1}`,
        ap.transitionName,
        ap.toState,
        ap.reasoning
      );
      proposalResults.push(proposal);
      console.log(
        `  Proposer ${i + 1}: "${ap.transitionName}" — ${ap.reasoning}`
      );
    }
    console.log();

    // Phase 2: Evaluate consensus
    console.log("Phase 2: Evaluating consensus...");
    const consensus = await evaluateConsensus(session.sessionId);
    console.log(
      `  Consensus: ${consensus.consensusReached ? "YES" : "NO"} — ${consensus.reasoning}`
    );

    if (!consensus.consensusReached || !consensus.winningProposalId) {
      throw new Error(`No consensus reached: ${consensus.reasoning}`);
    }

    const winningProposal = proposalResults.find(
      (p) => p.proposalId === consensus.winningProposalId
    );
    if (!winningProposal) {
      throw new Error("Winning proposal not found");
    }
    console.log(
      `  Winner: "${winningProposal.transitionName}" -> ${winningProposal.toState}`
    );
    console.log();

    // Phase 3: Synthesize reasoning from proposals
    console.log("Phase 3: Synthesizing reasoning...");
    const synthesizedReasoning = await synthesizeReasoning(
      winningProposal,
      proposalResults
    );
    console.log(`  Reasoning: ${synthesizedReasoning}`);
    console.log();

    // Phase 4: Execute transition with synthesized reasoning
    await executeTransition(
      session.sessionId,
      winningProposal.transitionName,
      winningProposal.toState,
      synthesizedReasoning
    );
    console.log(
      `Transitioned: "${winningProposal.transitionName}" -> "${winningProposal.toState}"`
    );
    console.log();
  }

  // Print final session summary
  const finalSession = await getSession(session.sessionId);
  console.log("=== Session Complete ===");
  console.log(`Final state: ${finalSession.currentState}`);
  console.log("Transitions:");
  for (const t of finalSession.history) {
    console.log(`  ${t.fromState} -> ${t.toState} (${t.transitionName})`);
    console.log(`    Reasoning: ${t.reasoning}`);
  }
}

main().catch((err: unknown) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
