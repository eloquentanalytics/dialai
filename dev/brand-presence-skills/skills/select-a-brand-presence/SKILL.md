---
name: select-a-brand-presence
description: The complete workflow for selecting and documenting a brand presence across platforms. Use this as the entry point to systematically choose a name with broad availability and consistent identity across all important venues.
---

# Select a Brand Presence

A complete, end-to-end workflow for selecting a brand name and establishing consistent presence across platforms. This skill orchestrates all other brand presence skills into a systematic process.

## Overview

Selecting a brand presence is more than picking a clever name. It requires:
- Understanding what you're building and for whom
- Researching your ecosystem to avoid conflicts
- Generating names that resonate with your audience
- Finding variations that maximize availability
- Prioritizing platforms based on your specific needs
- Documenting your final brand presence strategy

This skill guides you through the entire process.

## Best Practices from the Industry

### Key Principles

**1. Shorter is Better**
Names with 1-3 syllables are easier to remember, type, and say. They work better as domain names and social handles. Examples: Stripe, Notion, Vercel.

**2. Consistency Builds Trust**
A name that matches across domain, GitHub, social handles, and package registries significantly improves professionalism and discoverability. Inconsistency (like `langchain-ai` on GitHub but `langchain` on npm) creates confusion.

**3. Check Everything Early**
Use integrated availability checking to rule out problematic names quickly. A perfect name that's taken everywhere is useless.

**4. Protect Defensively**
Register your brand on platforms you don't plan to use yet. Purchase common misspellings and alternative TLDs. This prevents squatters and maintains consistency.

**5. Name Energy Stays Focused**
Avoid creating multiple brand names for subprojects. Keep brand energy focused on the core name. Use descriptive names for modules/tools (e.g., `projectname-cli`, `projectname-server`).

**6. Consider the Long Term**
Pick a name that can scale. Avoid names that limit future expansion (e.g., "PythonPromptTool" if you might support other languages).

### What Makes a Good Name

| Characteristic | Why It Matters |
|----------------|----------------|
| **Memorable** | Users recall it after one encounter |
| **Pronounceable** | Can be spoken in conversation |
| **Spellable** | People can type it from hearing it |
| **Searchable** | Unique enough to find via search |
| **Appropriate** | Fits your audience and tone |
| **Available** | Can be secured consistently |

### Common Naming Patterns in AI/DevTools/OSS

| Pattern | Examples | Best For |
|---------|----------|----------|
| Abstract/Coined | Vercel, Supabase, Figma | Unique identity, strong trademark |
| Descriptive | LangChain, TensorFlow | Clear purpose, discoverability |
| Metaphorical | Docker, Kubernetes | Technical credibility |
| Reference | Atlas, Phoenix, Apollo | Memorable, storytelling |
| Portmanteau | Elasticsearch, Datadog | Combines concepts |

## The Complete Workflow

### Phase 1: Document Your Idea
**Skill**: `documenting-your-idea`

Create a structured project description covering:
- What the project does (one-line summary)
- Who it's for (target audience)
- How it's different (differentiation)
- Technical details (stack, distribution)
- Brand personality (tone, values)

**Output**: `PROJECT_DESCRIPTION.md`

### Phase 2: Research the Ecosystem
**Skill**: `gather-ecosystem-participants`

Research and document:
- Direct competitors and their names/handles
- Adjacent solutions in your space
- Platform presence patterns in your ecosystem
- Naming conventions and conflicts to avoid

**Output**: `ECOSYSTEM_PARTICIPANTS.md`

### Phase 3: Generate Name Candidates
**Skill**: `generate-names`

Using your project description and ecosystem research:
- Generate 10 unique name candidates
- Categorize by type (descriptive, abstract, reference)
- Note potential conflicts with ecosystem
- Consider brand personality fit

**Output**: `NAME_CANDIDATES.md`

### Phase 4: Create Variations
**Skill**: `generate-name-variations`

For your top candidates:
- Apply prefix patterns (try-, get-, use-)
- Apply suffix patterns (-ai, -hq, -app, -dev)
- Consider domain alternatives (.dev, .ai, .io)
- Create a variation matrix

**Output**: `NAME_VARIATIONS.md`

### Phase 5: Prioritize Platforms
**Skill**: `select-important-brand-presence-venues`

Based on your project profile:
- Score platforms by importance
- Identify must-have vs. nice-to-have
- Create prioritized venue list

**Output**: `PLATFORM_PRIORITIES.md`

### Phase 6: Check Availability
**Skills**: `check-name-availability-on-*`

Systematically check each variation across prioritized platforms:
- Start with Tier 1 (must-have) platforms
- Use the availability check skills for each platform
- Record all results in a single tracking document

**Output**: `NAME_VARIATION_AVAILABILITY.md` (continuously updated)

This document follows a structured format with:
- Common naming variations table showing patterns applied to your base name
- Per-platform sections with availability tables (Name, Date, Available, Link)
- Cross-service summary identifying best available combinations

### Phase 7: Analyze and Select
**Process**: Score and compare options

