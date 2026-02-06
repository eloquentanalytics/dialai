---
name: gather-ecosystem-participants
description: Research and document competitors, partners, and ecosystem participants for a project. Use when you need to understand the naming landscape before choosing a brand name to avoid conflicts.
---

# Gather Ecosystem Participants

Research competitors, partners, and ecosystem participants to understand the naming landscape and avoid conflicts when choosing a brand name.

## Purpose

Before selecting a name for your project, you need to understand:
- Who are your direct competitors?
- Who are potential partners or integrations?
- What names/handles do they use across platforms?
- Where might your name conflict or cause confusion?

## Process

### Step 1: Identify Ecosystem Categories

For your project, identify relevant categories:

1. **Direct Competitors** - Projects solving the same problem
2. **Adjacent Solutions** - Projects in the same space but different approach
3. **Upstream Dependencies** - Tools/platforms you build on
4. **Downstream Users** - Who will use or integrate with you
5. **Platform Partners** - Services you'll integrate with

### Step 2: Research Each Participant

For each ecosystem participant, gather:

#### Basic Information
- **Official Name**: The canonical project/company name
- **Tagline/Description**: How they describe themselves
- **Website**: Primary domain
- **Founded/Released**: When they started

#### Platform Presence
For each relevant platform, document:
- **Domain(s)**: Primary and alternate domains
- **GitHub**: Organization/user name, main repos
- **Twitter/X**: Handle
- **LinkedIn**: Company page URL
- **npm/PyPI**: Package names
- **Other platforms**: As relevant to your ecosystem

#### Naming Patterns
Note any patterns:
- Do they use the same name everywhere?
- What variations do they use? (e.g., `langchain` vs `langchain-ai`)
- Have they claimed names defensively?

### Step 3: Document in Structured Format

Create a markdown document with this structure:

```markdown
# Ecosystem Participants

## Direct Competitors

### [Competitor Name]
- **Description**: [One-line description]
- **Website**: [domain.com]
- **GitHub**: [org/user]
- **Twitter**: [@handle]
- **npm**: [package-name]
- **PyPI**: [package-name]
- **Notes**: [Any naming conflicts or patterns to note]

## Adjacent Solutions
...

## Upstream Dependencies
...

## Platform Partners
...
```

### Step 4: Identify Naming Conflicts

After gathering data, identify:
- Names that are already taken across multiple platforms
- Similar names that could cause confusion
- Naming patterns common in your ecosystem
- Gaps where good names might be available

## Example Output

For an AI agent framework project:

```markdown
# Ecosystem Participants

## Direct Competitors

### LangChain
- **Description**: Framework for LLM application development
- **Website**: langchain.com
- **GitHub**: langchain-ai
- **Twitter**: @langaboratory
- **npm**: langchain
- **PyPI**: langchain
- **Notes**: Uses "langchain-ai" on GitHub but "langchain" elsewhere

### LlamaIndex
- **Description**: Data framework for LLM applications
- **Website**: llamaindex.ai
- **GitHub**: run-llama
- **Twitter**: @llama_index
- **npm**: llamaindex
- **PyPI**: llama-index
- **Notes**: GitHub org is "run-llama", inconsistent with product name

## Upstream Dependencies

### OpenAI
- **Description**: AI research company, GPT models
- **Website**: openai.com
- **GitHub**: openai
- **Twitter**: @OpenAI
- **npm**: openai
- **PyPI**: openai
- **Notes**: Clean consistent naming

### Anthropic
- **Description**: AI safety company, Claude models
- **Website**: anthropic.com
- **GitHub**: anthropics
- **Twitter**: @AnthropicAI
- **npm**: @anthropic-ai/sdk
- **PyPI**: anthropic
- **Notes**: Uses "anthropics" (plural) on GitHub
```

## Tips

1. **Be Thorough** - Check all platforms relevant to your ecosystem
2. **Note Inconsistencies** - Naming variations reveal availability opportunities
3. **Check Inactive Accounts** - Some handles are taken but inactive
4. **Consider Variations** - Document `projectname`, `project-name`, `projectname-ai`, etc.
5. **Update Regularly** - The ecosystem evolves; keep this document current

## Output

**Document**: `ECOSYSTEM_PARTICIPANTS.md`

Save this document in your project root alongside `PROJECT_DESCRIPTION.md`.

### Required Input
- `PROJECT_DESCRIPTION.md` — for understanding your project's competitive landscape

### Feeds Into
- `generate-names` — ecosystem data helps avoid naming conflicts
- `select-important-brand-presence-venues` — competitor presence informs platform priorities

## Related Skills

- `documenting-your-idea` - Create the project description first
- `generate-names` - Use ecosystem data to generate unique name candidates
- `generate-name-variations` - Find variations of a base name
- `select-important-brand-presence-venues` - Prioritize which platforms matter most
- `check-name-availability-on-*` - Verify availability on specific platforms
