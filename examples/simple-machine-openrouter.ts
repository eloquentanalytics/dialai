#!/usr/bin/env npx tsx
/**
 * simple-machine-openrouter.ts
 *
 * Runs the same "is 2 > 1?" state machine as simple-machine.json,
 * but uses OpenRouter LLMs for proposing transitions, voting, and
 * synthesizing arbiter reasoning.
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
  submitVote,
  evaluateConsensus,
  executeTransition,
  getSession,
} from "../src/dialai/index.js";
import type {
  MachineDefinition,
  Proposal,
  VoteChoice,
} from "../src/dialai/index.js";
import { getCompletion } from "./get-completion-from-openai-compatible-endpoint.js";

const model = process.env.OPENROUTER_MODEL ?? "openai/gpt-4o-mini";

const machine: MachineDefinition = {
  sessionTypeName: "is-two-greater",
  initialState: "unsure",
  defaultState: "sure",
  states: {
    unsure: {
      prompt: "Is 2 > 1?",
      transitions: { yes: "sure", no: "sure" },
    },
    sure: {},
  },
};

const NUM_PROPOSERS = 2;
const NUM_VOTERS = 3;

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

async function getAIVote(
  voterName: string,
  proposalA: Proposal,
  proposalB: Proposal
): Promise<{ voteFor: VoteChoice; reasoning: string }> {
  const response = await getCompletion(
    [
      {
        role: "system",
        content:
          `You are ${voterName}, a voter in a deliberation. ` +
          `Choose between two proposals. ` +
          `Respond ONLY with JSON: {"voteFor": "A" or "B" or "BOTH" or "NEITHER", "reasoning": "<why>"}`,
      },
      {
        role: "user",
        content:
          `Proposal A: transition "${proposalA.transitionName}" -> ${proposalA.toState}\n` +
          `  Reasoning: ${proposalA.reasoning}\n\n` +
          `Proposal B: transition "${proposalB.transitionName}" -> ${proposalB.toState}\n` +
          `  Reasoning: ${proposalB.reasoning}\n\n` +
          `Which proposal do you prefer and why?`,
      },
    ],
    { model }
  );

  const parsed = parseJsonResponse(response) as {
    voteFor: VoteChoice;
    reasoning: string;
  };

  const validChoices: string[] = ["A", "B", "BOTH", "NEITHER"];
  if (!validChoices.includes(parsed.voteFor)) {
    throw new Error(`AI returned invalid vote choice: ${parsed.voteFor}`);
  }

  return { voteFor: parsed.voteFor, reasoning: parsed.reasoning };
}

interface VoteRecord {
  voterName: string;
  proposalIdA: string;
  proposalIdB: string;
  voteFor: VoteChoice;
  reasoning: string;
}

async function synthesizeArbiterReasoning(
  winningProposal: Proposal,
  voteRecords: VoteRecord[]
): Promise<string> {
  const supportingReasoning = voteRecords
    .filter((v) => {
      if (v.voteFor === "A" && v.proposalIdA === winningProposal.proposalId)
        return true;
      if (v.voteFor === "B" && v.proposalIdB === winningProposal.proposalId)
        return true;
      if (v.voteFor === "BOTH") return true;
      return false;
    })
    .map((v) => `  ${v.voterName}: ${v.reasoning}`)
    .join("\n");

  const response = await getCompletion(
    [
      {
        role: "system",
        content:
          "You are an arbiter synthesizing a final reasoning for a state machine transition. " +
          "Based on the proposal reasoning and supporting voter reasoning, " +
          "provide a concise synthesis explaining why this transition should occur. " +
          "Respond with plain text, no JSON.",
      },
      {
        role: "user",
        content:
          `Winning transition: "${winningProposal.transitionName}" -> ${winningProposal.toState}\n` +
          `Proposal reasoning: ${winningProposal.reasoning}\n\n` +
          `Supporting voter reasoning:\n` +
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

  const session = createSession(machine);
  console.log(`Session:       ${session.sessionId}`);
  console.log(`Machine:       ${machine.sessionTypeName}`);
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
      const proposal = submitProposal(
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

    // Phase 2: Solicit votes from AI voters (if 2+ proposals, in parallel)
    const allVoteRecords: VoteRecord[] = [];
    if (proposalResults.length >= 2) {
      console.log("Phase 2: Soliciting votes...");

      const voteTasks: Array<{
        promise: Promise<{ voteFor: VoteChoice; reasoning: string }>;
        voterName: string;
        proposalIdA: string;
        proposalIdB: string;
      }> = [];

      for (let i = 0; i < proposalResults.length; i++) {
        for (let j = i + 1; j < proposalResults.length; j++) {
          for (let v = 0; v < NUM_VOTERS; v++) {
            const voterName = `voter-${v + 1}`;
            voteTasks.push({
              promise: getAIVote(
                voterName,
                proposalResults[i],
                proposalResults[j]
              ),
              voterName,
              proposalIdA: proposalResults[i].proposalId,
              proposalIdB: proposalResults[j].proposalId,
            });
          }
        }
      }

      const voteResults = await Promise.all(
        voteTasks.map((vt) => vt.promise)
      );

      for (let k = 0; k < voteResults.length; k++) {
        const vr = voteResults[k];
        const vt = voteTasks[k];

        submitVote(
          session.sessionId,
          `openrouter-${vt.voterName}`,
          vt.proposalIdA,
          vt.proposalIdB,
          vr.voteFor,
          vr.reasoning
        );

        allVoteRecords.push({
          voterName: vt.voterName,
          proposalIdA: vt.proposalIdA,
          proposalIdB: vt.proposalIdB,
          voteFor: vr.voteFor,
          reasoning: vr.reasoning,
        });

        console.log(`  ${vt.voterName}: ${vr.voteFor} — ${vr.reasoning}`);
      }
      console.log();
    }

    // Phase 3: Evaluate consensus
    console.log("Phase 3: Evaluating consensus...");
    const consensus = evaluateConsensus(session.sessionId);
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

    // Phase 4: Arbiter synthesizes reasoning from proposal + supporting votes
    console.log("Phase 4: Arbiter synthesizing reasoning...");
    const arbiterReasoning = await synthesizeArbiterReasoning(
      winningProposal,
      allVoteRecords
    );
    console.log(`  Arbiter: ${arbiterReasoning}`);
    console.log();

    // Phase 5: Execute transition with arbiter reasoning
    executeTransition(
      session.sessionId,
      winningProposal.transitionName,
      winningProposal.toState,
      arbiterReasoning
    );
    console.log(
      `Transitioned: "${winningProposal.transitionName}" -> "${winningProposal.toState}"`
    );
    console.log();
  }

  // Print final session summary
  const finalSession = getSession(session.sessionId);
  console.log("=== Session Complete ===");
  console.log(`Final state: ${finalSession.currentState}`);
  console.log("Transitions:");
  for (const t of finalSession.history) {
    console.log(`  ${t.fromState} -> ${t.toState} (${t.transitionName})`);
    console.log(`    Reasoning: ${t.reasoning}`);
  }
}

main().catch((err) => {
  console.error("Error:", err instanceof Error ? err.message : err);
  process.exit(1);
});
