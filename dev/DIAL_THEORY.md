# DIAL Theory — Paper Outline

**Working Title:** Progressive Collapse of Multi-Agent Deliberation into Deterministic Execution through Human-Aligned Trust Calibration

---

## Introduction

- The problem: given any task modeled as a state machine, how do you know — in dollars, time, and quality — exactly what it would cost to turn that task over to AI? And how involved should humans remain as ongoing quality control?
- DIAL (Dynamic Integration between AI and Labor) — a coordination framework that starts from a deliberately pessimistic assumption: **AI has no role.** The default assumption is that the task is too difficult for AI and only humans can navigate it. DIAL then provides the mechanism to prove otherwise, one decision at a time.
- DIAL rests on a foundational axiom: **the human is always right.** Not because humans are infallible, but because AI models are created by humans, trained on human works, and operate within narrower context windows than humans have access to. An AI specialist cannot be "better" than a human at a decision, because the human has context — about the world, the situation, the goals — that the AI does not and cannot access. AI is faster and cheaper at narrower tasks requiring smaller context. DIAL leverages that asymmetry.
- The central claim: over repeated decision cycles, measuring how well AI predicts human choices causes the multi-agent deliberation structure to progressively collapse into deterministic execution. This collapse is emergent, not designed. The "dial" is the set of risk-based thresholds governing this collapse — how much demonstrated human-alignment is required before the system acts autonomously. Along the way, the system accumulates precise data on the cost (dollars, latency, token usage) and quality (alignment rate) of AI participation at every decision point.
- DIAL is therefore a framework for answering the question: for this specific task, at this specific decision point, what is the minimally competent AI configuration that produces human-equivalent decisions, what does it cost, and how much ongoing human involvement is needed to maintain quality?
- Contributions: (1) A formal model of progressive autonomy grounded in human primacy and a pessimistic default. (2) Characterization of the collapse phenomenon and its formal properties. (3) A cost/quality framework for AI delegation decisions. (4) Connection to existing theory in mechanism design, repeated games, information theory, and category theory.

## The Human Primacy Axiom

- **The pessimistic default.** DIAL begins by assuming AI will have no role. The system is designed to work entirely with human decisions. AI participation is not assumed; it must be earned.
- **Axiom: Human decisions are the ground truth of the system.** This is not a claim about optimality in any external sense. It is a design commitment rooted in the structural relationship between AI and human cognition.
- AI models are derivative works. They are created by humans, trained on human-generated data, and their capabilities are a compressed subset of human capability. An AI model operates on a bounded context window — thousands or millions of tokens. A human operates on a lifetime of embodied experience, tacit knowledge, institutional context, and real-time sensory input that no model has access to.
- Because the AI's context is strictly narrower than the human's, the AI cannot reliably determine when the human is "wrong." What looks like a human error from the AI's limited vantage point may reflect context the AI simply doesn't have. It is always safer for the AI to assume the human had reasons, just as it is safer for a child to defer to a parent — not because the parent is infallible, but because the parent has context the child cannot access.
- **Implication for AI behavior:** An AI specialist in DIAL should choose what the human would choose, even if its own reasoning disagrees. It will be judged on alignment with the human, and that judgment is correct, because the human's broader context makes the human's decision the more reliable one.
- **When humans disagree:** If the human is always right, and there are multiple humans, then disagreeing humans are both right — relative to an AI. The AI has no standing to break the tie. Human disagreement is resolved by human mechanisms (negotiation, authority, voting among humans). The AI's role is to predict what the humans would collectively choose, not to adjudicate between them.
- **The value proposition of AI is not superiority but efficiency.** AI is faster and cheaper at narrow tasks where the required context fits within the model's window. DIAL's purpose is to discover, empirically and with precise cost data, which decisions are narrow enough for AI to handle — and what the ongoing human quality-control cost is to maintain that delegation over time.

## Setting and Definitions