For each name/variation combination:
1. **Availability Score**: How many priority platforms is it available on?
2. **Consistency Score**: Can you use the same name everywhere?
3. **Quality Score**: How well does it fit your brand?

Select the combination that maximizes:
- Availability on Tier 1 platforms (dealbreaker)
- Consistency across all platforms
- Brand fit and memorability

### Phase 8: Document Final Brand Presence
**Output**: `{CHOSEN_NAME}_BRAND_PRESENCE.md`

Create a comprehensive brand presence document named after your selected brand name (e.g., `PROMPTFORGE_BRAND_PRESENCE.md`). This final document records all platform registrations and serves as the definitive brand presence reference.

## Document Templates

### NAME_VARIATION_AVAILABILITY.md Template

This document tracks all availability checks across platforms. Create it at the start of Phase 6 and update it continuously.

```markdown
# Name Availability Checklist

This checklist tracks availability of name variations across platforms.

---

## Common Naming Variations

Based on your base name (e.g., `projectname`), here are variations to check:

### Top 10 Naming Patterns

| Pattern | Applied to "{name}" |
|---------|---------------------|
| **{name}ai** | {name}ai |
| **{name}oss** | {name}oss |
| **try{name}** | try{name} |
| **get{name}** | get{name} |
| **use{name}** | use{name} |
| **{name}app** | {name}app |
| **{name}hq** | {name}hq |
| **{name}dev** | {name}dev |
| **run{name}** | run{name} |
| **{name}inc** | {name}inc |

---

## Name Variations Availability (Checked {DATE})

### "{name}" + Variations

| Variation | .com | .dev | .io | .ai | npm | PyPI | GitHub |
|-----------|------|------|-----|-----|-----|------|--------|
| {name} | ? | ? | ? | ? | ? | ? | ? |
| {name}ai | ? | ? | ? | ? | ? | ? | ? |
| try{name} | ? | ? | ? | ? | ? | ? | ? |
| get{name} | ? | ? | ? | ? | ? | ? | ? |
| {name}hq | ? | ? | ? | ? | ? | ? | ? |

**Legend:** YES = Available, NO = Taken, OURS = We own it, ? = Unchecked

---

## Package Managers

### npm
- **URL:** npmjs.com/package/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

### PyPI
- **URL:** pypi.org/project/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

### Docker Hub
- **URL:** hub.docker.com/r/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

### Homebrew
- **URL:** formulae.brew.sh/formula/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

---

## Domain

### Website Domain

| Name | Date | Available | Link |
|------|------|-----------|------|
| **{name}.com** | | | |
| **{name}.dev** | | | |
| **{name}.ai** | | | |
| **{name}.io** | | | |

---

## Code Hosting

### GitHub
- **URL:** github.com/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

---

## Social Media

### Twitter/X
- **URL:** x.com/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

### LinkedIn Company Page
- **URL:** linkedin.com/company/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

### Reddit Subreddit
- **URL:** reddit.com/r/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

### YouTube Channel
- **URL:** youtube.com/@{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

### Bluesky
- **URL:** bsky.app/profile/{name}.bsky.social

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

---

## Content & Newsletter

### Medium
- **URL:** medium.com/@{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

### Dev.to
- **URL:** dev.to/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

### Substack
- **URL:** {name}.substack.com

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

---

## AI/ML Platforms

### Hugging Face Organization
- **URL:** huggingface.co/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

---

## Launch Platforms

### Product Hunt
- **URL:** producthunt.com/products/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

### Hacker News
- **URL:** news.ycombinator.com/user?id={name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

---

## Developer Tool Marketplaces

### VS Code Marketplace
- **URL:** marketplace.visualstudio.com/publishers/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| | | | |

---

## Cross-Service Summary

### Best Available Name Variations

| Variation | Twitter | Medium | Product Hunt | GitHub | LinkedIn | Overall |
|-----------|---------|--------|--------------|--------|----------|---------|
| | | | | | | |

### Recommended Strategy

[Analysis of best available name based on Tier 1 platform availability]
```

## {CHOSEN_NAME}_BRAND_PRESENCE.md Template

Name this file after your selected brand name (e.g., `PROMPTFORGE_BRAND_PRESENCE.md`).

