# Name Availability Checklist

This checklist assumes you've already chosen a core name (e.g., `dial`) and need to establish a consistent web presence across various services. The challenge is that your ideal name is often taken on some platforms, so you need fallback variations that remain recognizable and consistent.

---

## Common Naming Variations

Based on patterns from the AI agent ecosystem (LangChain, LlamaIndex, CrewAI, DSPy, promptfoo, etc.), here are the most common ways projects vary their names across platforms:

### Top 10 Naming Patterns (ordered by frequency)

| Pattern | Example from Ecosystem | Applied to "dial" |
|---------|------------------------|-------------------|
| **{name}ai** | crewai, flowiseai, langchain-ai, confident-ai | dialai |
| **{name}oss** | @DSPyOSS (Twitter) | dialoss |
| **try{name}** | Common for landing pages | trydial |
| **get{name}** | Common for acquisition URLs | getdial |
| **use{name}** | Common pattern | usedial |
| **{name}app** | promptfoo.app (cloud version) | dialapp |
| **{name}hq** | Common for "headquarters" account | dialhq |
| **{name}dev** | pydantic.dev, langgraph.dev | dialdev |
| **run{name}** | run-llama (LlamaIndex GitHub org) | rundial |
| **{name}inc** | @crewAIInc (Twitter) | dialinc |

### Additional Patterns Seen in the Ecosystem

| Pattern | Example | Notes |
|---------|---------|-------|
| **py{name}** | @pyautogen | For Python-specific accounts |
| **{name}labs** | Common for companies | For company identity |
| **{name}team** | Common pattern | For team accounts |
| **{name}project** | Common for OSS | For open source projects |
| **the{name}** | Common fallback | When base name is taken |
| **{name}io** | Tech startup pattern | Often matches .io domain |
| **{name}official** | Verification pattern | For "official" accounts |
| **{name}_** or **_{name}** | @llama_index, @Haystack_AI | Underscore variations |

### Strategy for Consistent Naming

1. **Primary choice**: Use the base name if available (`dial`)
2. **AI suffix**: Add `ai` suffix if base is taken (`dialai`) - most common in this space
3. **Action prefix**: Use `try`, `get`, `use`, or `run` prefix (`trydial`, `getdial`)
4. **Category suffix**: Add `oss`, `dev`, `hq`, or `app` based on context
5. **Last resort**: Combine patterns (`trydialai`, `getdialapp`)

### Ecosystem Examples

| Project | GitHub Org | Twitter | Domain | npm/PyPI |
|---------|------------|---------|--------|----------|
| LangChain | langchain-ai | @LangChainAI | langchain.com | langchain |
| LlamaIndex | run-llama | @llama_index | llamaindex.ai | llama-index |
| CrewAI | crewAIInc | @crewAIInc | crewai.com | crewai |
| DSPy | stanfordnlp | @DSPyOSS | dspy.ai | dspy |
| promptfoo | promptfoo | @promptfoo | promptfoo.dev | promptfoo |
| DeepEval | confident-ai | @deepeval | deepeval.com | deepeval |
| AutoGen | microsoft | @pyautogen | (GitHub Pages) | autogen |
| Flowise | FlowiseAI | @FlowiseAI | flowiseai.com | flowise |
| Haystack | deepset-ai | @Haystack_AI | haystack.deepset.ai | haystack-ai |
| Strands | strands-agents | (via AWS) | strandsagents.com | strands-agents |

---

## Name Variations Availability (Checked 2026-02-06)

Results of checking the top 10 naming patterns applied to `dial` and `dialai`.

### "dial" + Variations

| Variation | .com | .dev | .io | .ai | npm | PyPI | GitHub |
|-----------|------|------|-----|-----|-----|------|--------|
| dial | NO | NO | NO | NO | NO | NO | NO |
| dialai | NO | YES | NO | NO | OURS | YES | NO |
| dialoss | NO | YES | NO | NO | YES | YES | NO |
| trydial | NO | YES | NO | NO | YES | YES | NO |
| getdial | NO | YES | NO | NO | YES | YES | NO |
| usedial | NO | YES | NO | NO | YES | YES | YES |
| dialapp | NO | YES | NO | NO | YES | YES | NO |
| dialhq | NO | YES | NO | NO | YES | YES | YES |
| dialdev | NO | YES | NO | NO | YES | YES | NO |
| rundial | NO | YES | NO | NO | YES | YES | NO |
| dialinc | NO | YES | NO | NO | YES | YES | YES |