- Sessions as finite state machines with a default state.
- Drift: the system is not in its default state and must act.
- Specialists: proposers — human or AI. Each proposal endorses a transition. Arbitration is built-in via `evaluateConsensus`.
- Alignment score: a per-specialist, per-state measure of how often the specialist's choice matches the human's choice. Starts at 0% (no data). Rises with demonstrated alignment.
- The risk dial r in [0,1]: a state-level parameter that governs how much demonstrated alignment is required before the system acts autonomously.
- The alignment score measures demonstrated ability to predict the human's choice. It is not a measure of task competence — it is a measure of human-alignment under the axiom that the human's choice is the correct one.

## The Search Space: From Combinatorial Explosion to Tractable Optimization

- **The naive formulation.** The most unoptimized version of the question "which AI can do this task?" is a combinatorial explosion. Cross every possible model with every possible prompt, generate exponentially more pairwise comparisons, then compare all of that to the human choice. This is intractable — but it is the honest worst case, and DIAL's design started by staring at it directly.
- **The tractable reduction.** DIAL reduces the explosion to a manageable search by constraining two axes:
  - Not every possible model, but a **handful that span the range of cost, quality, and latency** — from cheap/fast/small to expensive/slow/large. This covers the cost-quality frontier without exhaustive enumeration.
  - Not every possible prompt, but a **best-first-pass prompt per state** — the decision prompt lives in the state machine's metadata, shared by all specialists for that state.
- **Four optimization dimensions.** Once the initial specialist pool is running and generating alignment data against human choices, there are four dimensions along which the system can be optimized:
  - **Strategy (context management).** Adjusting the logic of individual specialists to tune how session history and instructions are assembled into the context window. Two specialists using the same model and prompt can produce different proposals if one includes the full event stream while the other summarizes recent moves. The strategy controls what the model sees.
  - **Model mix.** Adjusting which models are present in the specialist pool. Removing models that consistently fail to predict the human. Adding new models that might perform better at specific states. The pool evolves.
  - **Prompt iteration.** Iterating on the prompt each specialist uses for a given state. The initial best-first-pass prompt may be refined based on observed failure modes — cases where the specialist diverged from the human because the prompt didn't convey the right decision criteria.
  - **Fine-tuning.** Training new models specialized to a particular state or set of states, using the accumulated history of human decisions as training data. This is the most expensive optimization but produces specialists that are purpose-built for a narrow decision.
- **What a specialist is.** A specialist is the unique combination of these three things: (1) its **strategy** — how it manages context, selecting and formatting what goes into the model's window; (2) its **prompt** — the instructions for making the decision; and (3) its **model parameters** — the specific model, temperature, and token limits. Changing any of these produces a different specialist, because it changes the function from state to proposed transition.
- **The specialist ID encodes this.** In the implementation, specialist IDs encode the model identity (e.g., `specialist.hanoi.proposer.nvidia_nemotron-3-nano-30b-a3b_free`), and the strategy and prompt are resolved from the session type and state. This makes each specialist a traceable, comparable unit of AI decision-making with known cost and alignment characteristics.
- **DIAL as a search over this space.** The full DIAL process — register specialists, run decision cycles, measure alignment, adjust strategies/prompts/models — is a search over the specialist configuration space for the minimally competent, minimally expensive configuration that produces human-equivalent decisions at each state. The combinatorial explosion is tamed by starting with a sparse sample and optimizing iteratively, guided by empirical human-alignment data.

### Five Dimensions of Optimization

Once the initial specialist pool is running and generating alignment data, there are five dimensions along which the system can be optimized. The first four operate within the existing state machine structure. The fifth modifies the structure itself.

**1. Strategy (context management).** Adjusting how session history, exemplars, and instructions are assembled into the context window. Two specialists using the same model and prompt can produce different proposals if one includes the full event stream while the other summarizes recent moves. The strategy controls what the model sees.

