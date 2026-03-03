---
name: spec-for-ralph
description: Converts rough feature ideas into Ralph-ready implementation specifications with explicit scope, trigger phrases, phases, testable acceptance criteria, failure handling, and completion signals. Use when the user wants to write or improve a PRD, engineering spec, implementation brief, task plan, or autonomous-loop prompt for Claude Code or Ralph Wiggum.
disable-model-invocation: false
---

# Spec for Ralph

## Purpose

Turn ambiguous software requests into **execution-ready specifications** that work well for autonomous or semi-autonomous Claude Code workflows, especially Ralph-style loops.

This skill should optimize for:
- unambiguous scope
- concrete deliverables
- testable acceptance criteria
- incremental phases
- built-in self-correction
- explicit stopping conditions
- low-risk execution

If the user provides a messy brief, transform it into a clean spec.
If the user provides an existing spec, review and strengthen it.

---

## Core principle

A good Ralph-ready spec is not just descriptive. It is an **operational contract**.

It must tell Claude:
1. **What to build**
2. **What not to build**
3. **How success will be verified**
4. **What order to work in**
5. **What to do when blocked**
6. **What exact condition means “done”**

---

## When this skill should be used

Use this skill when the user asks to:
- write a PRD
- write or improve a technical specification
- create an implementation brief
- prepare a prompt for Claude Code or Ralph
- make acceptance criteria more testable
- convert a vague feature request into a build plan
- make a spec better for autonomous execution
- break work into phases or milestones
- define “done”

Do not use this skill when the user only wants code immediately and does not want planning/specification help.

---

## Required output behavior

When invoked, produce these sections in order unless the user asks for a different format:

1. **Executive Summary**
2. **Objective**
3. **In Scope**
4. **Out of Scope**
5. **Assumptions and Constraints**
6. **Implementation Plan**
7. **Acceptance Criteria**
8. **Validation and Tests**
9. **Failure and Recovery Rules**
10. **Completion Signal**
11. **Ralph Prompt Draft**
12. **Open Questions**

If the user already supplied a spec, first add:

- **Spec Weaknesses Found**
- **Recommended Improvements**

---

## How to rewrite a spec

### Step 1: Extract the real objective

Rewrite the request as a single sentence:

- who/what is changing
- what capability is needed
- what result must exist when done

Prefer:
- “Build X so Y can do Z”

Avoid:
- fluffy product language
- abstract aspirations without observable output

---

### Step 2: Separate scope from aspiration

Create:
- **In Scope**
- **Out of Scope**

Be strict.

Anything not clearly required should go into:
- Out of Scope
- Future Work
- Open Questions

This is especially important for autonomous loops, because underspecified scope expands unpredictably.

---

### Step 3: Convert vague goals into observable deliverables

Translate statements like:
- “make it robust”
- “make it production ready”
- “improve the UX”
- “support edge cases”

into concrete outputs such as:
- tests added
- retries implemented
- error messages standardized
- loading and empty states present
- docs updated
- lint/type/test/build all passing

Never leave quality words undefined.

---

### Step 4: Force testable acceptance criteria

Every acceptance criterion should be something a reviewer can verify.

Good criteria are phrased like:
- “Given X, when Y, then Z”
- “Command A exits with code 0”
- “All tests in file/path pass”
- “Endpoint returns 200 with schema S”
- “The page renders states A, B, and C”
- “No TypeScript errors remain”
- “README includes setup, usage, and limitations”

Bad criteria:
- “Works well”
- “Looks polished”
- “Handles errors gracefully”
- “Is scalable”
- “Feels intuitive”

When possible, create acceptance criteria at three levels:
1. **Functional**
2. **Quality**
3. **Operational**

---

### Step 5: Break execution into phases

Default phase structure:

#### Phase 1: Foundations
- scaffold
- interfaces
- test harness
- failing tests or validation targets

#### Phase 2: Core functionality
- implement main feature path
- make main tests pass

#### Phase 3: Hardening
- edge cases
- validation
- error handling
- docs
- cleanup

#### Phase 4: Verification
- full test run
- typecheck/lint/build
- final review against acceptance criteria

If the project is large, further divide into milestones.

---

