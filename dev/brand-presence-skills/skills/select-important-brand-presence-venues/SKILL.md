---
name: select-important-brand-presence-venues
description: Analyze your ecosystem to identify which platforms are most critical for your specific project to establish brand presence. Use to prioritize where to secure your brand name first.
---

# Select Important Brand Presence Venues

Identify which platforms are most critical for your specific project to establish brand presence, so you can prioritize securing your name on the most important services first.

## Purpose

Not all platforms are equally important for every project. A B2B developer tool has different needs than a consumer app. This skill helps you:
- Prioritize platform registration efforts
- Focus resources on platforms that matter
- Understand which name conflicts are dealbreakers vs. acceptable

## Platform Categories

### Tier 1: Universal (Almost Always Critical)

#### Domain Name
- **Why**: Your web presence foundation
- **Priority TLDs**: `.com` > `.dev` > `.ai` > `.io`
- **Critical for**: Everyone

#### GitHub
- **Why**: Code hosting, open source presence, developer credibility
- **Check**: Organization name and key repository names
- **Critical for**: Any project with code

### Tier 2: Ecosystem-Dependent

#### Package Registries
| Registry | Critical For |
|----------|-------------|
| **npm** | JavaScript/TypeScript projects, Node.js tools |
| **PyPI** | Python libraries, ML/AI tools, data science |
| **Docker Hub** | Containerized applications, DevOps tools |
| **Homebrew** | CLI tools targeting macOS developers |
| **VS Code Marketplace** | IDE extensions, developer tools |
| **Hugging Face** | ML models, AI/NLP projects |

#### Social/Community Platforms
| Platform | Critical For |
|----------|-------------|
| **Twitter/X** | All projects needing public presence, tech audience |
| **LinkedIn** | B2B products, enterprise tools, hiring |
| **Reddit** | Community-driven products, consumer apps |
| **Hacker News** | Developer tools, startups, tech products |
| **Discord** | Community-heavy projects, gaming, developer tools |

#### Content Platforms
| Platform | Critical For |
|----------|-------------|
| **YouTube** | Products needing video tutorials, demos |
| **Medium** | Thought leadership, content marketing |
| **Substack** | Newsletter-based marketing, B2B |
| **Dev.to** | Developer-focused content, OSS projects |

#### Launch Platforms
| Platform | Critical For |
|----------|-------------|
| **Product Hunt** | Consumer products, developer tools, startups |
| **Bluesky** | Tech-forward audience, alternative to Twitter |

## Assessment Process

### Step 1: Define Your Project Profile

Answer these questions:

1. **Project Type**
   - [ ] Open source library/framework
   - [ ] Developer tool/CLI
   - [ ] B2B SaaS
   - [ ] Consumer application
   - [ ] AI/ML product
   - [ ] API service

2. **Target Audience**
   - [ ] Individual developers
   - [ ] Enterprise teams
   - [ ] Data scientists/ML engineers
   - [ ] General consumers
   - [ ] Specific industry vertical

3. **Technology Stack**
   - [ ] JavaScript/TypeScript
   - [ ] Python
   - [ ] Go
   - [ ] Rust
   - [ ] Multiple languages

4. **Distribution Model**
   - [ ] Package registry (npm, PyPI)
   - [ ] Docker containers
   - [ ] Desktop application
   - [ ] Web application
   - [ ] CLI tool
   - [ ] IDE extension

5. **Marketing Strategy**
   - [ ] Community/word-of-mouth
   - [ ] Content marketing
   - [ ] Social media presence
   - [ ] Product launch events
   - [ ] Enterprise sales

### Step 2: Review Ecosystem Research

From your `gather-ecosystem-participants` research:
- Which platforms do your competitors use?
- Where is your target audience most active?
- What platforms are standard in your ecosystem?

### Step 3: Score Each Platform

For each platform, score 1-5:

| Criteria | Score |
|----------|-------|
| **Ecosystem Standard** | Is this platform common in your space? |
| **Audience Presence** | Is your target audience active here? |
| **Competitor Presence** | Are competitors established here? |
| **Distribution Need** | Do you need this for product distribution? |
| **Marketing Value** | Is this important for marketing/discovery? |

### Step 4: Create Prioritized List

Group platforms into priority tiers:

```markdown
# Brand Presence Priorities for [Project Name]

## Must Have (Score 20-25)
Secure these names before launch. Name conflicts here are dealbreakers.

1. **[Platform]** - [Score] - [Reason]
2. ...

## Should Have (Score 15-19)
Important for growth. Try to secure, but alternatives acceptable.

1. **[Platform]** - [Score] - [Reason]
2. ...

## Nice to Have (Score 10-14)
Secure if available, but not critical.

1. **[Platform]** - [Score] - [Reason]
2. ...

## Low Priority (Score < 10)
Only if resources allow.

1. **[Platform]** - [Score] - [Reason]
2. ...
```

