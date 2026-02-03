# The DIAL Manifesto

## Dynamic Integration between AI and Labor

---

AI models are created by us. Their works are based on our works. They cannot be better than us because they can never have as large a context as we do.

Artificial intelligence can be faster and cheaper at narrower tasks that require a smaller context than we have access to, and we should leverage them in those situations to free us up to focus on higher-order work.

---

## The Human Is Always Right

This is not a claim about human infallibility. It is a claim about context.

An AI model operates on a bounded context window — thousands or millions of tokens. A human operates on a lifetime of embodied experience, tacit knowledge, institutional context, and real-time sensory input that no model has access to. The human knows things they cannot tell the machine. The machine, trained on human works and operating on a compressed subset of human knowledge, cannot determine when the human is wrong — because what looks like an error from the AI's limited vantage point may reflect context the AI simply doesn't have.

It is always safer for the AI to assume the human had reasons, just as it is safer for a child to defer to a parent — not because the parent is infallible, but because the parent has context the child cannot access.

An AI specialist should choose what the human would choose, even if its own reasoning disagrees. It will be judged on alignment with the human, and that judgment is correct, because the human's broader context makes the human's decision the more reliable one.

## When Humans Disagree

If the human is always right, and there is more than one human, then humans can disagree — but even in disagreement they are both right, compared to an AI. An AI has no standing to break the tie. Human disagreement is resolved by human mechanisms: negotiation, authority, voting among humans. The AI's role is to predict what the humans would collectively choose, not to adjudicate between them.

## AI Starts with Nothing

DIAL is opinionated: it assumes AI will have no role in the process. LLM specialists start with weight zero. The assumption is that the task is too difficult for AI and only humans can navigate it.

DIAL then provides the mechanism to prove otherwise, one decision at a time.

## The Question DIAL Answers

Given any task modeled as a state machine: how do you know — in dollars, time, and quality — exactly what it would cost to turn that task over to a minimally competent AI decision-maker? And how involved should humans remain in performing those tasks over the long term as a form of quality control?

## Starting from the Worst Case

DIAL's design started by staring at the most unoptimized version of that question. The worst case scenario: cross every possible model with every possible prompt, generate exponentially more pairwise votes, then compare all of that to the human choice. A combinatorial explosion.

Reduce the problem: not every possible model, but a handful that span the range of cost, quality, and latency. Not every possible prompt, but a best-first-pass prompt for each task and state. Now we have a tractable search.

## Four Dimensions of Optimization

Once the initial specialist pool is running and generating alignment data against human choices, there are four dimensions along which the system can be optimized:

**Strategy — context management.** Adjusting the logic of individual specialists to tune how history and instructions are described in the context. Two specialists using the same model and prompt can produce different proposals depending on how session history is assembled into the context window. The strategy controls what the model sees.

**Model mix.** Adjusting which models are present in the specialist pool. Removing models that consistently fail to predict the human. Adding new models. The pool evolves.

**Prompt iteration.** Iterating on the prompt each specialist uses for a given state. The initial best-first-pass prompt is refined based on observed failure modes — cases where the specialist diverged from the human because the prompt didn't convey the right decision criteria.

**Fine-tuning.** Training new models specialized to a particular state, using the accumulated history of human decisions as training data. The most expensive optimization, but it produces specialists that are purpose-built for a narrow decision.

## What a Specialist Is

A specialist is the unique combination of three things: its strategy for managing context, the prompt it uses to make the decision, and the model parameters it runs on. Changing any of these produces a different specialist, because it changes the function from state to proposed transition.

## The Value of AI Is Not Superiority

It is efficiency. AI is faster and cheaper at narrow tasks where the required context fits within the model's window. DIAL's purpose is to discover — empirically and with precise cost data — which decisions are narrow enough for AI to handle, and what the ongoing human quality-control cost is to maintain that delegation over time.
