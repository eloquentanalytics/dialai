# Brand Presence Skills

A **markdown-only registry** of Claude / Agent Skills for researching and establishing brand presence across platforms. These skills help you systematically select a brand name with broad availability and consistent identity across all important venues.

## Quick Start

**Start here:** Use the `select-a-brand-presence` skill as your entry point. It orchestrates all other skills into a complete workflow.

```
skills/select-a-brand-presence/SKILL.md
```

## The Problem

When launching a new project, you need to:
1. Pick a name that represents your project well
2. Ensure it doesn't conflict with competitors or existing projects
3. Secure it consistently across many platforms (domain, GitHub, npm, Twitter, etc.)
4. Handle situations where your preferred name isn't available everywhere

Doing this manually is tedious and error-prone. These skills provide a systematic approach.

## The Workflow

The skills guide you through an 8-phase process, each producing a distinct document:

```
Phase 1: Document Your Idea
         │
         │  What does it do? Who is it for?
         │  → documenting-your-idea
         │  📄 PROJECT_DESCRIPTION.md
         ▼
Phase 2: Research Your Ecosystem
         │
         │  Who are competitors? What names do they use?
         │  → gather-ecosystem-participants
         │  📄 ECOSYSTEM_PARTICIPANTS.md
         ▼
Phase 3: Generate Names
         │
         │  Create 10 candidates that don't conflict
         │  → generate-names
         │  📄 NAME_CANDIDATES.md
         ▼
Phase 4: Create Variations
         │
         │  Apply patterns: try-, get-, -ai, -hq
         │  → generate-name-variations
         │  📄 NAME_VARIATIONS.md
         ▼
Phase 5: Prioritize Platforms
         │
         │  Which venues matter most for YOUR project?
         │  → select-important-brand-presence-venues
         │  📄 PLATFORM_PRIORITIES.md
         ▼
Phase 6: Check Availability
         │
         │  Verify each variation across platforms
         │  → check-name-availability-on-* (18 skills)
         │  📄 NAME_VARIATION_AVAILABILITY.md
         ▼
Phase 7: Analyze & Select
         │
         │  Choose name with broadest consistent availability
         ▼
Phase 8: Document Brand Presence
         │
         │  Final brand presence document
         │  📄 {CHOSEN_NAME}_BRAND_PRESENCE.md
         ▼
       Done!
```

### Output Documents

| Phase | Document | Purpose |
|-------|----------|---------|
| 1 | `PROJECT_DESCRIPTION.md` | Project details, audience, brand personality |
| 2 | `ECOSYSTEM_PARTICIPANTS.md` | Competitors, partners, their handles |
| 3 | `NAME_CANDIDATES.md` | 10 candidate names with rationale |
| 4 | `NAME_VARIATIONS.md` | Variation matrix for top candidates |
| 5 | `PLATFORM_PRIORITIES.md` | Tiered platform importance list |
| 6 | `NAME_VARIATION_AVAILABILITY.md` | Availability tracking across all platforms |
| 8 | `{NAME}_BRAND_PRESENCE.md` | Final brand presence documentation |

## Key Principles

### 1. Consistency Over Perfection
A slightly less perfect name that's available everywhere beats a perfect name with gaps. `tryatlas` consistently across all platforms is better than `atlas` on some and `atlashq` on others.

### 2. Check Early, Check Often
Don't fall in love with a name before checking availability. The skills help you generate multiple candidates and variations so you have options.

### 3. Prioritize What Matters
Not every platform matters equally. A Python library doesn't need npm; a B2B SaaS doesn't need Reddit. The workflow helps you identify your must-haves vs. nice-to-haves.

### 4. Document Everything
Each phase produces a distinct document. The final output is `{CHOSEN_NAME}_BRAND_PRESENCE.md` that records:
- Your selected name and any variations
- Registrations across all platforms
- Defensive registrations (domains, misspellings)
- Brand guidelines for usage

## Directory Structure

```
brand-presence-skills/
├── SKILLS.md                   # Skill registry / index
├── README.md                   # This file
├── CONTRIBUTING.md             # How to add/modify skills
└── skills/
    │
    │── select-a-brand-presence/        # Entry point - orchestrates everything
    │   └── SKILL.md
    │
    ├── documenting-your-idea/          # Phase 1
    │   └── SKILL.md
    ├── gather-ecosystem-participants/  # Phase 2
    │   └── SKILL.md
    ├── generate-names/                 # Phase 3
    │   └── SKILL.md
    ├── generate-name-variations/       # Phase 4
    │   └── SKILL.md
    ├── select-important-brand-presence-venues/  # Phase 5
    │   └── SKILL.md
    │
    └── check-name-availability-on-*/   # Phase 6 (18 skills)
        ├── check-domain-availability/
        ├── check-name-availability-on-twitter/
        ├── check-name-availability-on-github/
        ├── check-name-availability-on-npm/
        ├── check-name-availability-on-pypi/
        └── ... (14 more platforms)
```

## Supported Platforms

The availability check skills cover:

| Category | Platforms |
|----------|-----------|
| **Web** | Domain (.com, .dev, .io, .ai) |
| **Code Hosting** | GitHub |
| **Package Registries** | npm, PyPI, Homebrew, Docker Hub |
| **Social** | Twitter/X, LinkedIn, Bluesky |
| **Community** | Reddit, Hacker News, Discord |
| **Content** | Medium, Substack, Dev.to, YouTube |
| **Launch** | Product Hunt |
| **ML/AI** | Hugging Face |
| **Extensions** | VS Code Marketplace |

## Usage

### With Claude Code

The skills are designed for use with Claude Code or any Agent Skills-compatible tool:

```
> Use the select-a-brand-presence skill to help me choose a name for my new Python ML library
```

### Manual Reference

Each `SKILL.md` contains:
- YAML frontmatter with `name` and `description` for agent discovery
- Step-by-step instructions for execution
- Expected inputs and outputs
- Examples and edge cases

## Example Output

After completing the workflow, you'll have a `{CHOSEN_NAME}_BRAND_PRESENCE.md` like:

```markdown
# Brand Presence — PromptForge

## Selected Brand Name
**Primary Name**: promptforge
**Variations Used**: promptforge (consistent everywhere)

## Platform Registrations

### Tier 1: Must Have (Secured)
| Platform | Handle/Name | URL | Status |
|----------|-------------|-----|--------|
| Domain | promptforge.dev | https://promptforge.dev | ✅ Registered |
| GitHub | promptforge | https://github.com/promptforge | ✅ Created |
| Twitter/X | @promptforge | https://x.com/promptforge | ✅ Registered |
| PyPI | promptforge | https://pypi.org/project/promptforge | ✅ Reserved |

### Tier 2: Should Have
| Platform | Handle/Name | Status |
|----------|-------------|--------|
| Discord | promptforge | ✅ Created |
| Product Hunt | promptforge | ⏳ Pending launch |

...
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on:
- Adding new platform availability skills
- Updating existing skills
- Skill file format and frontmatter requirements

## License

MIT
