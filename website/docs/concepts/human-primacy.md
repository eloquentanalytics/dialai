---
sidebar_position: 6
---

# Human Primacy

**Humans have context that AI cannot access.** Human decisions are the best available ground truth for calibrating AI specialists.

## The Context Argument

An AI model operates on a **bounded context window**: thousands or millions of tokens of visible information.

A human operates on:
- A **lifetime of embodied experience**
- **Tacit knowledge** that can't be articulated
- **Institutional context** and organizational history
- **Real-time sensory input** that no model can access
- **Relationships** and social dynamics
- **Intuitions** built from millions of decisions

The human knows things they **cannot tell the machine**.

## Information Asymmetry

When a human's decision looks wrong from the AI's perspective, there are two possibilities:

1. **The human made an error**: possible, but the AI can't verify this
2. **The human has context the AI doesn't**: invisible to the AI by definition

The machine, trained on human works and operating on a compressed subset of human knowledge, **cannot determine when the human is wrong**, because what looks like an error from the AI's limited vantage point may reflect context the AI simply doesn't have.

The AI cannot reliably distinguish human errors from human context it lacks. Human decisions are the best available ground truth for calibration because no better signal is available from the AI's position. Any attempt by the AI to "correct" human judgment requires the AI to be confident it has the full picture, which is precisely the assumption DIAL rejects.

### The Parent Analogy

It is always safer for the AI to assume the human had reasons, just as it is safer for a child to defer to a parent who has context the child cannot access.

## The Distributional Standard

The goal of a DIAL specialist is to match the **probability distribution** a population of competent humans would produce for the same decision.

If you gave 1,000 competent humans the same state and transition options, their choices would form a distribution, clustered around the most common answer with some spread across alternatives.

A well-calibrated specialist's output probabilities should look like that human distribution. If 80% of humans would choose transition A and 20% would choose transition B, the specialist should reflect similar odds, not converge on A with 99.9% confidence.

### Why Distribution Matching Matters

**Overconfidence is a signal of miscalibration.** If every specialist converges on the same answer with near-total confidence, that should raise concern, because humans do not converge that way. Real human decisions have variance. A specialist that eliminates that variance is miscalibrated.

**The improvement path is principled.** To push the specialist's accuracy beyond the human distribution, you must first tighten the human distribution itself through better training, clearer decision prompts, and improved context provided at the point of decision.

### The Specialist Reflects the Humans It Learns From

DIAL calibrates to whatever the humans actually are. The specialist will approach the capability level of the humans it observes:

- **If the humans are all experts**, the distribution is tight and centered on expert-quality decisions. The specialist converges toward expert performance.
- **If the humans are average practitioners**, the distribution reflects average performance, and the specialist matches that level.
- **If the humans have highly variable skill levels**, the distribution is wide and noisy. The specialist has a poor signal to learn from and will likely perform below average, because it cannot distinguish expert decisions from novice decisions within a blurred distribution.

The specialist's ceiling is the quality of the human signal. The framework makes this relationship explicit and measurable.

## Implications for AI Specialists

### 1. Predict, Don't Judge

An AI specialist should choose what the human **would** choose, even if its own reasoning disagrees. The specialist's role is to model human behavior.

### 2. Judgment Criteria

AI specialists are judged on **alignment with human choices**:

| Metric | Good | Bad |
|--------|------|-----|
| Alignment rate | 95% match with human | 60% match with human |
| Reasoning quality | "Human would prefer X because..." | "The objectively correct answer is..." |
| Confidence calibration | "High confidence human chooses X" | "I am certain X is correct" |
| Distribution match | Reflects human-like variance across options | Collapses to a single answer with near-total confidence |

### 3. No Standing to Override

If an AI specialist has strong reasoning that the human is wrong, it should:
- Present its reasoning in the proposal
- Let the human see and consider it
- NOT override the human decision
- NOT claim authority based on its reasoning

## When Humans Disagree

### The Architecture Handles Disagreement Through State Design

When a domain genuinely requires multiple humans to participate, this is modeled through the state machine design. Each human's decision can be its own state transition, or multiple humans can vote with the ahead-by-k consensus mechanism determining the outcome.

