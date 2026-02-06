---
name: generate-name-variations
description: Apply common naming patterns to a base name to find more availability opportunities. Use when a preferred name is taken on some platforms but variations might be available.
---

# Generate Name Variations

Apply common naming patterns (prefixes, suffixes, modifications) to a base name to find more availability opportunities across platforms.

## Purpose

When your preferred name is taken on some platforms, variations can help you:
- Find available handles/domains while keeping brand recognition
- Maintain consistency across platforms with slight modifications
- Secure defensive registrations for brand protection

## Common Variation Patterns

### Prefixes

#### Action Prefixes
- `try{name}` - trynotion, tryzapier
- `get{name}` - getbootstrap, getpostman
- `use{name}` - usefathom, usecontext
- `go{name}` - gohugo, golang
- `run{name}` - runkit, runllama

#### Descriptor Prefixes
- `the{name}` - theverge, theblock
- `my{name}` - myspace, myfitnesspal
- `hey{name}` - heygen, heyorca
- `hello{name}` - hellofresh, helloworld

#### Technical Prefixes
- `open{name}` - openai, opensource
- `dev{name}` - devtools, devops
- `api{name}` - apidog, apify

### Suffixes

#### Business Suffixes
- `{name}hq` - linearHQ, slackhq
- `{name}app` - whatsapp, cashapp
- `{name}inc` - stripe (uses @stripe, stripeinc on some)
- `{name}io` - gitpod uses gitpodio on twitter
- `{name}co` - buffer uses bufferco on some platforms

#### Technical Suffixes
- `{name}ai` - stability.ai, perplexity.ai
- `{name}ml` - huggingface uses hfml sometimes
- `{name}dev` - githubdev, verceldev
- `{name}js` - nodejs, nextjs
- `{name}py` - mypy, fastapi

#### Descriptor Suffixes
- `{name}labs` - anthropic uses anthropic, but "labs" is common
- `{name}team` - figma uses figmadesign sometimes
- `{name}official` - for verified/official accounts
- `{name}oss` - for open source projects

### Modifications

#### Character Variations
- `{name}_` - underscore suffix when needed
- `{name}xyz` - adding letters for uniqueness
- `{name}2` or `{name}3` - version numbers (avoid if possible)

#### Word Splitting
- `{name}-ai` vs `{nameai}` - hyphenated vs combined
- `{first}{last}` vs `{first}-{last}` - depending on platform rules

### Domain-Specific Patterns

#### Domains
- `{name}.com` - primary preference
- `{name}.dev` - for developer tools
- `{name}.ai` - for AI products
- `{name}.io` - for tech startups
- `{name}.app` - for applications
- `get{name}.com` - when base .com is taken
- `try{name}.com` - alternative pattern
- `{name}hq.com` - business-focused

## Process

### Step 1: Start with Base Name

Take your preferred base name, e.g., `dialect`

### Step 2: Generate Systematic Variations

Create a matrix of variations:

```markdown
# Variations for "dialect"

## Prefixes
- trydialect
- getdialect
- usedialect
- godialect
- thedialect
- mydialect
- heydialect
- opendialect

## Suffixes
- dialecthq
- dialectapp
- dialectai
- dialectml
- dialectdev
- dialectlabs
- dialectio
- dialectoss

## Combined (use sparingly)
- trydialectai
- getdialecthq
- usedialectdev

## Domain Variations
- dialect.com
- dialect.dev
- dialect.ai
- dialect.io
- getdialect.com
- trydialect.dev
- dialecthq.com
```

### Step 3: Prioritize by Quality

Rank variations by:

1. **Brand Clarity** - Does it clearly represent your project?
2. **Memorability** - Is it easy to remember and type?
3. **Consistency Potential** - Can you use similar variations everywhere?
4. **Professional Appearance** - Does it look legitimate?
5. **Verbal Communication** - Is it easy to say aloud?

**Best**: `trydialect`, `dialecthq`, `dialect.dev`
**Acceptable**: `dialectai`, `getdialect`, `usedialect`
**Avoid if possible**: `dialect2`, `dialectxyz`, `dialect_official`

### Step 4: Check Availability

Use the `check-name-availability-on-*` skills to verify each variation across platforms.

## Output Format

```markdown
# Name Variations for [Base Name]

## Priority 1 (Preferred)
| Variation | Domain | GitHub | Twitter | npm | PyPI |
|-----------|--------|--------|---------|-----|------|
| {name} | ? | ? | ? | ? | ? |
| try{name} | ? | ? | ? | ? | ? |
| {name}hq | ? | ? | ? | ? | ? |

## Priority 2 (Acceptable)
| Variation | Domain | GitHub | Twitter | npm | PyPI |
|-----------|--------|--------|---------|-----|------|
| get{name} | ? | ? | ? | ? | ? |
| {name}ai | ? | ? | ? | ? | ? |

## Priority 3 (Fallback)
...
```

## Platform-Specific Considerations

### Twitter/X
- 15 character limit
- Underscores allowed
- `{name}hq` and `{name}_` are common patterns

### GitHub
- 39 character limit
- Hyphens preferred over underscores
- Organizations often use `{name}-org` or `{name}-inc`

### npm
- Lowercase only
- Hyphens allowed
- Scoped packages: `@{org}/{name}`

### PyPI
- Normalizes hyphens/underscores
- `{name}` and `{name}-ai` are equivalent to `{name}_ai`

### Domains
- Try `.dev`, `.ai`, `.io` before adding prefixes to `.com`
- `get{name}.com` is a respected pattern

## Example

For base name `atlas`:

```markdown
# Name Variations for "atlas"

## Priority 1 (Preferred)
| Variation | Domain | GitHub | Twitter | npm | PyPI |
|-----------|--------|--------|---------|-----|------|
| atlas | taken | taken | taken | taken | taken |
| atlashq | avail | avail | taken | avail | avail |
| atlas.dev | avail | - | - | - | - |

## Priority 2 (Acceptable)
| Variation | Domain | GitHub | Twitter | npm | PyPI |
|-----------|--------|--------|---------|-----|------|
| getatlas | avail | avail | avail | avail | avail |
| tryatlas | avail | avail | avail | avail | avail |
| atlasai | taken | avail | avail | avail | avail |

## Recommendation
Use `getatlas` consistently across all platforms, with `atlas.dev` as primary domain.
```

## Output

**Document**: `NAME_VARIATIONS.md`

Save this document in your project root. It should contain:
- The base names being varied (from `NAME_CANDIDATES.md`)
- Complete variation matrix organized by priority
- Notes on which variations to check first

### Required Input
- `NAME_CANDIDATES.md` — top candidates to create variations for

### Feeds Into
- `NAME_VARIATION_AVAILABILITY.md` — variations become rows in availability tables

## Related Skills

- `gather-ecosystem-participants` - Understand existing names in your space
- `generate-names` - Generate initial name candidates
- `check-name-availability-on-*` - Verify availability of each variation
