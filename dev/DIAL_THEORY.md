# DIAL Theory — Paper Outline

**Working Title:** Progressive Collapse of Multi-Agent Deliberation into Deterministic Execution through Human-Aligned Trust Calibration

---

## Introduction

- The problem: given any task modeled as a state machine, how do you know — in dollars, time, and quality — exactly what it would cost to turn that task over to AI? And how involved should humans remain as ongoing quality control?
- DIAL (Dynamic Integration between AI and Labor) — a coordination framework that starts from a deliberately pessimistic assumption: **AI has no role.** LLM specialists begin with weight 0.0. The default assumption is that the task is too difficult for AI and only humans can navigate it. DIAL then provides the mechanism to prove otherwise, one decision at a time.
- DIAL rests on a foundational axiom: **the human is always right.** Not because humans are infallible, but because AI models are created by humans, trained on human works, and operate within narrower context windows than humans have access to. An AI specialist cannot be "better" than a human at a decision, because the human has context — about the world, the situation, the goals — that the AI does not and cannot access. AI is faster and cheaper at narrower tasks requiring smaller context. DIAL leverages that asymmetry.
- The central claim: over repeated decision cycles, measuring how well AI predicts human choices causes the multi-agent deliberation structure to progressively collapse into deterministic execution. This collapse is emergent, not designed. The "dial" is the set of risk-based thresholds governing this collapse — how much demonstrated human-alignment is required before the system acts autonomously. Along the way, the system accumulates precise data on the cost (dollars, latency, token usage) and quality (alignment rate) of AI participation at every decision point.
- DIAL is therefore a framework for answering the question: for this specific task, at this specific decision point, what is the minimally competent AI configuration that produces human-equivalent decisions, what does it cost, and how much ongoing human involvement is needed to maintain quality?
- Contributions: (1) A formal model of progressive autonomy grounded in human primacy and a pessimistic default. (2) Characterization of the collapse phenomenon and its formal properties. (3) A cost/quality framework for AI delegation decisions. (4) Connection to existing theory in mechanism design, repeated games, information theory, and category theory.

## The Human Primacy Axiom

- **The pessimistic default.** DIAL begins by assuming AI will have no role. All LLM specialists start with weight 0.0 — zero authority, zero trust, zero autonomy. The system is designed to work entirely with human decisions. AI participation is not assumed; it must be earned.
- **Axiom: Human decisions are the ground truth of the system.** This is not a claim about optimality in any external sense. It is a design commitment rooted in the structural relationship between AI and human cognition.
- AI models are derivative works. They are created by humans, trained on human-generated data, and their capabilities are a compressed subset of human capability. An AI model operates on a bounded context window — thousands or millions of tokens. A human operates on a lifetime of embodied experience, tacit knowledge, institutional context, and real-time sensory input that no model has access to.
- Because the AI's context is strictly narrower than the human's, the AI cannot reliably determine when the human is "wrong." What looks like a human error from the AI's limited vantage point may reflect context the AI simply doesn't have. It is always safer for the AI to assume the human had reasons, just as it is safer for a child to defer to a parent — not because the parent is infallible, but because the parent has context the child cannot access.
- **Implication for AI behavior:** An AI specialist in DIAL should choose what the human would choose, even if its own reasoning disagrees. It will be judged on alignment with the human, and that judgment is correct, because the human's broader context makes the human's decision the more reliable one.
- **When humans disagree:** If the human is always right, and there are multiple humans, then disagreeing humans are both right — relative to an AI. The AI has no standing to break the tie. Human disagreement is resolved by human mechanisms (negotiation, authority, voting among humans). The AI's role is to predict what the humans would collectively choose, not to adjudicate between them.
- **The value proposition of AI is not superiority but efficiency.** AI is faster and cheaper at narrow tasks where the required context fits within the model's window. DIAL's purpose is to discover, empirically and with precise cost data, which decisions are narrow enough for AI to handle — and what the ongoing human quality-control cost is to maintain that delegation over time.

## Setting and Definitions