**2. Model mix.** Adjusting which models are present in the specialist pool. Removing models that consistently fail to predict the human. Adding new models that might perform better at specific states. The pool evolves.

**3. Prompt iteration.** Iterating on the prompt each specialist uses for a given state. The initial prompt may be refined based on observed failure modes — cases where the specialist diverged from the human because the prompt didn't convey the right decision criteria. Prompt iteration is informed by the **counseling pattern** (see below).

**4. Fine-tuning.** Training new models specialized to a particular state, using the accumulated exemplar corpus as training data. The most expensive optimization, but it produces specialists purpose-built for a narrow decision.

**5. Task decomposition.** Splitting a complex state into two or more simpler sequential states. This modifies the state machine itself and is the mechanism by which DIAL achieves its "nirvana state": every step decomposed to the point where a minimally competent model (e.g., Llama 7B) can handle it with demonstrated human alignment.

Task decomposition is triggered by alignment data: when a specialist's proposals diverge from human choices at a particular state, analysis of the divergence may reveal that the state encodes two distinct decisions that the specialist conflates. Splitting the state lets each sub-decision be addressed independently, and each sub-decision may be simple enough for a cheaper model to handle.

The five dimensions interact. Decomposition creates new states that need new prompts (dimension 3), which may benefit from different models (dimension 2) with different context strategies (dimension 1). Fine-tuning (dimension 4) is most effective after decomposition has simplified each state's decision space.

### The Counseling Pattern

Prompt iteration (dimension 3) is driven by a concrete process: the **counseling pattern**. After sufficient alignment data has accumulated for a specialist at a state:

1. **Presentation**: The specialist is shown its proposals alongside the exemplars — the human's actual choices in the same situations.
2. **Reflection**: The specialist is asked to analyze *why* it diverged. What context was it missing? What criteria did it misweigh? What did the human appear to know that the specialist didn't?
3. **Prompt refinement**: The specialist's reflections, combined with the exemplar evidence, are used to revise the decision prompt. The revision adds the decision criteria the specialist was missing or clarifies the criteria it misapplied.
4. **Validation**: The revised prompt is tested against the historical exemplar corpus. Does the specialist now predict the human's choices more accurately with the new prompt?

The counseling pattern is iterative. Each round of reflection and revision produces a better prompt, which produces better alignment, which produces more informative exemplars when humans next participate. The pattern converges when the prompt is sufficient for the specialist's context window to consistently predict the human's choice.

This is not "prompt engineering by hand." The counseling pattern is structured, data-driven, and can be partially automated — the reflection step itself can be performed by an LLM analyzing the divergence between specialist proposals and human exemplars.

## The Decision Cycle

- Three phases: proposal solicitation, consensus check (ahead-by-k), execution.
- Each proposal endorses a transition. The arbiter counts proposals per transition and checks if the leading transition is ahead by k endorsements. Consensus is checked after each arriving proposal. If the ahead-by-k threshold is met, the cycle stops — remaining solicitations are unnecessary.
- The ahead-by-k consensus: how proposal endorsements accumulate, how the risk dial governs the autonomy threshold.
- Human proposals as immediate consensus triggers — because the human is always right. A human proposal always wins.
- The cycle as a repeated process that generates observable data about how well each AI specialist predicts the human.

### Semantic Isolation: What the LLM Actually Sees

The LLM specialist is deliberately isolated from the framework's orchestration semantics. It does not know it is in DIAL. It does not know it is a "proposer" in a multi-agent system. Its context window contains:

1. **History** — A flat sequence of (transition name, metaJSON, reasoning) tuples representing the session's prior moves. This is presented as domain-native narrative: "here is what has happened so far." The specialist sees decisions and their outcomes, not the internal deliberation mechanics.

2. **Exemplars** — Past decisions from this or similar sessions where a human's choice is known. Presented as: "in a similar situation, this was decided." Not: "another specialist proposed this." The exemplar is (context, human-chosen transition), framed as domain precedent.