### "dialai" + Variations

| Variation | .com | .dev | .io | .ai | npm | PyPI | GitHub |
|-----------|------|------|-----|-----|-----|------|--------|
| dialai | NO | YES | NO | NO | OURS | YES | NO |
| dialaioss | NO | YES | NO | NO | YES | YES | YES |
| trydialai | NO | YES | NO | NO | YES | YES | YES |
| getdialai | NO | YES | NO | NO | YES | YES | YES |
| usedialai | NO | YES | NO | NO | YES | YES | YES |
| dialaiapp | NO | YES | NO | NO | YES | YES | NO |
| dialaihq | NO | YES | NO | NO | YES | YES | YES |
| dialaidev | NO | YES | NO | NO | YES | YES | YES |
| rundialai | NO | YES | NO | NO | YES | YES | YES |
| dialaiinc | NO | YES | NO | NO | YES | YES | YES |

### Summary

**Best available combinations for "dial":**
- `usedial` - Available: .dev, npm, PyPI, GitHub ✓
- `dialhq` - Available: .dev, npm, PyPI, GitHub ✓
- `dialinc` - Available: .dev, npm, PyPI, GitHub ✓
- `dialai` - Available: .dev, npm (OURS), PyPI, but NOT GitHub

**Best available combinations for "dialai":**
- `dialaioss` - Available: .dev, npm, PyPI, GitHub ✓
- `trydialai` - Available: .dev, npm, PyPI, GitHub ✓
- `getdialai` - Available: .dev, npm, PyPI, GitHub ✓
- `usedialai` - Available: .dev, npm, PyPI, GitHub ✓
- `dialaihq` - Available: .dev, npm, PyPI, GitHub ✓
- `dialaidev` - Available: .dev, npm, PyPI, GitHub ✓
- `rundialai` - Available: .dev, npm, PyPI, GitHub ✓
- `dialaiinc` - Available: .dev, npm, PyPI, GitHub ✓
- Exception: `dialaiapp` GitHub is taken

**Key findings:**
- All .com, .io, and .ai domains are taken for ALL variations
- All .dev domains are available for ALL variations ✓
- All npm and PyPI packages are available for ALL variations ✓
- GitHub: 3/10 available for "dial", 8/9 available for "dialai"

---

## Package Managers