- Sessions as finite state machines with a default state.
- Drift: the system is not in its default state and must act.
- Specialists: proposers, voters, arbiters — human or AI.
- Weights: human w=1.0 (always authoritative), AI w=0.0 (no authority until earned) at initialization.
- The risk dial r in [0,1]: a state-level parameter that scales AI weight contributions.
- Weight measures demonstrated ability to predict the human's choice. It is not a measure of task competence — it is a measure of human-alignment under the axiom that the human's choice is the correct one.

## The Search Space: From Combinatorial Explosion to Tractable Optimization

- **The naive formulation.** The most unoptimized version of the question "which AI can do this task?" is a combinatorial explosion. Cross every possible model with every possible prompt, generate exponentially more pairwise votes, then compare all of that to the human choice. This is intractable — but it is the honest worst case, and DIAL's design started by staring at it directly.
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
- **DIAL as a search over this space.** The full DIAL process — register specialists, run decision cycles, measure alignment, recalibrate weights, adjust strategies/prompts/models — is a search over the specialist configuration space for the minimally competent, minimally expensive configuration that produces human-equivalent decisions at each state. The combinatorial explosion is tamed by starting with a sparse sample and optimizing iteratively, guided by empirical human-alignment data.

## The Decision Cycle

- Five phases: proposal solicitation, proposal submission, pairwise voting, arbitration, execution.
- The ahead-by-k arbiter: how weighted votes accumulate, how the risk dial modulates AI evidence.
- Human votes as immediate consensus triggers — because the human is always right.
- The cycle as a repeated process that generates observable data about how well each AI specialist predicts the human.

## The Probability Field over Human Choices

- At each decision point, proposals define a discrete distribution over candidate transitions.
- The field is oriented toward what the human would choose. There is no separate "correct" answer — the human's choice is the correct answer, by axiom.
- Voting concentrates mass: each vote is evidence about which transition the human would endorse.
- The risk dial governs how much the system trusts AI-generated evidence about the human's likely choice.
- Support function S(p_i) and the consensus condition S(p_i) - max S(p_j) >= k.
- At r=0: only human evidence counts (the system has no confidence in predicting the human). At r=1: AI evidence counts at full registered weight (the system trusts that high-weight AI specialists predict the human reliably).

## Weight Recalibration: Learning to Predict the Human

- After rounds with human participation, the system recalibrates specialist weights.
- Agreement rate = matching votes / total comparisons with human on same proposal pairs.
- Recommended weight = agreement rate. A specialist that agrees with the human 90% of the time gets weight 0.9. The remaining 10% is not "the human being wrong" — it is the specialist failing to predict the human. The specialist's context was insufficient to reach the same conclusion the human reached.
- For proposers: transition match, state match, parameter match — all measured against what the human endorsed.
- Recalibration is advisory (produces a recommendation). Trust is never granted without explicit authorization.
- This creates a feedback loop: human decisions generate training signal, weights update, the probability field shifts.

## The Collapse

### Concentration
- As a specialist demonstrates consistent human alignment, its weight grows.
- When w_j * r >= k, that specialist's prediction of the human's choice is sufficient for consensus.
- The full voting apparatus becomes redundant for that specialist — the system is confident enough in its human-prediction to skip asking the human.

### Levels of Collapse (The Dial Settings)
- **Full deliberation** (r low, or weights low): All specialists propose, all vote, human required. Expensive, slow, maximum confidence. The human decides directly.
- **Automated voting** (r moderate, weights earned): The proposal/voting system runs on its own. Multiple AI specialists still deliberate, but their accumulated alignment with human judgment is sufficient for consensus without human participation. The system is confident the AI committee will reach the same conclusion the human would.
- **Single champion** (r high, one specialist dominant): One hyper-trusted specialist — the one with the highest demonstrated human-alignment — proposes alone. The field has collapsed to a single predictor of the human. Cheap guardrails replace expensive voting.
- **Deterministic execution**: The terminal state. Every reachable state has a champion. The DIAL structure is functionally a LangGraph — one function call per state. The deliberation machinery exists only as a safety net.