3. **Available transitions** — Presented as tool definitions. The tool name is the transition name. The tool arguments schema defines the metaJSON structure (structured state description) and the reasoning field (natural language justification).

4. **The decision prompt** — Domain-specific criteria for this state, written in terms the specialist can apply directly.

The specialist's **output** is a tool call: the tool name is the chosen transition, and the arguments contain the metaJSON (a structured description of the resulting state — "what the world looks like after this move") and the reasoning (natural language justification — "why this is the right choice").

This semantic isolation is a deliberate design choice with three consequences:

- **The specialist reasons about the domain, not the framework.** It evaluates game states, document qualities, ticket severities — whatever the task is. It never reasons about "proposers," "consensus," or "endorsements."
- **Exemplars appear as domain precedent, not as system artifacts.** "In this situation, the decision was X" — not "a human specialist overrode the system and selected X." The learning signal is clean.
- **The framework is fully substitutable.** Because the LLM has no coupling to DIAL's mechanics, the same prompt and context assembly can be used with any orchestration layer. DIAL's value is in the measurement, not in the LLM's awareness of it.

## Exemplars and the Data Flywheel

### What an Exemplar Is

An **exemplar** is created every time a human forces a decision. It captures three things:

1. **The full context** that was available to proposers at the moment of the decision — session history, state params, decision prompt, any contextual data the specialists had access to.
2. **The human's chosen transition** — the transition name, the metaJSON (structured state description), and the reasoning.
3. **All specialist proposals from that round** — what each specialist proposed, enabling direct comparison between each specialist's output and the human's actual choice.

An exemplar is the atomic unit of ground truth in DIAL. It answers the question: "given this situation, what did the human do?"

### How Exemplars Are Used

Exemplars serve three distinct purposes, each operating at a different timescale:

**1. Few-shot learning (immediate).** When a specialist is solicited for a proposal, relevant exemplars are included in its context window as domain precedent. The framing is: "In this situation, the decision was X. In that situation, the decision was Y. We are now in this situation. What is the decision?" The specialist sees exemplars as a sequence of (situation, decision) pairs — prior art in the domain, not artifacts of a framework.

The selection of which exemplars to include is part of the specialist's **strategy** (context management). A strategy might include the 5 most recent exemplars for this state, or the 3 most semantically similar exemplars across all states, or exemplars that demonstrate the edge cases where specialists previously diverged from humans.

**2. Evaluation (per-round).** After each round where a human participates, every specialist's proposal is scored against the exemplar. How semantically close was the specialist's reasoning to the human's reasoning? Did the specialist choose the same transition? Did the specialist's metaJSON match the human's structured state description? These alignment scores feed alignment measurement.

**3. Fine-tuning data (periodic).** The accumulated exemplar corpus is training data for purpose-built models. A fine-tuned model trained on exemplars from a specific state is a specialist that has been optimized, at the model level, to predict what humans choose at that decision point.

### The Flywheel

Exemplars create a positive feedback loop:

1. Humans participate and create exemplars.
2. Exemplars improve specialist context (few-shot learning).
3. Better context improves specialist alignment.
4. Higher alignment means fewer rounds require human participation.
5. When humans do participate, the exemplars are more informative (they capture the cases specialists got wrong).
6. These harder exemplars produce specialists that handle edge cases better.

The flywheel's equilibrium is the point where the specialist's few-shot-augmented predictions are indistinguishable from the human's choices for the accessible decision space. Decisions that resist this convergence — where the human's broader context is essential — are exactly the decisions that should remain with humans.

### Exemplar Quality

Not all exemplars are equally valuable. A human's forced decision at a state where all specialists agreed is less informative than a forced decision where specialists diverged. The most valuable exemplars are the ones that reveal the gap between what the specialist can infer from its context and what the human knows from theirs. Over time, as easy cases are handled by specialists and hard cases are surfaced to humans, the exemplar corpus naturally concentrates around the boundary of AI capability at each state.

