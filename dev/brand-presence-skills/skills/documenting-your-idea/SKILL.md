---
name: documenting-your-idea
description: Create a structured project description document that captures what your service/tool does, who it's for, and how it fits in the ecosystem. Use as the first step before researching ecosystem participants or generating names.
---

# Documenting Your Idea

Create a structured project description document that serves as the foundation for all brand presence decisions.

## Purpose

Before you can research competitors, generate names, or check availability, you need a clear, documented understanding of:
- What your project does
- Who it's for
- How it's different from alternatives
- What success looks like

This document becomes the input for ecosystem research and name generation.

## The Project Description Document

Create a markdown document with the following structure:

### Template

```markdown
# [Working Title] — Project Description

## One-Line Summary
[A single sentence describing what this project does]

## Problem Statement
[What problem are you solving? Why does it matter?]

## Solution Overview
[How does your project solve the problem? What's the approach?]

## Target Audience

### Primary Users
- [Who will use this directly?]
- [What's their role/title?]
- [What's their technical level?]

### Secondary Users
- [Who else benefits?]
- [Downstream users?]

## Key Features
1. [Core feature 1]
2. [Core feature 2]
3. [Core feature 3]
...

## Technical Details

### Technology Stack
- **Language(s)**: [Primary languages]
- **Framework(s)**: [If applicable]
- **Dependencies**: [Key dependencies/platforms]

### Distribution Model
- [ ] Package registry (npm, PyPI, etc.)
- [ ] Docker container
- [ ] Desktop application
- [ ] Web application
- [ ] CLI tool
- [ ] IDE extension
- [ ] API service
- [ ] Library/SDK

### Open Source?
- [ ] Yes — License: [MIT/Apache/GPL/etc.]
- [ ] No — Commercial/Proprietary

## Competitive Landscape

### Direct Competitors
[Who solves the same problem?]

### Adjacent Solutions
[Who solves related problems differently?]

### Differentiation
[What makes your approach unique?]

## Success Metrics
[How will you measure success?]
- Users/downloads
- GitHub stars
- Revenue
- Community size
- Other metrics

## Brand Personality

### Tone
- [ ] Professional/Enterprise
- [ ] Friendly/Approachable
- [ ] Technical/Developer-focused
- [ ] Playful/Creative
- [ ] Minimal/Clean

### Values
[What values should the brand communicate?]
- Innovation
- Simplicity
- Reliability
- Speed
- Security
- Community
- Other: [specify]

## Initial Name Ideas
[Any working titles or name ideas you already have?]
1.
2.
3.

## Platform Priorities
[Which platforms matter most for your project?]

### Must Have
- [ ] Domain (.com/.dev/.ai)
- [ ] GitHub
- [ ] npm / PyPI / other registry
- [ ] Twitter/X
- [ ] Discord
- [ ] Other: [specify]

### Nice to Have
- [ ] LinkedIn
- [ ] YouTube
- [ ] Product Hunt
- [ ] Other: [specify]
```

## Process

### Step 1: Fill Out Core Sections

Start with the essentials:
1. One-line summary
2. Problem statement
3. Solution overview
4. Target audience

**Tip**: If you can't explain it simply, you don't understand it well enough yet.

### Step 2: Define Technical Details

Document:
- Technology stack (this affects which registries matter)
- Distribution model (this affects platform priorities)
- Open source status (affects community platforms)

### Step 3: Map the Competitive Landscape

Even a rough sketch helps:
- Who are 3-5 direct competitors?
- What adjacent solutions exist?
- What's your unique angle?

This feeds directly into the `gather-ecosystem-participants` skill.

### Step 4: Establish Brand Personality

Consider:
- Who is your audience? (Enterprise = professional tone; developers = technical/playful)
- What values resonate? (AI tool might emphasize innovation; security tool might emphasize reliability)

This influences name generation style.

### Step 5: Note Initial Ideas

Capture any names you've already considered:
- Working titles
- Domain ideas you've checked
- Names you like from other projects

These become starting points for `generate-names`.

## Example

