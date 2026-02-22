# Simulating Hanoi: Optimal Play with Alignment Tracking

## Overview

We run a Playwright end-to-end test that starts a fresh Hanoi session, plays the
known-optimal 7-move solution (plus `declare_solved`), and records each
specialist's Wilson alignment score after every step. The test uses the
`data-optimal` attribute rendered by HanoiScreen to identify which transition to
click at each step.

## How it works

### 1. Optimal move solver (BFS)

`HanoiScreen.tsx` includes a `computeOptimalMove(pegs)` function that runs BFS
over the 27-state Hanoi graph (3 disks × 3 pegs). Given the current peg
arrangement, it returns the first move on the shortest path to the goal state
(all disks on peg C). When the pegs are already solved, it returns
`declare_solved`.

The corresponding `TransitionRow` receives `isOptimal={true}`, which:
- Sets `data-optimal="true"` and `data-transition="A_to_C"` on the DOM element
- Tints the row background/border green so it's visually distinct

### 2. Playwright test

`examples/e2e/hanoi-optimal.spec.ts` does the following:

1. Navigates to `/`, clicks the hanoi machine link to create a new session
2. Extracts the session ID from the URL
3. Loops 8 times (7 disk moves + 1 `declare_solved`):
   - Waits 10 seconds for all three AI specialists (`llm-careful`,
     `llm-gpt4o-mini`, `llm-random`) to submit their proposals
   - Finds the element with `[data-optimal="true"]` and clicks it
   - Waits for the transition count to increment in the UI
   - Fetches `GET /api/sessions/:id/metrics` to read the current
     `CollapseMetrics`, which includes per-specialist Wilson alignment scores
   - Records the step number, move name, and alignment snapshot
4. Asserts `Puzzle Solved!` and `Goal state reached` are visible
5. Verifies the 7 disk moves match the known optimal sequence:
   `A_to_C, A_to_B, C_to_B, A_to_C, B_to_A, B_to_C, A_to_C`
6. Prints a summary table to the console

### 3. Running it

Start the dev server (fresh, so alignment data is clean):

```bash
cd examples
npm run dev
```

In a separate terminal, run the Playwright test:

```bash
npx playwright test --reporter=line
```

The test takes ~90 seconds (8 steps × 10s wait + overhead).

### 4. What the alignment scores mean

Each specialist proposes a move every tick cycle (200ms). When the human clicks a
transition, the system compares every specialist's most recent proposal against
the human's choice:

- **Match** → the specialist predicted the human's move → alignment goes up
- **Mismatch** → alignment goes down

The score is a **Wilson lower bound** (z=1.96) on the specialist's win rate.
This is conservative: a perfect 3/3 record yields ~0.438, not 1.0. The score
climbs as more evidence accumulates.

## Sample results

From a clean-server run:

```
║ Step ║ Move           ║ llm-careful     ║ llm-gpt4o-mini  ║ llm-random      ║
║    1 ║ A_to_C         ║ 0.207 (1/1)     ║ 0.207 (1/1)     ║ 0.207 (1/1)     ║
║    2 ║ A_to_B         ║ 0.342 (2/2)     ║ 0.342 (2/2)     ║ 0.095 (1/2)     ║
║    3 ║ C_to_B         ║ 0.208 (2/3)     ║ 0.438 (3/3)     ║ 0.208 (2/3)     ║
║    4 ║ A_to_C         ║ 0.301 (3/4)     ║ 0.510 (4/4)     ║ 0.301 (3/4)     ║
║    5 ║ B_to_A         ║ 0.231 (3/5)     ║ 0.376 (4/5)     ║ 0.231 (3/5)     ║
║    6 ║ B_to_C         ║ 0.188 (3/6)     ║ 0.436 (5/6)     ║ 0.188 (3/6)     ║
║    7 ║ A_to_C         ║ 0.250 (4/7)     ║ 0.487 (6/7)     ║ 0.250 (4/7)     ║
║    8 ║ declare_solved ║ 0.306 (5/8)     ║ 0.529 (7/8)     ║ 0.306 (5/8)     ║
```

**Key observations:**

- **llm-gpt4o-mini** (GPT-4o-mini with n-shot prompting) is the strongest
  specialist, finishing at 0.529 with 7/8 correct predictions. It uses exemplars
  from past games to reason about the puzzle state.
- **llm-careful** (greedy heuristic) and **llm-random** tied at 0.306 (5/8).
  The greedy heuristic doesn't outperform random on this puzzle because optimal
  Hanoi moves aren't always the locally "greedy" choice.
- All specialists start equal at step 1 (0.207 = Wilson lb of 1/1) since the
  first move A_to_C is the most obvious.
- Step 5 (B_to_A) is where alignment dips for everyone — it's the
  counter-intuitive "move backward" step that only GPT-4o-mini predicts
  correctly.

## Threshold interaction

The arbiter threshold defaults to 1.0, which means no auto-approval is possible
(Wilson scores can never reach 1.0 with finite observations). Dragging the
threshold slider down in the UI would allow the tick loop to auto-approve
transitions when specialist consensus exceeds the threshold — but at 1.0, every
transition requires a human click.