## The Probability Field over Human Choices

- At each decision point, proposals define a discrete distribution over candidate transitions.
- The field is oriented toward what the human would choose. There is no separate "correct" answer — the human's choice is the correct answer, by axiom.
- Proposal endorsements concentrate mass: each proposal is evidence about which transition the human would endorse.
- The risk dial governs how much the system trusts AI-generated evidence about the human's likely choice.
- Support function S(p_i) and the consensus condition S(p_i) - max S(p_j) >= k.
- At r=0: only human evidence counts (the system has no confidence in predicting the human). At r=1: AI evidence counts fully (the system trusts that high-alignment AI specialists predict the human reliably).

## Alignment Measurement: Learning to Predict the Human

- After rounds with human participation, the system measures each specialist's alignment.
- Alignment score = matching choices / total comparisons with human. A specialist that agrees with the human 90% of the time has an alignment score of 90%. The remaining 10% is not "the human being wrong" — it is the specialist failing to predict the human. The specialist's context was insufficient to reach the same conclusion the human reached.
- For proposers: did the specialist choose the same transition the human endorsed?
- Alignment scores are descriptive, not prescriptive — they measure past performance but do not change how proposals are counted. Every proposal counts as one endorsement. The alignment score informs delegation and pruning decisions, not consensus mechanics.
- This creates a feedback loop: human decisions generate training signal, alignment scores update, delegation thresholds are approached.

## The Collapse

### Concentration
- As a specialist demonstrates consistent human alignment, its alignment score rises.
- When a specialist's alignment score exceeds the risk dial threshold, the system is confident enough to delegate to that specialist without human participation.
- The full deliberation apparatus becomes redundant — the system has empirical evidence that this specialist predicts the human reliably.

### Levels of Collapse (The Dial Settings)
- **Full deliberation** (r low, or alignment scores low): All specialists propose, human required when no consensus. Expensive, slow, maximum confidence. The human decides directly.
- **Autonomous consensus** (r moderate, alignment demonstrated): The proposal system runs on its own. Multiple AI specialists still propose, but their accumulated alignment with human judgment means they agree often enough for ahead-by-k consensus without human participation.
- **Single champion** (r high, one specialist dominant): One hyper-trusted specialist — the one with the highest demonstrated human-alignment — proposes alone. With k=1, a single proposal is enough. The field has collapsed to a single predictor of the human.
- **Deterministic execution**: The terminal state. Every reachable state has a champion. The DIAL structure is functionally a LangGraph — one function call per state. The deliberation machinery exists only as a safety net.

### What Collapse Means
- The collapse is the system's progressive discovery that certain decisions are narrow enough for AI to handle. The AI doesn't become "better" at the task — it demonstrates that it can predict what the human would do, for that particular class of decision.
- The decisions that resist collapse — where AI specialists cannot reliably predict the human — are precisely the decisions that require the human's broader context. DIAL surfaces this distinction empirically rather than requiring it to be specified at design time.
- At each point along the collapse, the system has accumulated precise data: the cost in dollars (API spend per proposal), the cost in time (latency per decision cycle), and the quality (alignment rate with human choices). This gives an exact answer to the question: "what does it cost to delegate this decision to AI, and at what quality level?"
- **Break-even horizon.** The calibration cost — running multiple specialists, requiring human participation during cold start — is a fixed upfront investment that amortizes across all future decisions of that type. For a decision made at frequency F with human cost-per-decision C_h, the break-even point is the number of decisions N where: `calibration_cost < (C_h - C_ai) × N`. Because C_h is dominated by human time (salary, attention, latency) and C_ai is dominated by API costs (cents per call), the gap widens with decision value and frequency. For any moderately high-value recurring decision, the economics are unambiguously favorable — the question is not *whether* calibration pays for itself but *how quickly*. DIAL's cost tracking (per-proposal USD, latency, and token counts) provides the data to compute this break-even point empirically rather than estimating it.
- The human's ongoing role after collapse is quality control — periodic participation that generates new alignment data, confirms the champion is still predicting correctly, and feeds the trip line. DIAL quantifies the cost of this quality control too: how often must a human participate to maintain confidence?