```markdown
# PromptForge — Project Description

## One-Line Summary
An open-source Python framework for optimizing and versioning LLM prompts.

## Problem Statement
LLM application developers iterate on prompts manually, losing track of what
works. There's no systematic way to test, version, and optimize prompts across
different models.

## Solution Overview
PromptForge provides a structured approach to prompt engineering with:
- Version control for prompts (like git for prompts)
- A/B testing framework for comparing prompt variants
- Automatic optimization using feedback loops
- Model-agnostic design (works with any LLM API)

## Target Audience

### Primary Users
- ML engineers building LLM applications
- Backend developers integrating AI features
- Technical level: Intermediate to advanced Python developers

### Secondary Users
- Product managers evaluating prompt performance
- Data scientists analyzing prompt effectiveness

## Key Features
1. Prompt versioning with branching/merging
2. Built-in A/B testing for prompt variants
3. Automatic prompt optimization via DSPy integration
4. CLI for local development
5. Dashboard for team collaboration

## Technical Details

### Technology Stack
- **Language(s)**: Python 3.10+
- **Framework(s)**: FastAPI (optional server), Click (CLI)
- **Dependencies**: OpenAI SDK, Anthropic SDK, DSPy

### Distribution Model
- [x] Package registry (PyPI)
- [x] Docker container
- [x] CLI tool
- [ ] Desktop application
- [ ] Web application
- [ ] IDE extension
- [ ] API service
- [x] Library/SDK

### Open Source?
- [x] Yes — License: MIT

## Competitive Landscape

### Direct Competitors
- PromptLayer — prompt management platform (SaaS)
- LangSmith — LangChain's prompt testing tool
- Promptfoo — CLI tool for prompt testing

### Adjacent Solutions
- DSPy — programmatic prompt optimization
- Weights & Biases — ML experiment tracking

### Differentiation
- Fully open source (vs. SaaS competitors)
- Git-like versioning mental model
- Works with any LLM, not tied to a framework

## Success Metrics
- PyPI downloads: 10K/month in year 1
- GitHub stars: 5K in year 1
- Active contributors: 20+ in year 1

## Brand Personality

### Tone
- [x] Technical/Developer-focused
- [x] Professional/Enterprise
- [ ] Friendly/Approachable
- [ ] Playful/Creative
- [ ] Minimal/Clean

### Values
- Reliability (your prompts are versioned and tested)
- Simplicity (git-like mental model)
- Community (open source first)

## Initial Name Ideas
1. PromptForge
2. PromptSmith
3. Prompter

## Platform Priorities

### Must Have
- [x] Domain (.com/.dev/.ai)
- [x] GitHub
- [x] PyPI
- [x] Twitter/X
- [x] Discord

### Nice to Have
- [ ] LinkedIn
- [x] YouTube (tutorials)
- [x] Product Hunt (launch)
- [x] Hugging Face (model integrations)
```

## Output

**Document**: `PROJECT_DESCRIPTION.md`

Save this document in your project root. It becomes the foundation for all subsequent brand presence work.

This document is the input for:
- `gather-ecosystem-participants` — use competitors/adjacent solutions
- `generate-names` — use summary, differentiation, brand personality
- `select-important-brand-presence-venues` — use platform priorities

### Document Workflow

```
PROJECT_DESCRIPTION.md (Phase 1)
         │
         ▼
ECOSYSTEM_PARTICIPANTS.md (Phase 2)
         │
         ▼
NAME_CANDIDATES.md (Phase 3)
         │
         ▼
NAME_VARIATIONS.md (Phase 4)
         │
         ▼
PLATFORM_PRIORITIES.md (Phase 5)
         │
         ▼
NAME_VARIATION_AVAILABILITY.md (Phase 6)
         │
         ▼
BRAND_PRESENCE.md (Phase 8)
```

## Tips

1. **Be Specific**: "AI tool" is too vague; "Python library for LLM prompt optimization" is actionable
2. **Know Your Audience**: This affects everything from name tone to platform priorities
3. **Identify Competitors Early**: Even if you think you're unique, you have competitors
4. **Don't Skip Brand Personality**: It influences name selection significantly
5. **Revisit and Refine**: This document should evolve as you learn more

## Related Skills

- `select-a-brand-presence` — The overarching workflow that uses this document
- `gather-ecosystem-participants` — Next step: research competitors in depth
- `generate-names` — Uses this document to create relevant name candidates