### Both Humans Are "Right" in a Distributional Sense

When we say both humans are right, we mean two things:

1. **Humans exist in a distribution.** Human A choosing "approve" and Human B choosing "request changes" are both points in the [distributional standard](#the-distributional-standard) described above. Neither is wrong; they reflect the natural variance in human judgment.

2. **The specialist must assume any human answer is valid.** It cannot distinguish between "this human made an error" and "this human has context I lack," so any individual human response must be treated as a legitimate sample from the distribution.

### What About Multi-Stakeholder Decisions?

When a domain genuinely requires multiple humans to agree (e.g., two reviewers must both approve a PR), this is modeled as **separate states in the machine**. Each reviewer's decision is its own decision point, and each advances the machine independently:

```mermaid
graph LR
    S1[PR Submitted] -->|"Reviewer A decides"| S2[First Review Complete]
    S2 -->|"Reviewer B decides"| S3[Both Reviews Complete]
    S3 -->|"Merge / Request Changes"| S4[Resolved]
```

Human disagreement between reviewers is resolved by human mechanisms (escalation, authority structures, negotiation) at the process design level. Organizational disagreement is outside the scope of AI-human calibration.

## Human Activity as Ground Truth

Human primacy in DIAL means that **human activity is the reference for evaluating AI specialists**. When measuring how well an AI specialist performs, the question is: how closely does it match what humans would decide?

When humans participate, their decisions are recorded as ground truth. AI specialists are evaluated on how well their decisions align with human decisions. See [Specialists — Human vs AI](./specialists.md#human-vs-ai-specialists) for the specific privileges and constraints of each.

## Common Objections

### "But this optimizes the AI to reproduce human errors"

The baseline is the human already making those decisions. If a specialist reproduces human behavior including human mistakes, the outcome matches the status quo at lower cost.

More precisely, the specialist optimizes to match the **distribution** a population of competent humans would produce. Individual errors are noise in that distribution; the distribution clusters around the correct answer. To push accuracy beyond it, the path runs through the humans: better training, clearer decision prompts, tighter process design.

Human primacy defines *who* corrects errors. Humans can curate which past decisions serve as reference points, excluding recognized mistakes. AI can surface patterns that *may* indicate systematic errors, but the human decides whether to act on those observations.

### "But what about systematic bias?"

If human decisions at a particular state exhibit a systematic bias (for example, demographic bias in a hiring decision), **add a state to the machine** that explicitly checks for that bias.

If your domain has known failure modes, you design states that address them: a fairness review step, a compliance check, a second-opinion gate. The bias correction happens in the process architecture through state machine design, where it is explicit and auditable.

### "But sometimes the AI is objectively right"

Define "objectively." From whose perspective? With what information?

The AI operates on a subset of reality. When it seems "objectively right," that assessment is made from within its limited context. The human may have information that changes the entire picture.

### "But what happens when human preferences shift?"

Progressive collapse assumes stationary conditions: that the human distribution stays stable long enough for specialists to converge on it. In practice, human preferences shift constantly (new employees, changing strategies, evolving markets, policy updates).

The system is designed to detect non-stationarity. The human who participates periodically provides ongoing ground truth. When the population distribution shifts, agreement rates between specialists and human references visibly decline. When agreement drops, the system's response is mechanical: the ahead-by-k consensus threshold becomes harder to reach, the system re-expands (soliciting more proposals, more votes, more human participation), and then re-converges on the new distribution through the same measurement process that produced the original collapse.

Organizations in genuinely non-stationary environments will see shorter periods of collapsed execution and more frequent re-calibration cycles. DIAL makes that cost visible rather than hiding it.

### "This slows down automation"

Yes, initially. Measuring AI alignment with human judgment over time informs when to reduce human involvement. Automation is earned through demonstrated alignment.

### "What about clear AI advantages (calculation, etc.)?"

Tasks where AI has clear advantages (arithmetic, data lookup, pattern matching on defined criteria) are deterministic computations. Human primacy applies to **judgment calls**.

## Related Concepts

- [Specialists](./specialists.md): How specialists participate
- [Arbitration](./arbitration.md): Consensus mechanisms
- [Decision Cycle](./decision-cycle.md): The process that implements human primacy