### Node-by-Node Collapse
- Different specialists may best predict human behavior at different states.
- Collapse proceeds independently per state in the graph.
- The full machine collapses when every state has a champion exceeding the autonomy threshold.

### Decomposition-Driven Collapse

Some states resist collapse because they encode decisions too complex for any single specialist's context window. The alignment data reveals this: specialists diverge from humans in systematic, non-random ways, suggesting the state conflates distinct decisions.

The resolution is **task decomposition**: splitting the state into simpler sequential states, each addressing a narrower decision. This process has a characteristic trajectory:

1. **Start**: A complex state with N transitions, serviced by expensive models at moderate alignment (e.g., GPT-4 at 75%).
2. **Decompose**: Split into two states, each with fewer transitions and simpler decision logic.
3. **Re-optimize**: At each new state, the five optimization dimensions run again. Cheaper models may now suffice.
4. **Continue**: If a sub-state still resists collapse, decompose again.
5. **Nirvana state**: Every state in the machine is simple enough that a minimally competent model (e.g., Llama 7B) handles it at high human alignment.

The nirvana state represents the **theoretical minimum cost** for AI execution of the task: the cheapest model that can achieve the required alignment at every decision point. The path from initial complex machine to nirvana state is the full optimization arc of DIAL — and it produces precise cost data at every step, so the organization can decide how far along this path the economics justify going.

### The Trip Line
- If a champion's proposal fails (guardrail failure, human override, accuracy regression), the node reverts to full deliberation.
- The collapse is reversible — autonomy is always contingent on continued demonstrated alignment.
- The trip line is the formal guarantee that autonomy never outpaces demonstrated human-prediction accuracy.
- A trip line firing is not a system failure. It is the system correctly detecting that the decision requires more context than the AI has — exactly as designed.

## Formal Properties