### npm
- **URL:** npmjs.com/package/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dialai | 2026-02-06 | OURS | [npmjs.com/package/dialai](https://npmjs.com/package/dialai) |
| dial | 2026-02-06 | NO | [npmjs.com/package/dial](https://npmjs.com/package/dial) |

### PyPI
- **URL:** pypi.org/project/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dialai | 2026-02-06 | YES | |
| dial | 2026-02-06 | NO | [pypi.org/project/dial](https://pypi.org/project/dial) |

### Docker Hub
- **URL:** hub.docker.com/r/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dialai | 2026-02-06 | YES | |
| dial | 2026-02-06 | YES | |

### Homebrew
- **URL:** formulae.brew.sh/formula/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dialai | 2026-02-06 | YES | |
| dial | 2026-02-06 | YES | |

---

## Domain

### Website domain

**Common TLDs in the AI agent ecosystem (ordered by frequency):**
1. `.com` - Most common, universal (crewai.com, tensorzero.com, deepeval.com, langchain.com, flowiseai.com, strandsagents.com, confident-ai.com)
2. `.ai` - Premium for AI tools (dspy.ai, llamaindex.ai, deepset.ai, haystack.deepset.ai)
3. `.dev` - Popular for developer tools (promptfoo.dev, pydantic.dev, langgraph.dev)
4. `.io` - Common for tech startups (gradio.app uses .app but many use .io)
5. `.app` - Cloud/mobile platforms (promptfoo.app)
6. `.org` - Open source, non-profits, foundations
7. `.co` - Startup alternative to .com
8. `.tools` - Developer tools and utilities
9. `.cloud` - Cloud services and platforms
10. `.sh` - CLI tools and shell utilities (e.g., bun.sh, railway.sh)
11. `.run` - Execution/runtime platforms
12. `.tech` - Technology companies

**Common naming variations:**
- `{name}.{tld}` - Most common (dspy.ai, crewai.com, promptfoo.dev)
- `{name}ai.com` - For AI tools when base .ai is taken (flowiseai.com, confident-ai.com)
- `{name}agents.com` - For agent frameworks (strandsagents.com)
- `get{name}.com` - Common alternative when base .com is taken

| Name | Date | Available | Link |
|------|------|-----------|------|
| **dialai.com** | 2026-02-06 | NO | |
| **dial.com** | 2026-02-06 | NO | |
| **dialai.ai** | 2026-02-06 | NO | |
| **dial.ai** | 2026-02-06 | NO | |
| **dialai.dev** | 2026-02-06 | YES | |
| **dial.dev** | 2026-02-06 | NO | |
| **dialai.io** | 2026-02-06 | NO | Created 2023-04-27 |
| **dial.io** | 2026-02-06 | NO | |
| **dialai.app** | 2026-02-06 | NO | |
| **dial.app** | 2026-02-06 | NO | |
| **dialai.org** | 2026-02-06 | NO | Created 2025-06-02 |
| **dial.org** | 2026-02-06 | NO | |
| **dialai.co** | 2026-02-06 | NO | Created 2025-09-11 |
| **dial.co** | 2026-02-06 | NO | |
| **dialai.tools** | 2026-02-06 | NO | |
| **dial.tools** | 2026-02-06 | NO | |
| **dialai.cloud** | 2026-02-06 | NO | Created 2025-12-17 |
| **dial.cloud** | 2026-02-06 | NO | |
| **dialai.sh** | 2026-02-06 | NO | |
| **dial.sh** | 2026-02-06 | NO | |
| **dialai.run** | 2026-02-06 | NO | |
| **dial.run** | 2026-02-06 | NO | |
| **dialai.tech** | 2026-02-06 | NO | Created 2025-03-23 |
| **dial.tech** | 2026-02-06 | NO | |

---

## Code Hosting

### GitHub repository
- **URL:** github.com/{owner}/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dialai | 2026-02-06 | NO | [github.com/DiaLai](https://github.com/DiaLai) |
| dial | 2026-02-06 | NO | [github.com/dial](https://github.com/dial) |

---

## Social Media

### Twitter/X
- **URL:** x.com/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dial | 2026-02-06 | NO | [x.com/dial](https://x.com/dial) |
| dialai | 2026-02-06 | NO | [x.com/dialai](https://x.com/dialai) |
| dialoss | 2026-02-06 | YES | |
| trydial | 2026-02-06 | NO | [x.com/trydial](https://x.com/trydial) |
| getdial | 2026-02-06 | SUSPENDED | |
| usedial | 2026-02-06 | NO | [x.com/usedial](https://x.com/usedial) |
| dialapp | 2026-02-06 | NO | [x.com/dialapp](https://x.com/dialapp) |
| dialhq | 2026-02-06 | NO | [x.com/dialhq](https://x.com/dialhq) |
| dialdev | 2026-02-06 | NO | [x.com/dialdev](https://x.com/dialdev) |
| rundial | 2026-02-06 | NO | [x.com/rundial](https://x.com/rundial) |
| dialinc | 2026-02-06 | SUSPENDED | |
| dialaioss | 2026-02-06 | YES | |
| trydialai | 2026-02-06 | YES | |
| getdialai | 2026-02-06 | YES | |
| usedialai | 2026-02-06 | YES | |
| dialaiapp | 2026-02-06 | YES | |
| dialaihq | 2026-02-06 | YES | |
| dialaidev | 2026-02-06 | YES | |
| rundialai | 2026-02-06 | YES | |
| dialaiinc | 2026-02-06 | YES | |

### LinkedIn Company Page
- **URL:** linkedin.com/company/{name}
- **Note:** LinkedIn requires login to verify company page availability. Results marked with "?" require manual verification.

| Name | Date | Available | Link |
|------|------|-----------|------|
| dial | 2026-02-06 | NO | [linkedin.com/company/dial](https://linkedin.com/company/dial) |
| dialai | 2026-02-06 | NO | [linkedin.com/company/dialai](https://linkedin.com/company/dialai) |
| dialoss | 2026-02-06 | ? | |
| trydial | 2026-02-06 | YES | |
| getdial | 2026-02-06 | ? | |
| usedial | 2026-02-06 | ? | |
| dialapp | 2026-02-06 | ? | |
| dialhq | 2026-02-06 | YES | |
| dialdev | 2026-02-06 | ? | |
| rundial | 2026-02-06 | ? | |
| dialinc | 2026-02-06 | ? | |
| dialaioss | 2026-02-06 | ? | |
| trydialai | 2026-02-06 | ? | |
| getdialai | 2026-02-06 | YES | |
| usedialai | 2026-02-06 | ? | |
| dialaiapp | 2026-02-06 | YES | |
| dialaihq | 2026-02-06 | ? | |
| dialaidev | 2026-02-06 | YES | |
| rundialai | 2026-02-06 | ? | |
| dialaiinc | 2026-02-06 | ? | |

### Discord Server
- **Note:** Server name doesn't need to be unique, but custom invite link does

| Name | Date | Available | Link |
|------|------|-----------|------|

### Reddit Subreddit
- **URL:** reddit.com/r/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dialai | 2026-02-06 | YES | |
| dial | 2026-02-06 | NO | [reddit.com/r/dial](https://reddit.com/r/dial) |

### YouTube Channel
- **URL:** youtube.com/@{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dialai | 2026-02-06 | YES | |
| dial | 2026-02-06 | YES | |

### Bluesky
- **URL:** bsky.app/profile/{name}.bsky.social

| Name | Date | Available | Link |
|------|------|-----------|------|
| dialai | 2026-02-06 | YES | |
| dial | 2026-02-06 | NO | [bsky.app/profile/dial.bsky.social](https://bsky.app/profile/dial.bsky.social) |

---

## Content & Newsletter

### Medium
- **URL:** medium.com/@{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dial | 2026-02-06 | NO | [medium.com/@dial](https://medium.com/@dial) |
| dialai | 2026-02-06 | NO | [medium.com/@dialai](https://medium.com/@dialai) |
| dialoss | 2026-02-06 | YES | |
| trydial | 2026-02-06 | YES | |
| getdial | 2026-02-06 | YES | |
| usedial | 2026-02-06 | YES | |
| dialapp | 2026-02-06 | NO | [medium.com/@dialapp](https://medium.com/@dialapp) |
| dialhq | 2026-02-06 | YES | |
| dialdev | 2026-02-06 | YES | |
| rundial | 2026-02-06 | YES | |
| dialinc | 2026-02-06 | YES | |
| dialaioss | 2026-02-06 | YES | |
| trydialai | 2026-02-06 | YES | |
| getdialai | 2026-02-06 | YES | |
| usedialai | 2026-02-06 | YES | |
| dialaiapp | 2026-02-06 | YES | |
| dialaihq | 2026-02-06 | YES | |
| dialaidev | 2026-02-06 | YES | |
| rundialai | 2026-02-06 | YES | |
| dialaiinc | 2026-02-06 | YES | |

### Dev.to
- **URL:** dev.to/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dialai | 2026-02-06 | YES | |
| dial | 2026-02-06 | YES | |

### Substack
- **URL:** {name}.substack.com

| Name | Date | Available | Link |
|------|------|-----------|------|
| dialai | 2026-02-06 | YES | |
| dial | 2026-02-06 | NO | [dial.substack.com](https://dial.substack.com) |

---

## AI/ML Platforms

### Hugging Face Organization
- **URL:** huggingface.co/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dialai | 2026-02-06 | YES | |
| dial | 2026-02-06 | NO | [huggingface.co/dial](https://huggingface.co/dial) |

---

## Launch Platforms

### Product Hunt
- **URL:** producthunt.com/products/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dial | 2026-02-06 | NO | [producthunt.com/products/dial](https://producthunt.com/products/dial) |
| dialai | 2026-02-06 | YES | |
| dialoss | 2026-02-06 | YES | |
| trydial | 2026-02-06 | YES | |
| getdial | 2026-02-06 | YES | |
| usedial | 2026-02-06 | YES | |
| dialapp | 2026-02-06 | YES | |
| dialhq | 2026-02-06 | YES | |
| dialdev | 2026-02-06 | YES | |
| rundial | 2026-02-06 | YES | |
| dialinc | 2026-02-06 | YES | |
| dialaioss | 2026-02-06 | YES | |
| trydialai | 2026-02-06 | YES | |
| getdialai | 2026-02-06 | YES | |
| usedialai | 2026-02-06 | YES | |
| dialaiapp | 2026-02-06 | YES | |
| dialaihq | 2026-02-06 | YES | |
| dialaidev | 2026-02-06 | YES | |
| rundialai | 2026-02-06 | YES | |
| dialaiinc | 2026-02-06 | YES | |

### Hacker News
- **URL:** news.ycombinator.com/user?id={name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dialai | 2026-02-06 | YES | |
| dial | 2026-02-06 | YES | |

---

## Developer Tool Marketplaces

### VS Code Marketplace
- **URL:** marketplace.visualstudio.com/publishers/{name}

| Name | Date | Available | Link |
|------|------|-----------|------|
| dial | 2026-02-06 | YES | |
| dialai | 2026-02-06 | YES | |
| dialoss | 2026-02-06 | YES | |
| trydial | 2026-02-06 | YES | |
| getdial | 2026-02-06 | YES | |
| usedial | 2026-02-06 | YES | |
| dialapp | 2026-02-06 | YES | |
| dialhq | 2026-02-06 | YES | |
| dialdev | 2026-02-06 | YES | |
| rundial | 2026-02-06 | YES | |
| dialinc | 2026-02-06 | YES | |
| dialaioss | 2026-02-06 | YES | |
| trydialai | 2026-02-06 | YES | |
| getdialai | 2026-02-06 | YES | |
| usedialai | 2026-02-06 | YES | |
| dialaiapp | 2026-02-06 | YES | |
| dialaihq | 2026-02-06 | YES | |
| dialaidev | 2026-02-06 | YES | |
| rundialai | 2026-02-06 | YES | |
| dialaiinc | 2026-02-06 | YES | |

---

## Cross-Service Summary (2026-02-06)

### Best Available Name Variations

Based on checking all 20 variations across all services, here are the variations with the best overall availability:

| Variation | Twitter | Medium | Product Hunt | VS Code | LinkedIn | Overall |
|-----------|---------|--------|--------------|---------|----------|---------|
| **dialaioss** | ✅ YES | ✅ YES | ✅ YES | ✅ YES | ? | **Excellent** |
| **trydialai** | ✅ YES | ✅ YES | ✅ YES | ✅ YES | ? | **Excellent** |
| **getdialai** | ✅ YES | ✅ YES | ✅ YES | ✅ YES | ✅ YES | **Excellent** |
| **usedialai** | ✅ YES | ✅ YES | ✅ YES | ✅ YES | ? | **Excellent** |
| **dialaiapp** | ✅ YES | ✅ YES | ✅ YES | ✅ YES | ✅ YES | **Excellent** |
| **dialaihq** | ✅ YES | ✅ YES | ✅ YES | ✅ YES | ? | **Excellent** |
| **dialaidev** | ✅ YES | ✅ YES | ✅ YES | ✅ YES | ✅ YES | **Excellent** |
| **rundialai** | ✅ YES | ✅ YES | ✅ YES | ✅ YES | ? | **Excellent** |
| **dialaiinc** | ✅ YES | ✅ YES | ✅ YES | ✅ YES | ? | **Excellent** |
| dialoss | ✅ YES | ✅ YES | ✅ YES | ✅ YES | ? | Good |

### Unavailable Core Names

| Variation | Twitter | Medium | Notes |
|-----------|---------|--------|-------|
| dial | ❌ Dial Soap | ❌ Taken | Ubiquitous brand name |
| dialai | ❌ Inactive | ❌ Taken | Both taken by individuals |

### Key Findings

1. **All `dialai` variations are available** on Twitter, Medium, Product Hunt, and VS Code Marketplace
2. **Most `dial` variations are taken** on Twitter (8/10 taken or suspended)
3. **VS Code Marketplace** has complete availability for all variations
4. **Product Hunt** only has `dial` taken (a photography app from 2018)
5. **Medium** has dial, dialai, and dialapp taken; all others available
6. **LinkedIn** requires manual verification due to login wall

### Recommended Strategy

For consistent branding across all platforms:

1. **Primary recommendation**: Use a `dialai` variation (e.g., `dialaioss`, `dialaidev`, `dialaihq`)
2. **These have near-universal availability** across Twitter, Medium, Product Hunt, and VS Code
3. **Avoid base `dial` or `dialai`** as they're taken on key social platforms
