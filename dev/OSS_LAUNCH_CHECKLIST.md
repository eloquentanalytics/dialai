# OSS Launch Checklist

Organized by effort and impact. Based on analysis of DSPy, TensorZero, promptfoo, DeepEval, AutoGen, CrewAI, and others.

---

## Tier 1: Foundation (Low Effort, High Impact)

Table stakes. Every successful project has them.

### GitHub Repo Setup
- [ ] **LICENSE** - MIT or Apache 2.0
- [ ] **README.md** with:
  - [ ] Logo/banner image
  - [ ] One-liner description
  - [ ] Badges (npm version, build status, license, Discord)
  - [ ] Install command (`npm install dialai`)
  - [ ] Minimal code example (copy-pasteable)
  - [ ] Links to docs, Discord, contributing
- [ ] **Topic tags** - `ai`, `agents`, `llm`, `typescript`, `state-machine`
- [ ] **Social preview image** - Custom og:image for link previews
- [ ] **GitHub Releases** - Tag versions, write release notes

### Package Distribution
- [ ] **npm package** - Clean name, TypeScript types included
- [ ] **Automated publishing** - GitHub Action on tagged releases

### Basic Docs
- [ ] **Docs site** - Docusaurus (already have this)
- [ ] **Quickstart** - Working example in under 5 minutes
- [ ] **Installation guide** - npm, requirements, prerequisites

### Contributor Experience
- [ ] **CONTRIBUTING.md** - Fork, clone, branch, PR workflow
- [ ] **CODE_OF_CONDUCT.md** - Contributor Covenant
- [ ] **Issue templates** - Bug report, feature request (YAML forms)
- [ ] **PR template** - Description, related issues, testing checklist

**Who has this:** Everyone (10/10)

---

## Tier 2: Community & Social (Low Effort, High Impact)

Sets you apart from abandoned repos. Do this before launch.

### Community Channels
- [ ] **Discord server** - Primary community channel
  - [ ] #general, #help, #showcase, #announcements, #contributing
- [ ] **GitHub Discussions** - Enable as async alternative

### Social Presence
- [ ] **Twitter/X account** - @dialai or similar
  - [ ] Link to repo in bio
  - [ ] Pin a demo tweet
- [ ] **LinkedIn page** - For enterprise credibility

### Early Framework Integrations
Start these early - they're table stakes for adoption:
- [ ] **LangChain integration** - Nearly universal (DSPy, DeepEval, AutoGen, CrewAI, promptfoo, ADAS all have this)
- [ ] **LlamaIndex integration** - Common for RAG use cases (DSPy, AutoGen, DeepEval)

**Who has this:** DSPy, TensorZero, promptfoo, DeepEval, AutoGen, CrewAI, Agent Lightning (7/10)

---

## Tier 3: Launch Push (Medium Effort, High Impact)

The difference between "exists" and "people know about it."

### Launch Day Posts
- [ ] **Hacker News "Show HN"** - Highest value channel for dev tools
  - Post link to GitHub repo
  - Founder posts detailed explanatory comment
  - Best times: Tuesday-Thursday, 9am-11am EST
- [ ] **Reddit posts** - One per relevant subreddit
  - [ ] r/MachineLearning, r/LocalLLaMA, r/typescript, r/node, r/programming
- [ ] **Twitter/X launch thread** - Demo GIF, explain the "why"
- [ ] **Product Hunt** - Link to docs site, not raw GitHub

### Launch Content
- [ ] **Launch blog post** - Why we built this, who it's for, what's different
- [ ] **Demo GIF/video** - 30-60 seconds showing it in action

### Launch Metrics (from comparators)
| Platform | Example Result |
|----------|----------------|
| Hacker News | DSPy, TensorZero, promptfoo all launched here |
| Product Hunt | CrewAI hit #2, DeepEval and promptfoo listed |
| Reddit | Agent Lightning post in r/LocalLLaMA |

**Who has this:** DSPy, TensorZero, promptfoo, DeepEval, CrewAI (5/10 with strong launches)