### Monotonicity
- Under stationary conditions (human preferences don't shift), collapse is monotonic.

### Reversibility
- The trip line guarantees that any node can revert to full deliberation.
- Autonomy is a lease, not a grant.

### Conservation of Human Alignment
- At every point along the collapse trajectory, the system's decisions are bounded in alignment with human judgment by the risk dial setting.
- The collapsed system's divergence from human choice is bounded by the same threshold as the fully deliberative system, because collapse only occurs when a specialist has demonstrated alignment >= r.

## Theoretical Connections

The following are interpretive lenses — theoretical frameworks that DIAL's mechanics can be mapped onto after the fact. They were not used to derive the framework's design. They are included because they suggest testable predictions and connect DIAL to established research traditions, not because they add formal rigor the plain-language description lacks. Each section states a concrete prediction the lens generates; if we cannot state one, the lens does not belong here.

### Mechanism Design / Social Choice Theory
- DIAL as a dynamic consensus mechanism where the specialist pool evolves based on track record of predicting the human.
- Dictator emergence that is empirically justified — the dictator is the specialist that best predicts the human.
- Arrow's impossibility theorem doesn't apply: dictatorial outcomes are explicitly the goal (when earned).
- The risk dial as the mechanism designer's tradeoff between convergence speed and misalignment risk.
- **Testable prediction:** Under monotonic alignment improvement, no stable non-dictatorial equilibrium exists — the system must converge to a single dominant specialist or cycle indefinitely. If a non-dictatorial equilibrium is observed empirically, the alignment measurement approach needs revision.

### Repeated Games with Reputation
- Each round as a stage game. Payoff = agreement with human. Reputation = alignment score.
- The collapse as a game-theoretic equilibrium where one player's strategy dominates.
- The trip line as a punishment strategy maintaining incentive compatibility.
- **Testable prediction:** Removing the trip line (no punishment for divergence after collapse) causes alignment drift without self-correction. A system without the trip line will silently degrade when human preferences shift, while a system with the trip line will detect and recover.

### Information Theory
- Entropy over "who predicts the human best" — initially maximal, reduced each round.
- The risk dial as an acceptable residual entropy threshold.
- Full collapse as zero conditional entropy: H(human_choice | champion_proposal) = 0.
- **Testable prediction:** Entropy over the specialist alignment score distribution decreases monotonically under stationary human preferences. Measured entropy should track with the number of decision cycles completed. A plateau in entropy indicates the specialist population lacks a sufficiently aligned candidate.

## Related Work

DIAL solves a different problem than the systems listed below. This comparison is specifically about **where ground truth originates** — not overall capability. DIAL is a measurement and delegation harness, not an alternative to agent frameworks or alignment techniques. It can wrap any of them.

| Approach | Ground truth source | Trust evolution | Collapse |
|----------|-------------|-----------------|----------|
| LangGraph / LangChain | Designer's choice | None | N/A (starts collapsed) |
| Multi-agent debate | Human judges | None (static) | Never |
| Constitutional AI / RLHF | Offline training signal | Offline | N/A (single model) |
| Mixture of Experts | Gating network | Training time | Static routing |
| **DIAL** | **The human's actual runtime choices** | **Per-specialist, empirical, continuous** | **Progressive, reversible, per-state** |

- Key distinction: DIAL's ground truth is the human participant's actual choices at runtime — not a training dataset, not a constitution, not a reward model. The system learns to predict a specific human (or group of humans) in a specific operational context.
- DIAL is also distinct in its philosophical foundation: AI is not a peer to be negotiated with but a tool to be calibrated. The question is never "is the AI right?" but "does the AI predict the human?"
- DIAL is complementary to these approaches, not competitive. A DIAL specialist can be a LangGraph agent, a constitutionally-trained model, or an MoE system. DIAL measures whether the specialist's outputs match what the human would choose — regardless of how the specialist produces those outputs.

## Open Questions

- Convergence rate: how many rounds to collapse, as a function of specialist population and human consistency?
- Regret bounds: cumulative divergence from human choice along the collapse trajectory vs. oracle alignment.
- Non-stationarity: when human preferences shift, how quickly does the trip line fire and how quickly do alignment scores re-converge?
- Multi-state coupling: can demonstrated alignment at one state transfer to another?
- Optimal risk dial scheduling: is there an optimal r(t) trajectory minimizing deliberation cost subject to alignment constraints?
- Multiple humans: when humans disagree, both are right relative to the AI. How should the system aggregate multiple human signals? This is a social choice problem among humans — the AI has no standing to adjudicate. Possible approaches include weighting by domain authority, averaging preferences, or requiring human consensus before the signal is used for AI calibration.
- Equivalence guarantee: can we prove the collapsed graph reproduces human choices within tolerance r?
- Context boundary detection: can the system learn to identify which decisions require human-scale context vs. which fit within AI context windows, as a complement to the empirical collapse mechanism?
- Exemplar selection: what is the optimal strategy for choosing which exemplars to include in a specialist's context? Recency, semantic similarity, diversity, informativeness (exemplars where the specialist diverged)? What is the interaction between exemplar selection and context window size?
- Decomposition criteria: what signals in the alignment data reliably indicate that a state should be decomposed? Can the system automatically identify the "seam" along which to split? Is there a formal relationship between state complexity and the minimum model capability required?
- Counseling convergence: how many counseling iterations are needed for prompt optimization to plateau? Does counseling converge faster with more exemplars, or is there a diminishing return?
- Exemplar drift: as the human population changes (new employees, changing policies), older exemplars may become misleading. What is the optimal exemplar retention policy? Should exemplars be weighted by recency?
- Cross-task transfer: can exemplars or optimized prompts from one machine inform specialists at related states in a different machine? What is the boundary of transferability?