### What Collapse Means
- The collapse is the system's progressive discovery that certain decisions are narrow enough for AI to handle. The AI doesn't become "better" at the task — it demonstrates that it can predict what the human would do, for that particular class of decision.
- The decisions that resist collapse — where AI specialists cannot reliably predict the human — are precisely the decisions that require the human's broader context. DIAL surfaces this distinction empirically rather than requiring it to be specified at design time.
- At each point along the collapse, the system has accumulated precise data: the cost in dollars (API spend per proposal, per vote), the cost in time (latency per decision cycle), and the quality (alignment rate with human choices). This gives an exact answer to the question: "what does it cost to delegate this decision to AI, and at what quality level?"
- The human's ongoing role after collapse is quality control — periodic participation that generates new alignment data, confirms the champion is still predicting correctly, and feeds the trip line. DIAL quantifies the cost of this quality control too: how often must a human participate to maintain confidence?

### Node-by-Node Collapse
- Different specialists may best predict human behavior at different states.
- Collapse proceeds independently per state in the graph.
- The full machine collapses when every state has a champion exceeding the autonomy threshold.

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

## Theoretical Framings

### Mechanism Design / Social Choice Theory
- DIAL as a dynamic weighted voting mechanism where the electorate evolves based on track record of predicting the human.
- Dictator emergence that is empirically justified — the dictator is the specialist that best predicts the human.
- Arrow's impossibility theorem doesn't apply: dictatorial outcomes are explicitly the goal (when earned).
- The risk dial as the mechanism designer's tradeoff between convergence speed and misalignment risk.

### Repeated Games with Reputation
- Each round as a stage game. Payoff = agreement with human. Reputation = weight.
- The collapse as a game-theoretic equilibrium where one player's strategy dominates.
- The trip line as a punishment strategy maintaining incentive compatibility.

### Information Theory
- Entropy over "who predicts the human best" — initially maximal, reduced each round.
- The risk dial as an acceptable residual entropy threshold.
- Full collapse as zero conditional entropy: H(human_choice | champion_proposal) = 0.

### Category Theory
- States as objects, transitions as morphisms. Each specialist as a functor.
- The consensus mechanism as a natural transformation selecting one morphism.
- Weight recalibration as progressively restricting the functor set.
- Collapse as a filtered colimit converging to a single functor.
- The trip line as the inverse morphism restoring the full functor set.

## Distinction from Existing Work

| Approach | Ground truth | Trust evolution | Collapse |
|----------|-------------|-----------------|----------|
| LangGraph / LangChain | Designer's choice | None | N/A (starts collapsed) |
| Multi-agent debate | Human judges | None (static) | Never |
| Constitutional AI / RLHF | Offline training signal | Offline | N/A (single model) |
| Mixture of Experts | Gating network | Training time | Static routing |
| DIAL | The human's actual runtime choices | Per-specialist, empirical, continuous | Progressive, reversible, per-state |

- Key distinction: DIAL's ground truth is the human participant's actual choices at runtime — not a training dataset, not a constitution, not a reward model. The system learns to predict a specific human (or group of humans) in a specific operational context.
- DIAL is also distinct in its philosophical foundation: AI is not a peer to be negotiated with but a tool to be calibrated. The question is never "is the AI right?" but "does the AI predict the human?"

## Open Questions

- Convergence rate: how many rounds to collapse, as a function of specialist population and human consistency?
- Regret bounds: cumulative divergence from human choice along the collapse trajectory vs. oracle weights.
- Non-stationarity: when human preferences shift, how quickly does the trip line fire and how quickly do weights re-converge?
- Multi-state coupling: can demonstrated alignment at one state transfer to another?
- Optimal risk dial scheduling: is there an optimal r(t) trajectory minimizing deliberation cost subject to alignment constraints?
- Multiple humans: when humans disagree, both are right relative to the AI. How should the system aggregate multiple human signals? This is a social choice problem among humans — the AI has no standing to adjudicate. Possible approaches include weighting by domain authority, averaging preferences, or requiring human consensus before the signal is used for AI calibration.
- Equivalence guarantee: can we prove the collapsed graph reproduces human choices within tolerance r?
- Context boundary detection: can the system learn to identify which decisions require human-scale context vs. which fit within AI context windows, as a complement to the empirical collapse mechanism?
