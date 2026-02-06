# Brand Presence Skills — Registry Index

This repository is a **markdown-only** registry of Claude / Agent Skills for researching and establishing brand presence across platforms. Each skill is an agent-compatible folder under `skills/` containing a `SKILL.md` file (YAML frontmatter + instructions).

**Note:** This root `SKILLS.md` is a human-facing index and is **not** itself a skill.

---

## Quick Start

**New to brand presence selection?** Start with the `select-a-brand-presence` skill — it orchestrates all other skills into a complete workflow:

→ [`skills/select-a-brand-presence/SKILL.md`](skills/select-a-brand-presence/SKILL.md)

---

## The Brand Presence Workflow

These skills are designed to work together in a systematic workflow. Each phase produces a distinct document:

```
┌──────────────────────────────────────────────────────────────────┐
│  1. DOCUMENT YOUR IDEA                                           │
│     Define what you're building, for whom, and why               │
│     → documenting-your-idea                                      │
│     📄 PROJECT_DESCRIPTION.md                                    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  2. RESEARCH YOUR ECOSYSTEM                                      │
│     Identify competitors, partners, and naming conflicts         │
│     → gather-ecosystem-participants                              │
│     📄 ECOSYSTEM_PARTICIPANTS.md                                 │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  3. GENERATE NAMES                                               │
│     Create 10 unique candidates that don't conflict              │
│     → generate-names                                             │
│     📄 NAME_CANDIDATES.md                                        │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  4. CREATE VARIATIONS                                            │
│     Apply patterns (try-, get-, -ai, -hq) to find availability   │
│     → generate-name-variations                                   │
│     📄 NAME_VARIATIONS.md                                        │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  5. PRIORITIZE PLATFORMS                                         │
│     Identify which venues matter most for your project           │
│     → select-important-brand-presence-venues                     │
│     📄 PLATFORM_PRIORITIES.md                                    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  6. CHECK AVAILABILITY                                           │
│     Verify each variation across prioritized platforms           │
│     → check-name-availability-on-* (18 skills)                   │
│     📄 NAME_VARIATION_AVAILABILITY.md (continuously updated)     │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌──────────────────────────────────────────────────────────────────┐
│  7. SELECT & DOCUMENT                                            │
│     Choose the best name and document your brand presence        │
│     → select-a-brand-presence (final output)                     │
│     📄 {CHOSEN_NAME}_BRAND_PRESENCE.md                           │
└──────────────────────────────────────────────────────────────────┘
```

### Output Documents Summary

| Phase | Document | Description |
|-------|----------|-------------|
| 1 | `PROJECT_DESCRIPTION.md` | Project details, audience, brand personality |
| 2 | `ECOSYSTEM_PARTICIPANTS.md` | Competitors, partners, their platform handles |
| 3 | `NAME_CANDIDATES.md` | 10 candidate names with rationale |
| 4 | `NAME_VARIATIONS.md` | Variation matrix for top candidates |
| 5 | `PLATFORM_PRIORITIES.md` | Tiered platform importance list |
| 6 | `NAME_VARIATION_AVAILABILITY.md` | Availability tracking with per-platform tables |
| 7 | `{NAME}_BRAND_PRESENCE.md` | Final brand presence documentation |

---

## How This Repo Is Organized

- `skills/<skill-name>/SKILL.md` — Agent skill files (Claude/Agent Skills compatible)
- `SKILLS.md` — This file (human registry / index)
- `README.md` — Repo overview
- `CONTRIBUTING.md` — How to add skills and frontmatter rules

---

## Skills Index

### Orchestration Skill

#### Select a Brand Presence — `skills/select-a-brand-presence/`
**The entry point.** A complete, end-to-end workflow for selecting a brand name and establishing consistent presence across platforms. Orchestrates all other skills into a systematic 8-phase process that produces a final `BRAND_PRESENCE.md` document.
→ [`skills/select-a-brand-presence/SKILL.md`](skills/select-a-brand-presence/SKILL.md)

---

### Research & Planning Skills

#### Documenting Your Idea — `skills/documenting-your-idea/`
Create a structured project description document that captures what your service/tool does, who it's for, and how it fits in the ecosystem. **Use as the first step** before any other brand presence work.
→ [`skills/documenting-your-idea/SKILL.md`](skills/documenting-your-idea/SKILL.md)

#### Gather Ecosystem Participants — `skills/gather-ecosystem-participants/`
Research competitors, partners, and ecosystem participants. Collect their domain names, social handles, and platform identifiers to understand naming conflicts and avoid choosing a name that causes confusion.
→ [`skills/gather-ecosystem-participants/SKILL.md`](skills/gather-ecosystem-participants/SKILL.md)

#### Generate Names — `skills/generate-names/`
Given a project description and ecosystem research, generate 10 unique candidate names that don't conflict with existing participants. Considers brand personality, audience, and technical requirements.
→ [`skills/generate-names/SKILL.md`](skills/generate-names/SKILL.md)