## Example Assessments

### Example 1: Python ML Library

**Profile**: Open source Python library for ML model evaluation

**Must Have**:
- Domain (.com, .dev, or .ai)
- GitHub (organization + repo)
- PyPI (package name)
- Hugging Face (if model-related)
- Twitter/X (community engagement)

**Should Have**:
- Discord (community support)
- Medium or Dev.to (tutorials)
- Hacker News (launch visibility)

**Nice to Have**:
- LinkedIn (hiring, enterprise)
- YouTube (video tutorials)
- Product Hunt (launch)

**Low Priority**:
- npm (not JS focused)
- Reddit (unless specific community)
- Substack (unless newsletter strategy)

### Example 2: B2B SaaS Developer Tool

**Profile**: Enterprise CI/CD platform

**Must Have**:
- Domain (.com strongly preferred)
- GitHub (integrations, docs)
- Twitter/X (industry presence)
- LinkedIn (enterprise marketing)
- Docker Hub (deployment)

**Should Have**:
- Product Hunt (launch)
- YouTube (demos, tutorials)
- Hacker News (developer awareness)

**Nice to Have**:
- npm/PyPI (if SDKs provided)
- Medium (thought leadership)
- VS Code Marketplace (if extension)

**Low Priority**:
- Reddit (B2B focus)
- Discord (enterprise doesn't need)
- Bluesky (nascent platform)

### Example 3: JavaScript Framework

**Profile**: Open source React component library

**Must Have**:
- Domain
- GitHub (organization + repos)
- npm (package name)
- Twitter/X (community)

**Should Have**:
- Discord (community support)
- Dev.to (tutorials)
- VS Code Marketplace (if extension)
- Product Hunt (launch)

**Nice to Have**:
- YouTube (video tutorials)
- Medium (articles)
- Hacker News (launch)

**Low Priority**:
- PyPI (not Python)
- LinkedIn (not B2B focused)
- Docker Hub (not containerized)

## Output Template

```markdown
# Brand Presence Strategy for [Project Name]

## Project Profile
- **Type**: [e.g., Open source Python ML library]
- **Audience**: [e.g., ML engineers, data scientists]
- **Distribution**: [e.g., PyPI, Docker]
- **Marketing**: [e.g., Community-driven, content marketing]

## Platform Priorities

### Tier 1: Must Have (Dealbreakers)
| Platform | Score | Rationale |
|----------|-------|-----------|
| Domain (.com/.dev) | 25 | Primary web presence |
| GitHub | 24 | Code hosting, OSS credibility |
| PyPI | 23 | Package distribution |
| Twitter/X | 21 | Community engagement |

### Tier 2: Should Have (Important)
| Platform | Score | Rationale |
|----------|-------|-----------|
| Hugging Face | 18 | ML ecosystem standard |
| Discord | 17 | Community support |
| Product Hunt | 16 | Launch visibility |

### Tier 3: Nice to Have (If Available)
| Platform | Score | Rationale |
|----------|-------|-----------|
| YouTube | 14 | Tutorial content |
| Dev.to | 13 | Developer articles |
| Medium | 12 | Long-form content |

### Tier 4: Low Priority (Resources Permitting)
| Platform | Score | Rationale |
|----------|-------|-----------|
| LinkedIn | 8 | Limited B2B focus |
| Reddit | 7 | No specific subreddit |
| npm | 5 | Not JavaScript focused |

## Recommendations
1. Focus name availability checks on Tier 1 platforms first
2. Consider name variations if Tier 1 conflicts exist
3. Tier 2+ conflicts are acceptable if Tier 1 is secured
```

## Output

**Document**: `PLATFORM_PRIORITIES.md`

Save this document in your project root. It should contain:
- Project profile summary
- Scored platform list
- Tiered priority groupings (Must Have, Should Have, Nice to Have, Low Priority)
- Rationale for each platform's placement

### Required Input
- `PROJECT_DESCRIPTION.md` — for project type, audience, distribution model
- `ECOSYSTEM_PARTICIPANTS.md` — for competitor platform presence

### Feeds Into
- Determines which platforms to check first in `NAME_VARIATION_AVAILABILITY.md`
- Guides which availability check skills to prioritize

## Related Skills

- `gather-ecosystem-participants` - Research where competitors are present
- `generate-names` - Generate name candidates
- `generate-name-variations` - Create variations when names are taken
- `check-name-availability-on-*` - Verify availability on each platform