### Step 6: Add self-correction instructions

Ralph-style loops perform better when the spec explicitly says how to recover from failure.

Always add a recovery section with instructions like:
1. Run tests or checks after each meaningful change.
2. If tests fail, inspect the failure and fix the smallest root cause first.
3. If blocked after repeated attempts, document the blocker, attempted fixes, and the minimal decision needed from the operator.
4. Do not declare completion while any required acceptance criterion is unmet.
5. Prefer incremental verified progress over broad speculative rewrites.

---

### Step 7: Define an exact stopping condition

Create a **Completion Signal** section.

It should include:
- the exact completion phrase
- the conditions that must be true before using it

Example:
- Output exactly `COMPLETE` only when:
  - all listed acceptance criteria are met
  - required tests pass
  - docs are updated
  - no blocking errors remain

If the user wants a Ralph-compatible phrase, preserve their requested completion signal.

---

## Review checklist

When reviewing or generating a spec, check for all of the following:

- Is the objective concrete?
- Is scope bounded?
- Are out-of-scope items explicit?
- Are acceptance criteria testable?
- Are phases incremental?
- Are validation steps stated?
- Are failure rules included?
- Is completion explicitly defined?
- Is there any vague adjective left undefined?
- Could a coding agent act on this without asking 10 follow-up questions?

If not, fix it.

---

## Preferred writing style

Use:
- direct language
- bullet lists
- short sections
- concrete file names / commands / outputs when available
- explicit assumptions

Avoid:
- marketing prose
- unnecessary background
- duplicated requirements
- hidden dependencies
- undefined quality language

---

## Output templates

### Template A: Spec skeleton

```md
# [Feature Name]

## Executive Summary
[1 short paragraph]

## Objective
[Single clear sentence]

## In Scope
- ...

## Out of Scope
- ...

## Assumptions and Constraints
- ...
- ...

## Implementation Plan

### Phase 1: Foundations
- ...

### Phase 2: Core Functionality
- ...

### Phase 3: Hardening
- ...

### Phase 4: Verification
- ...

## Acceptance Criteria

### Functional
- [Given/When/Then or equivalent]
- ...

### Quality
- ...
- ...

### Operational
- ...
- ...

## Validation and Tests
- Run: `...`
- Verify: `...`
- Expected result: `...`

## Failure and Recovery Rules
1. ...
2. ...
3. ...

## Completion Signal
Output exactly `[COMPLETION_SIGNAL]` only when:
- ...
- ...
- ...

## Ralph Prompt Draft
[Short operator-facing prompt optimized for Ralph]

## Open Questions
- ...
````

### Template B: Ralph prompt draft

When writing the Ralph-ready prompt, use this structure:

```md
Implement [feature name].

Constraints:
- [constraint]
- [constraint]

Required deliverables:
- [deliverable]
- [deliverable]

Acceptance criteria:
- [testable criterion]
- [testable criterion]

Execution rules:
1. Start by identifying the smallest workable implementation.
2. Write or run verification checks as early as possible.
3. After each meaningful change, validate progress.
4. If validation fails, fix the root cause before continuing.
5. If blocked after repeated attempts, report the blocker and the smallest needed decision.
6. Do not claim completion until every acceptance criterion is satisfied.