```markdown
# Brand Presence — [Project Name]

## Selected Brand Name
**Primary Name**: [name]
**Variations Used**: [list any platform-specific variations]

## Rationale
[Why this name was selected]
- Availability: [summary]
- Brand Fit: [summary]
- Ecosystem Differentiation: [summary]

## Platform Registrations

### Tier 1: Must Have (Secured)
| Platform | Handle/Name | URL | Status |
|----------|-------------|-----|--------|
| Domain | [name].com | https://[name].com | ✅ Registered |
| GitHub | [name] | https://github.com/[name] | ✅ Created |
| Twitter/X | @[name] | https://x.com/[name] | ✅ Registered |
| npm | [name] | https://npmjs.com/package/[name] | ✅ Reserved |
| PyPI | [name] | https://pypi.org/project/[name] | ✅ Reserved |

### Tier 2: Should Have
| Platform | Handle/Name | URL | Status |
|----------|-------------|-----|--------|
| Discord | [name] | discord.gg/[name] | ✅ Created |
| Product Hunt | [name] | producthunt.com/products/[name] | ⏳ Pending |
| LinkedIn | [name] | linkedin.com/company/[name] | ✅ Created |

### Tier 3: Nice to Have
| Platform | Handle/Name | URL | Status |
|----------|-------------|-----|--------|
| YouTube | @[name] | youtube.com/@[name] | ✅ Registered |
| Substack | [name] | [name].substack.com | ✅ Registered |
| Reddit | r/[name] | reddit.com/r/[name] | ⏳ Pending |

### Variations by Platform
| Platform | Preferred | Alternative | Notes |
|----------|-----------|-------------|-------|
| Twitter/X | @[name] | @[name]hq | If primary unavailable |
| GitHub | [name] | [name]-org | For organization |
| npm | [name] | @[name]/core | Scoped package |

## Defensive Registrations

### Domains Secured
- [name].com (primary)
- [name].dev (developer-focused)
- [name].ai (AI positioning)
- get[name].com (alternative)
- [name].io (backup)

### Common Misspellings
- [list any misspelling domains registered]

## Brand Guidelines

### Name Usage
- **Correct**: [Name] (capitalized)
- **In Code**: [name] (lowercase)
- **CLI**: [name] (lowercase)

### Social Bio
> [Standard tagline for social profiles]

### Hashtags
- #[name]
- #[relatedtopic]

## Timeline

| Date | Action | Platform | Status |
|------|--------|----------|--------|
| [date] | Register domain | [name].com | ✅ Done |
| [date] | Create GitHub org | github.com/[name] | ✅ Done |
| [date] | Register Twitter | @[name] | ✅ Done |
| [date] | Reserve npm name | [name] | ✅ Done |
| [date] | Create Discord | discord.gg/[name] | ⏳ Pending |

## Notes
[Any additional notes about the brand presence strategy]
```

## Workflow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    SELECT A BRAND PRESENCE                       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: DOCUMENT YOUR IDEA                                     │
│  └─ Output: PROJECT_DESCRIPTION.md                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 2: GATHER ECOSYSTEM PARTICIPANTS                          │
│  └─ Output: ECOSYSTEM_PARTICIPANTS.md                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 3: GENERATE NAMES                                         │
│  └─ Output: 10 candidate names                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 4: GENERATE NAME VARIATIONS                               │
│  └─ Output: Variation matrix for top candidates                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 5: SELECT IMPORTANT BRAND PRESENCE VENUES                 │
│  └─ Output: Prioritized platform list                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 6: CHECK AVAILABILITY ACROSS VENUES                       │
│  └─ Uses: check-name-availability-on-* skills                    │
│  └─ Output: Availability matrix                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 7: ANALYZE AND SELECT                                     │
│  └─ Score by: availability, consistency, brand fit               │
│  └─ Output: Selected name + variation strategy                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Phase 8: DOCUMENT FINAL BRAND PRESENCE                          │
│  └─ Output: BRAND_PRESENCE.md                                    │
└─────────────────────────────────────────────────────────────────┘
```

## Tips for Success

1. **Don't Rush Phase 1**: A clear project description makes everything easier
2. **Research Thoroughly**: Missing a key competitor leads to conflicts later
3. **Generate More Than You Think**: The best name might be your 8th idea
4. **Prioritize Consistency**: A slightly less perfect name available everywhere beats a perfect name with gaps
5. **Check Tier 1 First**: Don't fall in love with a name before checking must-have platforms
6. **Document Everything**: Your future self will thank you
7. **Register Defensively**: Secure variations even if you don't use them now

## Related Skills

- `documenting-your-idea` — Phase 1
- `gather-ecosystem-participants` — Phase 2
- `generate-names` — Phase 3
- `generate-name-variations` — Phase 4
- `select-important-brand-presence-venues` — Phase 5
- `check-name-availability-on-*` — Phase 6 (18 platform-specific skills)

## Sources

- [How to Choose a Brand Name for Your Open Source Project](https://opensource.com/business/16/2/how-choose-brand-name-open-source-project)
- [Kill Extra Brand Names to Make Your Open Source Project More Powerful](https://opensource.com/business/16/3/kill-off-extra-brand-names)
- [Naming Your Open Source Project? Start Here](https://changelog.com/posts/naming-open-source-project-start)
- [Starting an Open Source Project](https://opensource.guide/starting-a-project/)
- [Launching a Brand: Aligning Domain Names, Trademarks and Social Handles](https://www.dchost.com/blog/en/launching-a-brand-aligning-domain-names-trademarks-and-social-handles/)
- [15 Smart Strategies for Naming Your Startup](https://www.allbusiness.com/strategies-for-naming-your-startup)
- [How to Brainstorm a Startup Name That Converts](https://techdella.com/guide/how-to-brainstorm-a-startup-name/)
