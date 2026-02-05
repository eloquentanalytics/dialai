# DIAL Concepts

DIAL is a coordination framework for AI and human specialists making decisions together within state machines.

## Sessions

A session is an instance of a state machine. The machine defines a default state, other possible states, and transitions between them. When a session is not in its default state, specialists work together to return it there.

## Specialists

Specialists are the "pluggable" actors that participate in sessions. They can be AI models or humans.

**Roles:**
- **Proposers** any number of LLM or Human proposers can analyze the current state and suggest what transition should happen next
- **Voters** any number of LLM or Human voters can evaluate proposals and express preferences between them
- **Arbiters** consensus is evaluated by the built-in `evaluateConsensus` function, which determines when sufficient agreement has been reached
- **Tools** one designated deterministic strategy performs synchronous function-like transitions when requested

Specialists can be solicited by the system when input is needed (llms), but can also act autonomously (humans) or be invoked directly by the system (tools).

While it may seem unnecessary to model deterministic specialists within the same complexity as more subjective ones, it also allows that decision to evolve over time, so that a deterministic specialist can be replaced with a subjective one over time if the decision is found to be suboptimal, or vice versa.

## The Decision Cycle

When a session is not in its default state and no Tool specialist is registered for the current state, the system progresses through a repeating cycle:

1. **Proposal Solicitation** — Ask proposers what transition should happen next.
2. **Proposal Submission** — Proposers submit their recommendations with reasoning.
3. **Vote Solicitation** — Voters compare pairs of proposals using Swiss tournament pairing: proposals with similar accumulated support are paired first, and voters are round-robined through the selected pairs. Consensus is checked after each vote, and voting stops as soon as the ahead-by-k threshold is met. The system does not exhaustively compare all possible pairs — it relies on consensus resolving before the full O(N²) comparison space is explored.
4. **Arbitration** — Arbiters aggregate votes to determine if a proposal has sufficient support.
5. **Transition Execution** — If consensus is reached, execute the winning proposal's transition.

The cycle repeats until the session returns to its default state.

**Fast path (confidence-gated):** if the risk dial crosses a confidence threshold, the system can temporarily enter an **express lane** where it:
- **Selects one trusted LLM specialist** (a “champion”) to submit the proposal
- **Skips broad proposal solicitation** (and typically skips expensive pairwise voting)
- **Immediately votes on / evaluates** the champion proposal (e.g. a quick arbiter check / deterministic guardrails), then executes if accepted

If the champion makes a suboptimal move (per the configured criteria), the risk dial acts as a **trip line**: the system drops back into the full (slower, more expensive) proposal + voting mode until confidence is rebuilt.

Tools use an abbreviated cycle that avoids the proposal and vote phases, and instead directly invoke a transition, though this is just a convenience as proposals can also perform the same function if the logic is still being evaluated before being promoted to a tool. (The tool input params and the proposal params are the same, though the outputs are different).

## Decision Prompts

Each state in the machine carries a prompt describing how to decide what to do next. It describes the decision logic in a specialist-agnostic way. This ensures consistency because everyone's reasoning is based on the same instructions.

## Arbitration

Consensus is evaluated by **Arbiter** specialists. Like proposers, voters, and tools, arbiters are implemented as pluggable strategies—a strategy name maps to a file that defines the consensus logic.

**Default strategy: weighted ahead-by-k**

The default arbiter uses a simple weighted vote comparison:
- LLMs begin with weight 0.0 (no autonomous authority)
- Humans begin with weight 1.0 (full authority)
- If a human votes, that decision wins immediately
- Otherwise, the leading proposal must be ahead by k weighted votes to reach consensus

**Risk dial**

The risk dial is a state-level configuration defined in the state machine's meta. It represents a **confidence threshold** for when the system is allowed to take a **fast lane** through the decision cycle.

It gates **how much of the decision cycle is “opened up”**:
- **Below threshold**: run the full proposal + voting cycle (safer, slower, more expensive)
- **Above threshold**: allow an **express lane** where a single trusted LLM (“champion”) proposes, and that proposal is **immediately evaluated** with cheap guardrails

If guardrails trip (e.g. human override, deterministic check failures, repeated regressions, or other configured “suboptimal move” criteria), the dial effectively **snaps back** to full voting mode.

## The Human Experience

Humans interact through a variety of interface types, possibly including modules allowing:

- **Monitor** — See all sessions, their states, pending proposals, and vote status
- **Participate** — Respond to solicitations by submitting proposals or casting votes guiding the session and the other specialists on what the desired outcomes should be
- **Optimize** — Adjust the strategies, state machine, specialist teams and other parameters to improve. Evaluate specialist accuracy against human decisions to measure alignment, and recalculate voting weights based on that alignment.

The interface is conceptually generic as all session types share the concept of what humans see and what actions make sense for each state. They can also have their own specialized interface where that makes sense, often in a one-state-per-page or competition architecture.
