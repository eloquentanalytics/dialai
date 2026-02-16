# DIAL Positioning

## Core Value Proposition

**One sentence**: DIAL measures the exact dollar cost of replacing any human decision with AI, then progressively automates only what's proven to work.

**One paragraph**: You have humans making decisions in your business. You want to know which of those decisions AI can handle, what it'll cost, and how much human oversight you still need. DIAL answers all three. Model your process as a state machine, let AI and humans participate together, and DIAL measures alignment, cost, and quality at every decision point. Proven decisions get cheaper. Hard decisions stay with humans. You get exact numbers either way.

---

## Tagline Options

- **Measure the cost of AI. Automate what's proven.**
- **Know exactly what AI costs before you trust it.**
- **The empirical path from human decisions to AI execution.**
- **Turn the dial from human to AI. Watch the numbers.**

---

## Target Audiences (Priority Order)

### 1. Teams with Expensive, Repetitive Human Decision Processes

**Who**: Content moderation, QA/review, support triage, document review, compliance checking, data labeling — any "human-in-the-loop" workflow costing real money.

**Their pain**: "We're spending $X/month on humans making these decisions. We know AI can do some of this, but we don't know which parts, and we can't afford to get it wrong."

**DIAL's answer**: Model the process as a state machine. Let AI and humans participate together. DIAL tells you — empirically and in dollars — which decisions AI can handle and which still need humans. The output is a concrete number: *this step costs $0.003 per decision at 97% human alignment using GPT-4o-mini, and needs human spot-checking every 50 decisions.*

**Why DIAL over alternatives**: They could A/B test models manually. They could build custom evaluation harnesses. But DIAL provides the measurement infrastructure — the same way Prometheus provides metrics infrastructure. They don't build the comparison framework; they model the task and run it.

**Key features that matter**:
- Per-decision cost tracking (USD, tokens, latency)
- Alignment rate against human ground truth
- Break-even analysis: calibration cost vs. ongoing savings
- Progressive delegation with trip-line safety

---

### 2. Engineering Leaders Evaluating AI ROI

**Who**: CTOs, VPs of Engineering, AI leads who need to justify AI spend to the business.

**Their pain**: "The board wants to know what we're getting for our AI investment. I can't quantify it."

**DIAL's answer**: DIAL produces a break-even analysis for every decision point: the upfront calibration cost (running multiple models against human judgments) vs. ongoing savings (cheap AI decisions vs. human salary-time). You can literally present: *"Step 3 of our review process is fully automated at $14/month with 98% human-equivalent quality. Step 5 still needs humans at $2,400/month. Here's the data."*

**Key features that matter**:
- Dollar-denominated cost data per decision
- Alignment percentages against human baseline
- Break-even horizon calculations
- Auditability: every decision, every vote, every transition is recorded

---

### 3. Developers Building AI-Powered Products

**Who**: Developers using LangChain, LangGraph, CrewAI, AutoGen — or rolling their own — who need a consensus, quality measurement, or trust calibration layer.

**Their pain**: "I have multiple models or agents doing things, but I don't know which one to trust, and I have no way to measure quality in production."

**DIAL's answer**: Wrap your agents as DIAL specialists. DIAL measures which one aligns best with human preferences and progressively delegates to the winner. Your agent framework handles execution; DIAL handles trust.

**Key features that matter**:
- TypeScript library, CLI, and MCP server
- Works with any LLM via OpenRouter or any OpenAI-compatible endpoint
- Pluggable specialist architecture (local functions, webhooks, LLM-based, hybrid)
- `npx dialai machine.json` — runs a machine from the command line
- `npx dialai --mcp` — exposes DIAL as MCP tools for Claude, Cursor, etc.
- `DIALAI_BASE_URL` — switch between local and remote with one env var

**Developer experience pitch**:
> DIAL is designed to be used *by* the AI assistant you're already working with. Start an MCP server, and your Claude/Cursor/Copilot agent can create sessions, register specialists, submit proposals, and run decision cycles through tool calls. The AI assistant becomes a participant in the decision framework.

---

### 4. AI Safety and Alignment Researchers

**Who**: Academics, AI safety teams, alignment researchers.

**Their pain**: "How do you measure alignment in production, continuously, with real human feedback — not just at training time?"

**DIAL's answer**: Progressive collapse is an empirically observable phenomenon. Start with maximum deliberation, measure alignment, and watch the system simplify itself. The collapse is reversible — the trip line fires when alignment degrades. This is a concrete, deployable alignment measurement framework.

**Key features that matter**:
- Human Primacy axiom with formal justification
- Weight recalibration based on demonstrated human-alignment
- Progressive collapse with reversibility guarantees
- Information-theoretic, game-theoretic, and mechanism design connections
- Open questions suitable for academic research

---

## Competitive Positioning

### What DIAL Is NOT

- Not an agent framework (use LangGraph, CrewAI, AutoGen for that — DIAL wraps them)
- Not a prompt optimization tool (use DSPy for that — DIAL measures whether the optimization worked)
- Not an evaluation harness (use promptfoo, Inspect AI for offline evals — DIAL measures alignment in production, continuously)
- Not a model router (use OpenRouter for routing — DIAL decides which model to trust at which decision point)

### What DIAL IS

A **measurement and delegation harness** that sits between your human process and your AI capabilities, answering one question: *at this specific decision point, can AI reliably predict what the human would choose, what does it cost, and how much ongoing human oversight is needed?*

### The Moat