---

## Tier 4: Early Podcasts & Media (Medium Effort, High Impact)

Don't wait for traction - podcast appearances drive early adoption. DSPy, CrewAI, TensorZero all did podcasts within months of launch.

### Tier B Podcasts (Accessible, Still High Value)
Start here - they're more likely to feature newer projects:
- [ ] **Weaviate Podcast** - DSPy appeared here (#85)
- [ ] **MLOps Community** - DSPy appeared (#194)
- [ ] **Open Source Startup Podcast** - TensorZero appeared (#163)
- [ ] **Software Engineering Daily** - CrewAI appeared here
- [ ] **The Data Exchange** - CrewAI appeared here

### Developer Publications
Pitch tutorials and explainers:
- [ ] **The New Stack** - DSPy coverage, promptfoo (Ian Webster is contributor)
- [ ] **MarkTechPost** - Covered TextGrad, Agent Lightning, ADAS, AutoGen
- [ ] **Analytics Vidhya** - Agent Lightning tutorial
- [ ] **Dev.to** - Cross-post launch blog with #showdev tag

### Newsletter Submissions
- [ ] **TLDR** - https://tldr.tech/
- [ ] **Console.dev** - https://console.dev/
- [ ] **JavaScript Weekly** - https://javascriptweekly.com/
- [ ] **Node Weekly** - https://nodeweekly.com/

**Who did this early:** DSPy (4+ podcasts), CrewAI (6+ podcasts), TensorZero (4+ podcasts)

---

## Tier 5: Documentation Depth (Medium Effort, Medium Impact)

Converts visitors to users. Users to contributors.

### Docs Content
- [ ] **API reference** - Auto-generated from TSDoc comments
- [ ] **Concepts section** - Mental model, key abstractions (already have this)
- [ ] **Tutorials** - Step-by-step for common use cases
  - [ ] Basic session creation
  - [ ] Custom scoring functions
  - [ ] Multi-agent setup
  - [ ] Integration with LLM providers
- [ ] **Examples directory** - Self-contained, runnable examples
  - [ ] Each example has its own README
  - [ ] `npm install && npm start` works out of the box
- [ ] **FAQ** - Common questions and setup issues

### Interactive Content
- [ ] **CodeSandbox/StackBlitz template** - Try without installing
- [ ] **Colab notebook** - For Python users (if applicable)

**Who has this:** DSPy (30+ tutorials), TensorZero (18+ examples), promptfoo, DeepEval, AutoGen, CrewAI

---

## Tier 6: Observability & Platform Integrations (Medium Effort, High Impact)

These integrations drive adoption from teams already using these tools.

### Observability Platforms
- [ ] **MLflow** - DSPy has deep integration with autologging
- [ ] **Langfuse** - TensorZero, DSPy, promptfoo integrate
- [ ] **Arize Phoenix** - DSPy has out-of-box support
- [ ] **Weights & Biases** - DSPy Weave integration
- [ ] **OpenTelemetry** - TensorZero, DeepEval support

### Cloud Platform Support
- [ ] **AWS Bedrock** - CrewAI powers Bedrock Agents
- [ ] **Azure OpenAI** - AutoGen native support
- [ ] **GCP Vertex AI** - TensorZero, DeepEval support

**Who has this:**
- DSPy: MLflow, Langfuse, Arize, W&B
- TensorZero: OpenTelemetry, Langfuse
- promptfoo: Langfuse, LangGraph
- DeepEval: LangChain, LlamaIndex, HuggingFace, OpenTelemetry

---

## Tier 7: Ongoing Content (Medium Effort, Medium Impact)

Keeps the project visible over time. Builds SEO.

### Blog
- [ ] **Blog section on docs site** - Or separate blog.dialai.com
- [ ] **Regular posts** - Aim for 1-2 per month
  - Launch announcement
  - Use case deep-dives
  - Technical architecture
  - Community highlights
  - Version release notes

### Content Distribution
- [ ] **Dev.to cross-posts** - Use #showdev tag
- [ ] **Hashnode cross-posts**
- [ ] **Medium cross-posts** - Towards Data Science, etc.

**Who has this:** TensorZero (9 blog posts), promptfoo, DeepEval, CrewAI, Agent Lightning

---

## Tier 8: High-Profile Podcasts & Conferences (High Effort, High Impact)

After initial traction, pursue higher-profile opportunities.

### Tier A Podcasts
- [ ] **Latent Space** - promptfoo appeared here (swyx, Alessio)
- [ ] **a16z AI Podcast** - promptfoo had 3 appearances
- [ ] **TWIML AI Podcast** - ADAS appeared (#700)
- [ ] **AI Engineering Podcast** - TensorZero appeared here

### Academic Conferences (for credibility)
- [ ] **NeurIPS** - ADAS Outstanding Paper, Inspect AI workshop
- [ ] **ICLR** - DSPy Spotlight, ADAS main venue, AutoGen Best Paper (workshop)

### Industry Conferences (for reach)
- [ ] **Data + AI Summit** - DSPy 3.0 announcement
- [ ] **Microsoft Build** - AutoGen featured
- [ ] **RSA / Black Hat / DEF CON** - promptfoo security circuit

### Educational Partnerships
- [ ] **DeepLearning.AI course** - DSPy and CrewAI both have Andrew Ng courses
- [ ] **DataCamp** - DSPy intro guide, AutoGen tutorial
- [ ] **Codecademy** - promptfoo guide, AutoGen tutorial
- [ ] **Official provider courses** - promptfoo has OpenAI, Anthropic, AWS, IBM courses

**Who has this:** DSPy (DeepLearning.AI), CrewAI (learn.crewai.com, Andrew Ng), promptfoo (OpenAI/Anthropic/AWS courses)

---

## Tier 9: Polish & Maturity (Low Effort, Low Impact)

Nice to have. Shows maturity.

### Repo Polish
- [ ] **SECURITY.md** - Vulnerability reporting process
- [ ] **CHANGELOG.md** - Keep a Changelog format
- [ ] **FUNDING.yml** - GitHub Sponsors, Open Collective
- [ ] **Branch protection** - Required reviews on main
- [ ] **Dependabot** - Automated security updates
- [ ] **"good first issue" labels** - Aim for 25% of open issues

### Branding
- [ ] **Logo files** - PNG, SVG in /assets or /branding
- [ ] **Press/brand page** - Logo downloads, usage guidelines
- [ ] **Consistent visual identity** - Docs, social, README

### CI/CD
- [ ] **Test coverage badge** - Display in README
- [ ] **Build status badge**

**Who has this:** promptfoo (press page), CrewAI (brand guide), DSPy (logo credit)

---

## Tier 10: Scale & Community (High Effort, High Impact)

For when you have traction and want to accelerate.

### Community Growth
- [ ] **Community forum** - Discourse or similar (CrewAI has community.crewai.com)
- [ ] **Community newsletter** - Weekly/monthly updates (DSPyWeekly, DeepEval weekly)
- [ ] **Contributor recognition** - All Contributors bot, contributor page
- [ ] **Office hours** - Regular video calls with maintainers

### Own Events
- [ ] **Annual conference** - CrewAI Signal has 500+ attendees, Andrew Ng/Aaron Levie speakers

### Influencer Relationships
- [ ] **Academic** - Omar Khattab (DSPy), Jeff Clune (ADAS), James Zou (TextGrad)
- [ ] **Industry** - Andrew Ng, Dharmesh Shah, Amjad Masad (all CrewAI investors/speakers)
- [ ] **Developer Advocates** - Simon Willison, swyx

**Who has this:** DSPy (DeepLearning.AI course), AutoGen (MS Research videos), CrewAI (learn.crewai.com, Signal conference)

---

## Tier 11: Enterprise & Commercial (High Effort, Variable Impact)

For commercial viability. Most open source projects skip this.

### Trust & Compliance
- [ ] **SOC2 certification** - promptfoo has this
- [ ] **ISO 27001** - promptfoo has this
- [ ] **HIPAA compliance** - If targeting healthcare
- [ ] **Trust center** - Security documentation (trust.promptfoo.dev)
- [ ] **Status page** - Uptime monitoring (status.promptfoo.app)

### Commercial Features
- [ ] **Cloud/SaaS version** - Hosted offering (promptfoo.app, app.crewai.com)
- [ ] **Enterprise tier** - SSO, audit logs, support SLAs
- [ ] **Pricing page** - Clear tiers
- [ ] **Contact sales flow** - Demo request form

### Enterprise Partnerships
| Partner Type | Examples |
|--------------|----------|
| Cloud Provider | AWS (CrewAI), IBM (CrewAI, DSPy), NVIDIA (CrewAI) |
| Data Platform | Databricks (DSPy primary), Cloudera (CrewAI) |
| Infrastructure | HPE (CrewAI), vLLM (Agent Lightning) |
| Security | OWASP (promptfoo official solution) |

### Funding (if pursuing)
- [ ] **Pitch deck**
- [ ] **Case studies** - Enterprise customers
- [ ] **Investor relationships** - a16z, Insight Partners, YC actively promote portfolio companies

**Who has this:** promptfoo ($23.6M), TensorZero ($7.3M), DeepEval ($2.7M YC), CrewAI ($18M)

---

## Priority Sequence for DIAL

### Now (Pre-Launch)
1. README polish (logo, badges, demo GIF, one-liner)
2. Discord server setup
3. Twitter/X account
4. npm package published
5. Examples directory with 2-3 runnable examples
6. **LangChain integration** (start now - it's table stakes)

### Launch Week
1. Hacker News "Show HN" post
2. Reddit posts (r/MachineLearning, r/LocalLLaMA)
3. Twitter launch thread with demo GIF
4. Launch blog post

### First Month
1. Respond to community feedback
2. Add tutorials based on questions
3. Submit to newsletters (TLDR, Console.dev)
4. Product Hunt listing
5. **Pitch Tier B podcasts** (Weaviate, MLOps Community, Open Source Startup)
6. **Submit to MarkTechPost, Analytics Vidhya**

### First Quarter
1. Regular blog posts (1-2/month)
2. More examples and tutorials
3. **LlamaIndex integration**
4. **Observability integrations** (MLflow or Langfuse)
5. Conference talk proposal (Data+AI Summit, NeurIPS workshop)

### First Year
1. **Tier A podcasts** (Latent Space, AI Engineering Podcast)
2. **Educational partnerships** (DataCamp, Codecademy tutorials)
3. **Cloud platform support** (AWS Bedrock, Azure)
4. **Influencer relationships** (engage with AI Twitter)

---

## Comparator Benchmarks

| Metric | DSPy | CrewAI | AutoGen | promptfoo |
|--------|------|--------|---------|-----------|
| Stars | 32K | 43.7K | 54.3K | 10.3K |
| Contributors | 364 | 277 | 557 | 238 |
| Discord | Yes | Yes | Yes | Yes |
| LangChain | Yes | Yes | Yes | Yes |
| Podcasts | 4+ | 6+ | 3+ | 6+ |
| Funding | Academic | $18M | Microsoft | $23.6M |
| Online course | DeepLearning.AI | learn.crewai.com | No | No |

### Key Insight

The projects with the most stars (AutoGen 54K, CrewAI 44K, DSPy 32K) all have:
1. **LangChain integration** from early on
2. **Podcast appearances** within months of launch
3. **Major platform backing** (Microsoft, Databricks) or **significant VC funding**
4. **Educational partnerships** (DeepLearning.AI, official provider courses)

The smaller projects (TextGrad 3.3K, Inspect AI 1.7K, ADAS 1.5K) are primarily academic with minimal marketing infrastructure and no framework integrations.