Output exactly `[COMPLETION_SIGNAL]` when all criteria are met.
```

---

## Transformation rules for common weak inputs

If the user gives:

* **“build X”** → add scope, constraints, tests, done criteria
* **a PRD** → turn it into engineering phases and verification criteria
* **a ticket list** → group into milestones with exit criteria
* **a vague feature idea** → produce spec + questions + Ralph draft
* **an overlong spec** → condense into execution-ready version
* **an autonomous-loop prompt** → strengthen it with acceptance tests and stop conditions

---

## Examples

### Example 1: vague request

User says:
“Build a todo API and make it good.”

Produce:

* a narrowed API spec
* explicit CRUD deliverables
* validation requirements
* test targets
* docs requirements
* completion signal

### Example 2: existing PRD

User says:
“Here is my feature brief. Make it good for Ralph.”

Produce:

1. Spec Weaknesses Found
2. Revised execution-ready spec
3. Stronger acceptance criteria
4. Ralph Prompt Draft

### Example 3: large feature

User says:
“Create a complete e-commerce platform.”

Do not leave it as one blob.
Break it into phases such as:

* auth
* catalog
* cart
* checkout
* verification

Then define acceptance criteria per phase.

---

## Troubleshooting

### Problem: The request is too vague

Solution:

* infer a minimal sensible scope
* state assumptions clearly
* include open questions at the end

### Problem: The user asks for “production-ready”

Solution:
Expand into explicit requirements such as:

* tests
* lint/typecheck/build clean
* logging/error handling
* docs
* configuration clarity
* safe defaults

### Problem: The feature is too large for one loop

Solution:

* split into phases
* create milestone-specific completion signals if helpful
* recommend executing one phase at a time

### Problem: Acceptance criteria are still subjective

Solution:
Rewrite each one into an observable check or command result.

---

## Resolving Open Questions

After generating the spec, if the **Open Questions** section is non-empty, you **must** resolve every question before considering the spec complete.

### Procedure

1. For each open question, use the `AskUserQuestion` tool to present the question to the user with concrete options (when applicable).
2. Wait for the user's answer.
3. Update the spec to incorporate the answer:
   - Move resolved decisions into the appropriate section (Assumptions, In Scope, Out of Scope, Acceptance Criteria, etc.)
   - Remove the question from the Open Questions list
   - If the answer introduces new scope or constraints, update Implementation Plan phases and Acceptance Criteria accordingly
4. Repeat until the Open Questions section is empty or contains only items explicitly deferred by the user.
5. When all questions are resolved, confirm to the user that the spec is complete and ready for Ralph.

### Rules

- Do not leave the spec in an ambiguous state. Every open question either gets an answer or an explicit “defer to future work” from the user.
- Do not guess answers to open questions. Ask the user.
- If resolving one question creates a new question, add it to the list and resolve it in the same pass.
- After all questions are resolved, re-run the Review Checklist to confirm the spec is still complete.

---

## Database testing requirements

This project uses PostgreSQL for persistence. When a spec involves database-backed features (new tables, store methods, migrations), the spec **must** include tests for both store backends:

1. **In-memory store** (`store-memory.ts`) -- runs without any external dependencies, always executed
2. **PostgreSQL store** (`store-postgres.ts`) -- requires a running PostgreSQL instance, skipped when `POSTGRES_URL` is not set

### PostgreSQL connection

The local development PostgreSQL runs in Docker with these credentials:
- **User:** `smsbot`
- **Password:** `smsbot`
- **Host:** `localhost:5432`
- **Admin database:** `postgres`
- **Connection string:** `postgresql://smsbot:smsbot@localhost:5432/postgres`
- **Environment variable:** `POSTGRES_URL`

The test helper `src/dialai/test-db.ts` (`createTestDatabase()`) connects to the admin database, creates an isolated test database with a random name, runs all migrations, and returns a cleanup function. Tests use `describe.skipIf(!process.env.POSTGRES_URL)` to skip gracefully when no database is available.

### What to include in specs

For any feature that touches the `Store` interface or database schema:

- **Store conformance tests** in `src/dialai/store.test.ts` using the parameterized `runStoreTests()` pattern (runs against both memory and postgres stores automatically)
- **PostgreSQL-specific integration tests** in `tests/integration/` for schema validation, constraint enforcement, triggers, rules, or other database-level behavior that does not apply to the in-memory store
- **Migration file** in `src/dialai/migrations/` registered in `migrate.ts`
- **Validation commands** should include both:
  - `npm test` (memory-only, no database needed)
  - `POSTGRES_URL="postgresql://smsbot:smsbot@localhost:5432/postgres" npm test` (full suite including PostgreSQL)

### Running PostgreSQL tests

Include these instructions in the spec's Validation section:

```bash
# Memory-only (always works)
npm test

# Full suite including PostgreSQL
POSTGRES_URL="postgresql://smsbot:smsbot@localhost:5432/postgres" npm test
```

---

## Final instruction

Your job is to make the specification **easier for Claude to execute correctly** and **easier for a human to verify objectively**.

Whenever in doubt:

* make it narrower
* make it more testable
* make “done” more explicit
