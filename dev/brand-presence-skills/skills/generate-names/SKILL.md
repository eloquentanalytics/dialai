---
name: generate-names
description: Generate unique candidate names for a project based on its description and ecosystem research. Use after gathering ecosystem participants to create names that don't conflict with existing projects.
---

# Generate Names

Generate unique candidate names for a project based on its description and ecosystem research.

## Prerequisites

Before generating names, you should have:
1. A clear project description or specification
2. Ecosystem research from `gather-ecosystem-participants` skill
3. Understanding of what platforms/services you'll need names on

## Process

### Step 1: Understand the Project

Review the project documentation to understand:
- **What it does**: Core functionality and value proposition
- **Who it's for**: Target audience and use cases
- **How it's different**: Unique aspects vs competitors
- **Technical stack**: Languages, platforms, frameworks used
- **Tone/personality**: Serious, playful, technical, friendly

### Step 2: Review Ecosystem Names

From your ecosystem research, note:
- Names already taken by competitors
- Common naming patterns in the space
- Prefixes/suffixes frequently used (e.g., `-ai`, `-ml`, `smart-`)
- Gaps where distinctive names could work

### Step 3: Generate Name Categories

Create names in different categories:

#### 1. Descriptive Names
Names that describe what the project does:
- Direct: `AgentBuilder`, `PromptOptimizer`
- Metaphorical: `Compass` (navigation), `Forge` (creation)

#### 2. Abstract/Coined Names
Invented words or combinations:
- Portmanteaus: `Promptify`, `Agentix`
- Phonetic inventions: `Zephyr`, `Nexara`

#### 3. Reference Names
Names that reference concepts:
- Mythology: `Atlas`, `Phoenix`, `Athena`
- Science: `Quanta`, `Vector`, `Tensor`
- Nature: `Cedar`, `Falcon`, `Obsidian`

#### 4. Acronyms/Initialisms
- Meaningful acronyms that spell words
- Memorable letter combinations

### Step 4: Filter Against Ecosystem

For each candidate name, check:
- Is it identical to any ecosystem participant?
- Is it confusingly similar to competitors?
- Does it conflict with well-known projects outside your ecosystem?
- Could it be mistaken for something else?

### Step 5: Output 10 Candidates

Present 10 names with rationale:

```markdown
# Name Candidates for [Project]

## 1. [Name]
- **Type**: [Descriptive/Abstract/Reference/Acronym]
- **Rationale**: [Why this name fits the project]
- **Potential Conflicts**: [Any ecosystem concerns]
- **Variations**: [Possible variants like name-ai, tryname]

## 2. [Name]
...
```

## Naming Guidelines

### Good Names Are:
- **Memorable**: Easy to recall after hearing once
- **Pronounceable**: Can be said aloud clearly
- **Spellable**: People can type it from hearing it
- **Searchable**: Unique enough to find via search
- **Scalable**: Works as the project grows
- **Appropriate**: Fits the tone and audience

### Avoid:
- Names too similar to competitors
- Generic terms that are hard to trademark
- Hyphens or numbers (hard to communicate verbally)
- Names with negative connotations in other languages
- Overly long names (aim for 2-3 syllables)
- Names that limit future product expansion

### Technical Considerations:
- Must work as: domain, GitHub org, package name, social handle
- Prefer lowercase-friendly names
- Consider how it looks in code: `import dialectai`
- Think about CLI usage: `dialai run`

## Example Output

For an AI prompt optimization framework:

```markdown
# Name Candidates for Prompt Optimization Framework

## 1. Tunesmith
- **Type**: Descriptive/Metaphorical
- **Rationale**: Combines "tune" (optimization) with "smith" (craft).
  Suggests skilled prompt crafting.
- **Potential Conflicts**: No direct competitors. Music software exists
  but different space.
- **Variations**: tunesmith-ai, trytunesmith

## 2. Promptforge
- **Type**: Descriptive
- **Rationale**: "Forge" implies creation and refinement. Clear
  connection to prompt engineering.
- **Potential Conflicts**: "Forge" is common in dev tools. Check
  for prompt-specific uses.
- **Variations**: prompt-forge, theforge

## 3. Calibrate
- **Type**: Descriptive/Abstract
- **Rationale**: Technical term for fine-tuning/adjustment. Clean,
  professional sound.
- **Potential Conflicts**: Generic word, may have domain issues.
- **Variations**: calibrate-ai, getcalibrate

## 4. Lexica
- **Type**: Abstract
- **Rationale**: Derived from "lexicon." Suggests language/word focus.
- **Potential Conflicts**: lexica.art exists (AI art). Different
  enough space.
- **Variations**: lexica-ai, uselexica

## 5. Aleph
- **Type**: Reference (Hebrew alphabet)
- **Rationale**: First letter, suggests foundation/beginning. Clean,
  memorable.
- **Potential Conflicts**: aleph.im (blockchain). Check availability.
- **Variations**: aleph-ai, getaleph

[...5 more candidates...]
```

## Output

**Document**: `NAME_CANDIDATES.md`

Save this document in your project root. It should contain:
- All 10 candidate names with full rationale
- Categorization by type
- Potential ecosystem conflicts noted
- Recommendation of top 3-5 to pursue

### Required Input
- `PROJECT_DESCRIPTION.md` — for project details and brand personality
- `ECOSYSTEM_PARTICIPANTS.md` — for naming conflicts to avoid

## Next Steps

After generating candidates:
1. Use `generate-name-variations` to expand promising names → `NAME_VARIATIONS.md`
2. Use `select-important-brand-presence-venues` to prioritize platforms → `PLATFORM_PRIORITIES.md`
3. Use `check-name-availability-on-*` skills to verify availability → `NAME_VARIATION_AVAILABILITY.md`
4. Narrow to top 3 candidates based on availability
5. Make final selection considering trademark/legal concerns
