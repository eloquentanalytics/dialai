# Contributing to Brand Presence Skills

Guidelines for adding or modifying skills in this repository.

## Skill Structure

Each skill lives in its own directory under `skills/`:

```
skills/
└── skill-name/
    └── SKILL.md
```

## SKILL.md Format

Every skill file must have YAML frontmatter followed by markdown content:

```markdown
---
name: skill-name
description: Brief description of what this skill does and when to use it.
---

# Skill Title

Content goes here...
```

### Frontmatter Requirements

#### `name` (required)
- Lowercase letters, numbers, and hyphens only
- Maximum 64 characters
- Must match the directory name
- Examples: `check-name-availability-on-github`, `generate-names`

#### `description` (required)
- Describes what the skill does AND when to use it
- Maximum ~1024 characters recommended
- Should help agents decide if this skill applies to their task
- Format: "[What it does]. [When to use it]."

**Good example:**
```yaml
description: Check if a username is available on Twitter/X. Use when verifying brand name availability on Twitter or checking if a specific handle is taken.
```

**Bad example:**
```yaml
description: Twitter checker
```

## Content Guidelines

### For Check Availability Skills

Include these sections:

1. **Method 1: HTTP Request** (Recommended for Agents)
   - Simple curl command that can be executed
   - Clear interpretation of response codes

2. **Additional Methods** (if applicable)
   - Official APIs
   - CLI tools
   - Third-party services

3. **Platform-Specific Rules**
   - Naming constraints
   - Character limits
   - Reserved names

4. **Caveats**
   - Rate limits
   - Authentication requirements
   - Edge cases (suspended accounts, reserved names)

5. **Sources**
   - Links to official documentation
   - Links to tools referenced

### For Planning/Research Skills

Include:

1. **Purpose** - Why this skill exists
2. **Process** - Step-by-step instructions
3. **Output Format** - Expected deliverable structure
4. **Examples** - Concrete examples
5. **Related Skills** - Links to complementary skills

## Adding a New Availability Check Skill

1. Create directory: `skills/check-name-availability-on-{platform}/`
2. Create `SKILL.md` with frontmatter
3. Research the platform's API/methods
4. Document at least one reliable method
5. Include caveats and sources
6. Update `SKILLS.md` index

## Adding a New Planning Skill

1. Create directory: `skills/{skill-name}/`
2. Create `SKILL.md` with frontmatter
3. Define clear inputs and outputs
4. Provide step-by-step process
5. Include examples
6. Update `SKILLS.md` index

## Updating the Index

When adding a skill, add an entry to `SKILLS.md`:

```markdown
#### Skill Title — `skills/skill-name/`
Brief description of the skill.
→ [`skills/skill-name/SKILL.md`](skills/skill-name/SKILL.md)
```

## Testing Skills

Before submitting:

1. Verify curl commands work (test with real names)
2. Check that response code interpretations are accurate
3. Confirm all links are valid
4. Ensure frontmatter parses correctly

## Style Guide

- Use ATX-style headers (`#`, `##`, `###`)
- Use fenced code blocks with language hints
- Keep lines under 100 characters when practical
- Use tables for structured comparisons
- Link to sources at the end of each skill

## Pull Request Process

1. Fork the repository
2. Create a feature branch
3. Add/modify skills following these guidelines
4. Update `SKILLS.md` index if needed
5. Submit PR with description of changes

## Questions?

Open an issue for questions about:
- Whether a platform should be added
- How to structure a new skill type
- Clarification on guidelines