Nobody else combines:
1. **Runtime human-alignment measurement** (not training-time, not offline)
2. **Progressive delegation** (earned autonomy, not configured autonomy)
3. **Dollar-denominated cost tracking** per decision
4. **Reversible collapse** (the trip line — autonomy reverts when alignment degrades)

DSPy optimizes prompts but doesn't measure ongoing human alignment. TensorZero optimizes production LLMs but doesn't do progressive delegation. AutoGen coordinates agents but doesn't measure whether they should be trusted. DIAL fills the gap between "the AI can do this" and "I trust the AI to do this, and here's why, in dollars."

---

## Messaging by Context

### For the README / Landing Page

> **DIAL** (Dynamic Integration between AI and Labor) measures whether AI can reliably replace human decisions — and at what cost.
>
> Model any decision process as a state machine. Register AI and human specialists. DIAL runs decision cycles where specialists propose transitions, vote on them, and reach consensus. Over time, the system progressively delegates to the most human-aligned AI specialist while tracking exact cost and quality data.
>
> The result: for every step in your process, you know whether AI can handle it, which model does it best, what it costs, and how often a human needs to check.

### For a Technical Blog Post

> Most AI frameworks help you *build* agents. DIAL helps you *trust* them.
>
> DIAL doesn't replace your agent framework — it wraps it. Your LangGraph agent, your CrewAI crew, your custom GPT-4 pipeline: register any of them as DIAL specialists. DIAL measures how well each one predicts what a human would choose, tracks cost per decision, and progressively hands off control as alignment is demonstrated.
>
> Think of it as CI/CD for trust in AI decisions. You wouldn't ship code without tests. Why would you ship AI decisions without measurement?

### For an Academic Abstract

> We present DIAL (Dynamic Integration between AI and Labor), a coordination framework for calibrating AI autonomy against human judgment in state-machine-structured tasks. DIAL introduces progressive collapse: a phenomenon where multi-agent deliberation structures simplify into deterministic execution as individual AI specialists demonstrate sustained alignment with human decisions. The framework begins from a pessimistic assumption (AI has no authority) and provides the mechanism to prove otherwise empirically, one decision at a time. We characterize the collapse trajectory, its formal properties (monotonicity under stationarity, reversibility via trip line, conservation of alignment), and its practical implications for organizations seeking to quantify the cost and quality of AI delegation.

### For a Conference Talk Title / Subtitle

> **Turning the Dial: How Progressive Collapse Replaces Multi-Agent Deliberation with Measured Automation**
>
> or
>
> **The $0.003 Decision: Measuring the Exact Cost of Replacing Human Judgment with AI**

---

## What NOT to Lead With

1. **Don't lead with "human primacy."** It's philosophically important but sounds like a limitation to developers who want AI to be autonomous. Save it for the white paper and constitution. Lead with measurement and cost.

2. **Don't lead with "multi-agent consensus."** It sounds like just another agent framework competing with AutoGen and CrewAI. DIAL is not primarily an agent framework — it's a measurement and delegation framework.

3. **Don't lead with the theory.** Progressive collapse, information entropy, mechanism design — these are impressive but intimidating. Lead with the practical value. Link to the theory for people who want depth.

4. **Don't lead with the philosophy.** "The human is always right" is a nuanced claim that sounds naive without context. Lead with: "DIAL measures AI against humans and tells you when AI is good enough."

---

## The Dial Metaphor

The name "DIAL" works on two levels:

1. **Acronym**: Dynamic Integration between AI and Labor
2. **Metaphor**: A literal dial you turn from "humans do everything" to "AI does everything"

The dial setting at any given state represents how much the system trusts AI to act autonomously at that decision point. The system starts at 0 (full human control). As alignment is demonstrated, the dial turns toward 1 (full AI autonomy). The trip line snaps it back if alignment degrades.

This metaphor should be used in all external communications. It's intuitive, memorable, and accurately represents the mechanism.

---

## Feature Emphasis by Audience

| Feature | Decision Teams | Leaders | Developers | Researchers |
|---------|:-:|:-:|:-:|:-:|
| Per-decision cost tracking | ★★★ | ★★★ | ★★ | ★ |
| Human alignment measurement | ★★★ | ★★★ | ★★ | ★★★ |
| Progressive collapse | ★★ | ★★★ | ★★ | ★★★ |
| Break-even analysis | ★★ | ★★★ | ★ | ★ |
| CLI + MCP + TypeScript | ★ | ★ | ★★★ | ★ |
| Trip line (reversibility) | ★★ | ★★ | ★ | ★★★ |
| Pluggable specialists | ★★ | ★ | ★★★ | ★ |
| State machine modeling | ★★ | ★ | ★★★ | ★★ |
| Formal properties | ★ | ★ | ★ | ★★★ |
| Agent experience (MCP, skills) | ★ | ★ | ★★★ | ★ |
| Exemplar-based learning | ★★ | ★ | ★★ | ★★★ |

---

## The Simplest Demo

The most powerful demo for each audience:

**For decision teams**: Run their actual workflow with 3 models. Show the alignment scores. Show the cost per decision. Show which steps converge and which don't.

**For engineering leaders**: Show a break-even chart. "After 200 decisions, the calibration cost is paid off. Here's the ongoing savings per month."

**For developers**: `npx dialai examples/simple-machine.json` → watch a machine run to completion in seconds. Then: `npx dialai --mcp` → use it from Claude Desktop.

**For researchers**: Show the entropy curve over decision cycles. Show the alignment score evolution. Show the trip line firing and recovering.