#### Generate Name Variations — `skills/generate-name-variations/`
Apply common naming patterns (prefixes like `try`, `get`, `use`; suffixes like `ai`, `hq`, `app`) to a base name to find more availability opportunities across platforms.
→ [`skills/generate-name-variations/SKILL.md`](skills/generate-name-variations/SKILL.md)

#### Select Important Brand Presence Venues — `skills/select-important-brand-presence-venues/`
Analyze your ecosystem and project profile to identify which platforms are most critical for your specific project to establish brand presence. Produces a prioritized tier list.
→ [`skills/select-important-brand-presence-venues/SKILL.md`](skills/select-important-brand-presence-venues/SKILL.md)

---

### Name Availability Check Skills

These skills check name availability on specific platforms. Use them during Phase 6 of the brand presence workflow.

#### Domain Availability — `skills/check-domain-availability/`
Check domain registration availability across TLDs (.com, .dev, .io, .ai, etc.) using RDAP, DNS lookups, and registrar APIs.
→ [`skills/check-domain-availability/SKILL.md`](skills/check-domain-availability/SKILL.md)

#### Twitter/X — `skills/check-name-availability-on-twitter/`
Check username availability on Twitter/X.
→ [`skills/check-name-availability-on-twitter/SKILL.md`](skills/check-name-availability-on-twitter/SKILL.md)

#### Medium — `skills/check-name-availability-on-medium/`
Check username availability on Medium.
→ [`skills/check-name-availability-on-medium/SKILL.md`](skills/check-name-availability-on-medium/SKILL.md)

#### Product Hunt — `skills/check-name-availability-on-product-hunt/`
Check product slug availability on Product Hunt.
→ [`skills/check-name-availability-on-product-hunt/SKILL.md`](skills/check-name-availability-on-product-hunt/SKILL.md)

#### GitHub — `skills/check-name-availability-on-github/`
Check organization/user name and repository name availability on GitHub.
→ [`skills/check-name-availability-on-github/SKILL.md`](skills/check-name-availability-on-github/SKILL.md)

#### npm — `skills/check-name-availability-on-npm/`
Check package name availability on npm registry.
→ [`skills/check-name-availability-on-npm/SKILL.md`](skills/check-name-availability-on-npm/SKILL.md)

#### PyPI — `skills/check-name-availability-on-pypi/`
Check package name availability on Python Package Index.
→ [`skills/check-name-availability-on-pypi/SKILL.md`](skills/check-name-availability-on-pypi/SKILL.md)

#### Bluesky — `skills/check-name-availability-on-bluesky/`
Check handle availability on Bluesky.
→ [`skills/check-name-availability-on-bluesky/SKILL.md`](skills/check-name-availability-on-bluesky/SKILL.md)

#### LinkedIn — `skills/check-name-availability-on-linkedin/`
Check company page vanity URL availability on LinkedIn.
→ [`skills/check-name-availability-on-linkedin/SKILL.md`](skills/check-name-availability-on-linkedin/SKILL.md)

#### Reddit — `skills/check-name-availability-on-reddit/`
Check subreddit name availability on Reddit.
→ [`skills/check-name-availability-on-reddit/SKILL.md`](skills/check-name-availability-on-reddit/SKILL.md)

#### YouTube — `skills/check-name-availability-on-youtube/`
Check channel handle availability on YouTube.
→ [`skills/check-name-availability-on-youtube/SKILL.md`](skills/check-name-availability-on-youtube/SKILL.md)

#### Substack — `skills/check-name-availability-on-substack/`
Check publication subdomain availability on Substack.
→ [`skills/check-name-availability-on-substack/SKILL.md`](skills/check-name-availability-on-substack/SKILL.md)

#### Dev.to — `skills/check-name-availability-on-devto/`
Check username availability on Dev.to.
→ [`skills/check-name-availability-on-devto/SKILL.md`](skills/check-name-availability-on-devto/SKILL.md)

#### Hacker News — `skills/check-name-availability-on-hackernews/`
Check username availability on Hacker News.
→ [`skills/check-name-availability-on-hackernews/SKILL.md`](skills/check-name-availability-on-hackernews/SKILL.md)

#### Hugging Face — `skills/check-name-availability-on-huggingface/`
Check organization/user name availability on Hugging Face.
→ [`skills/check-name-availability-on-huggingface/SKILL.md`](skills/check-name-availability-on-huggingface/SKILL.md)

#### Docker Hub — `skills/check-name-availability-on-docker-hub/`
Check namespace and repository name availability on Docker Hub.
→ [`skills/check-name-availability-on-docker-hub/SKILL.md`](skills/check-name-availability-on-docker-hub/SKILL.md)

#### Homebrew — `skills/check-name-availability-on-homebrew/`
Check formula name availability on Homebrew.
→ [`skills/check-name-availability-on-homebrew/SKILL.md`](skills/check-name-availability-on-homebrew/SKILL.md)

#### VS Code Marketplace — `skills/check-name-availability-on-vscode-marketplace/`
Check extension/publisher name availability on VS Code Marketplace.
→ [`skills/check-name-availability-on-vscode-marketplace/SKILL.md`](skills/check-name-availability-on-vscode-marketplace/SKILL.md)
