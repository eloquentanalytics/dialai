# Ecosystem Features Reference

Competitive analysis of the 10 tools in DIAL's ecosystem, plus general open-source launch best practices.

---

## Licensing & Commercial Strategy

How each project handles open source vs. commercial offerings:

| Tool | License | Cloud/SaaS | Commercial Model |
|------|---------|------------|------------------|
| DSPy | MIT | None | Pure open source, academic |
| TensorZero | Apache 2.0 | None (self-hosted) | Open source + "Autopilot" waitlist (upcoming paid) |
| TextGrad | MIT | None | Pure open source, academic |
| Inspect AI | MIT | None | Pure open source, government-funded |
| promptfoo | MIT | promptfoo.app | Open core: OSS eval + paid cloud platform |
| DeepEval | Apache 2.0 | app.confident-ai.com | Open core: OSS framework + paid Confident AI platform |
| AutoGen | MIT | None | Pure open source, Microsoft-backed |
| CrewAI | MIT | app.crewai.com | Open core: OSS framework + paid CrewAI Enterprise |
| Agent Lightning | MIT | None | Pure open source, Microsoft Research |
| ADAS | Apache 2.0 | None | Pure open source, academic |

### Licensing Patterns

**All 10 use permissive licenses (MIT or Apache 2.0).** None use:
- Business Source License (BSL)
- Server Side Public License (SSPL)
- Elastic License
- Commons Clause

This is notable because many infrastructure projects (Redis, MongoDB, Elastic, HashiCorp) have moved to restrictive licenses to prevent cloud providers from offering competing services. The AI agent/eval space has stayed permissive, likely because:
1. Most are academic or corporate-backed (not VC-funded needing revenue protection)
2. The value is in the cloud platform, not the OSS core
3. Community adoption matters more than license protection at this stage

### Commercial Models

**Open Core (OSS + Paid Cloud)**
- **promptfoo**: MIT-licensed CLI/framework, paid promptfoo.app for teams (SOC2, ISO 27001, HIPAA)
- **DeepEval**: Apache 2.0 framework, paid Confident AI platform for observability and collaboration
- **CrewAI**: MIT framework, paid CrewAI Enterprise with Studio, SSO, audit logs

**Pure Open Source (No Commercial)**
- **DSPy**: Academic, no commercial offering. Databricks provides hosting/integration but DSPy itself is free
- **AutoGen**: Microsoft Research, no separate commercial. Integrates with Azure AI Foundry
- **Agent Lightning**: Microsoft Research, no commercial
- **Inspect AI**: UK Government funded, no commercial
- **TextGrad, ADAS**: Academic research, no commercial

**Upcoming/Hybrid**
- **TensorZero**: Currently 100% self-hosted open source, but has "Autopilot" waitlist for upcoming paid automated optimization service

### Cloud Platform Features (for those with paid offerings)

| Feature | promptfoo | DeepEval/Confident AI | CrewAI |
|---------|-----------|----------------------|--------|
| **Cloud URL** | promptfoo.app | app.confident-ai.com | app.crewai.com |
| **SSO** | Yes (Enterprise) | Yes | Yes (Enterprise) |
| **Audit Logs** | Yes | Yes | Yes |
| **Team Collaboration** | Yes | Yes | Yes |
| **SOC2** | Yes | Unknown | Unknown |
| **HIPAA** | Yes | Unknown | Unknown |
| **On-Prem Option** | Yes | Yes (AWS/Azure/GCP) | Yes (via HPE partnership) |
| **Pricing Public** | Yes (promptfoo.dev/pricing) | No | No |

### Revenue/Business Model Details

**promptfoo**
- Open source CLI for local eval and red teaming
- Cloud platform for CI/CD integration, team collaboration, dashboards
- Enterprise tier with compliance certifications
- Claims 127 Fortune 500 companies as users
- $23.6M raised (a16z, Insight Partners)

**DeepEval / Confident AI**
- Open source DeepEval framework for evaluation metrics
- Confident AI platform for observability, tracing, dataset management
- Claims Microsoft, BCG, AstraZeneca, AXA as customers
- $2.7M raised (YC W25)

**CrewAI**
- Open source framework for multi-agent orchestration
- CrewAI Enterprise with Studio (visual builder), Flows, deployment tools
- Claims 60% of Fortune 500, 150 enterprise customers
- $18M raised (Insight Partners, Andrew Ng)
- Own learning platform (learn.crewai.com) and conference (Signal)

---

## Growth Trajectories

How fast these projects grew (where data available):

| Project | Launch | Time to 10K Stars | Current Stars | Key Growth Driver |
|---------|--------|-------------------|---------------|-------------------|
| AutoGen | Sep 2023 | ~2 weeks | 54.3K | Microsoft backing, HN front page |
| CrewAI | Dec 2023 | ~8 months | 43.7K | Product Hunt #2, Andrew Ng promotion |
| DSPy | Sep 2023 | ~12 months | 32K | ICLR Spotlight, Databricks backing |
| Agent Lightning | Oct 2025 | ~2 months | 14.1K | Microsoft Research, vLLM partnership |
| DeepEval | Sep 2023 | ~18 months | 13.5K | YC W25, steady community growth |
| TensorZero | Sep 2024 | ~6 months | 10.9K | #1 GitHub trending, HN Show HN |
| promptfoo | May 2023 | ~18 months | 10.3K | Security focus, a16z backing |

**Key observations:**
- Microsoft-backed projects (AutoGen, Agent Lightning) grow fastest initially
- VC funding announcements create growth spikes
- Academic projects (DSPy) grow slower but steadier
- Product Hunt can drive significant early traction (CrewAI)

---

## Founder/Team Backgrounds

Where the creators came from (relevant for credibility and network):

| Project | Founder(s) | Background | Current |
|---------|-----------|------------|---------|
| DSPy | Omar Khattab | Stanford PhD, Databricks Research Scientist | MIT Assistant Professor (July 2025) |
| TensorZero | Gabriel Bianconi, Viraj Mehta | Stanford CS, Ondo Finance CPO; CMU PhD (RL) | NYC startup |
| promptfoo | Ian Webster, Michael D'Angelo | Discord Senior Staff SWE; Smile Identity VP Eng | San Mateo startup |
| DeepEval | Jeffrey Ip, Kritin Vongthongsri | Google/Microsoft SWE; Princeton AI researcher | SF startup (YC W25) |
| AutoGen | Chi Wang, Qingyun Wu | Microsoft Research; Penn State | Chi Wang now at Google DeepMind |
| CrewAI | Joao Moura | Clearbit (acquired by HubSpot) | SF startup |
| Agent Lightning | Xufang Luo, Yuge Zhang | Microsoft Research Asia - Shanghai | Microsoft |
| ADAS | Shengran Hu, Cong Lu, Jeff Clune | UBC PhD; UBC; DeepMind advisor | Academic |
| TextGrad | Mert Yuksekgonul, James Zou | Stanford PhD; Stanford professor | Academic |
| Inspect AI | JJ Allaire | RStudio/Posit founder | UK AISI |

**Patterns:**
- Academic founders (DSPy, TextGrad, ADAS) tend toward pure open source
- Ex-FAANG founders (promptfoo, DeepEval) tend toward open core with commercial
- Microsoft researchers (AutoGen, Agent Lightning) stay pure open source under corporate backing

---

## Community Size & Engagement

| Project | GitHub Stars | Discord Members | Contributors | Weekly npm/PyPI Downloads |
|---------|-------------|-----------------|--------------|---------------------------|
| AutoGen | 54.3K | 5,000+ | 557 | N/A (multiple packages) |
| CrewAI | 43.7K | Active | 277 | N/A |
| DSPy | 32K | Active | 364 | N/A |
| Agent Lightning | 14.1K | Active | 29 | N/A |
| DeepEval | 13.5K | Active | 229 | ~18.5K |
| TensorZero | 10.9K | Active | 106 | N/A |
| promptfoo | 10.3K | Active | 238 | ~34.6K |
| TextGrad | 3.3K | None | 20 | N/A |
| Inspect AI | 1.7K | None | 176 | N/A |
| ADAS | 1.5K | None | 3 | N/A (not packaged) |

**Observations:**
- High contributor count doesn't correlate with stars (Inspect AI has 176 contributors but only 1.7K stars)
- Projects without Discord (TextGrad, Inspect AI, ADAS) have significantly fewer stars
- promptfoo has highest npm downloads despite fewer stars (security/enterprise focus)

---

## What They Ship (Product Surface Area)

| Project | Core OSS | CLI | Web UI | VS Code Extension | Cloud Platform | SDK Languages |
|---------|----------|-----|--------|-------------------|----------------|---------------|
| DSPy | Framework | No | No | No | No | Python |
| TensorZero | Gateway | No | Yes (self-hosted) | No | No | Python, Rust, any OpenAI SDK |
| TextGrad | Framework | No | No | No | No | Python |
| Inspect AI | Framework | Yes | Yes (Inspect View) | Yes | No | Python |
| promptfoo | Framework | Yes | Yes | No | Yes | Node.js/TypeScript |
| DeepEval | Framework | Yes | No | No | Yes | Python |
| AutoGen | Framework | No | Yes (AutoGen Studio) | No | No | Python, .NET |
| CrewAI | Framework | Yes | Yes (Studio) | No | Yes | Python |
| Agent Lightning | Framework | No | No | No | No | Python |
| ADAS | Research code | No | No | No | No | Python |

**Observations:**
- CLI is common for eval tools (promptfoo, DeepEval, Inspect AI, CrewAI)
- Web UI differentiates (AutoGen Studio, CrewAI Studio, TensorZero UI)
- Only Inspect AI has VS Code extension
- TypeScript/Node.js is rare (only promptfoo) - potential differentiator for DIAL

---

## Positioning Statements

How each project describes itself (useful for differentiation):

| Project | One-liner |
|---------|-----------|
| DSPy | "The framework for programming—not prompting—language models" |
| TensorZero | "Open-source stack for industrial-grade LLM applications" |
| TextGrad | "Automatic differentiation via text" |
| Inspect AI | "Framework for large language model evaluations" |
| promptfoo | "Test your prompts, agents, and RAGs. Red teaming for LLMs" |
| DeepEval | "The LLM Evaluation Framework" |
| AutoGen | "A programming framework for agentic AI" |
| CrewAI | "Framework for orchestrating role-playing, autonomous AI agents" |
| Agent Lightning | "Train ANY AI agents with reinforcement learning" |
| ADAS | "Automated design of agentic systems" |

**Positioning gaps DIAL could fill:**
- None emphasize "human-AI delegation" or "trust calibration"
- None focus on "state machine" based decision making
- None mention "progressive delegation" or "empirical trust"
- TypeScript-first is unique (only promptfoo is JS/TS)

---

## Summary Comparison

| Tool | Stars | Discord | Twitter | Blog | Newsletter | Product Hunt | Funding |
|------|-------|---------|---------|------|------------|--------------|---------|
| DSPy | 32K | Yes | @DSPyOSS | Community | DSPyWeekly | No | Academic grants |
| TensorZero | 10.9K | Yes | @tensorzero | Yes (9 posts) | Mailing list | Yes | $7.3M seed |
| TextGrad | 3.3K | No | Researchers only | Stanford HAI | No | No | Stanford HAI |
| Inspect AI | 1.7K | No | @AISecurityInst | UK AISI | No | No | UK Government |
| promptfoo | 10.3K | Yes | @promptfoo | Yes | No | Yes | $23.6M (Series A) |
| DeepEval | 13.5K | Yes | @deepeval | Yes | Weekly | Yes | $2.7M (YC W25) |
| AutoGen | 54.3K | Yes | @pyautogen | MS DevBlogs | No | No | Microsoft Research |
| CrewAI | 43.7K | Yes | @crewAIInc | Yes | Monthly | Yes (#2) | $18M (Series A) |
| Agent Lightning | 14.1K | Yes | Community | Yes | No | No | Microsoft Research |
| ADAS | 1.5K | No | @shengranhu | No | No | No | Academic (UBC) |

---

## 1. DSPy

### Repository
- **GitHub:** https://github.com/stanfordnlp/dspy
- **Stars:** 32,017
- **Contributors:** 364
- **License:** MIT

### Documentation
- **Site:** https://dspy.ai
- **Tutorials:** https://dspy.ai/tutorials/ (30+ tutorials)
- **API Reference:** https://dspy.ai/learn/
- **Roadmap:** https://dspy.ai/roadmap/

### Community
- **Discord:** https://discord.gg/XCGy2WDCQB
- **Twitter:** https://x.com/DSPyOSS
- **Author Twitter:** https://x.com/lateinteraction (Omar Khattab)
- **LinkedIn:** https://www.linkedin.com/company/dspy

### Content
- **Newsletter:** https://dspyweekly.com (community-run, weekly)
- **YouTube:** No channel, but 19+ community videos listed at https://dspy.ai/community/community-resources/
- **DeepLearning.AI Course:** https://www.deeplearning.ai/short-courses/dspy-build-optimize-agentic-apps/
- **Stanford Lecture:** https://www.youtube.com/watch?v=JEMYuzrKLUw

### Distribution
- **PyPI:** https://pypi.org/project/dspy/
- **Install:** `pip install dspy`

### Launch/Press
- **Hacker News:** https://news.ycombinator.com/item?id=37417698 (Sep 2023)
- **Product Hunt:** Not listed

### Assets
- **Logo:** https://raw.githubusercontent.com/stanfordnlp/dspy/main/docs/docs/static/img/dspy_logo.png
- **Contributing:** https://dspy.ai/community/how-to-contribute/
- **Releases:** https://github.com/stanfordnlp/dspy/releases

### Research
- **ICLR 2024 Spotlight:** https://openreview.net/forum?id=sY5N0zY5Od
- **ArXiv:** https://arxiv.org/abs/2310.03714
- **10+ papers** including GEPA, DSPy Assertions, Multi-Stage Optimization

### Funding
- Academic grants (~$300K) from Oracle Labs, IBM Research AI, HAI-Azure
- Databricks investment in community
- Omar Khattab joined MIT faculty (July 2025)

### Partnerships & Integrations

**Platform Partners**
- **Databricks** (Primary) - Omar Khattab was Research Scientist; Matei Zaharia (Databricks CTO) co-authored; native integration with Databricks Model Serving and Vector Search
- **IBM** - Tutorials on IBM watsonx using Llama 3
- **AWS** - Used with Strands Agents and Amazon Bedrock for internal tools

**Framework Integrations**
- LangChain (`Tool.from_langchain`)
- LlamaIndex (RAG enhancement)
- Weaviate (`dspy.WeaviateRM`)
- Pinecone, Chroma (vector DBs)

**Observability**
- MLflow (autologging via `mlflow.dspy.autolog()`)
- Langfuse, Arize Phoenix, Weights & Biases

**Enterprise Users**
- JetBlue (customer feedback, predictive maintenance)
- Walmart, VMware, Replit, Moody's, Sephora

**Podcasts**
- Weaviate Podcast #85
- MLOps Community #194
- Cohere Interview
- Stanford CS224U

**Conferences**
- Data + AI Summit 2024/2025
- ICLR 2024 Spotlight
- NeurIPS 2023

**Influencers**
- Matei Zaharia (Databricks) promotes on LinkedIn
- Simon Willison coverage
- Andrew Ng (DeepLearning.AI course partnership)

---

## 2. TensorZero

### Repository
- **GitHub:** https://github.com/tensorzero/tensorzero
- **Stars:** 10,908
- **Contributors:** 106
- **License:** Apache 2.0
- **Language:** Rust

### Documentation
- **Site:** https://www.tensorzero.com/docs
- **Quick Start:** https://www.tensorzero.com/docs/quickstart
- **API Reference:** https://www.tensorzero.com/docs/gateway/api-reference

### Community
- **Discord:** https://www.tensorzero.com/discord
- **Slack:** https://www.tensorzero.com/slack
- **Twitter:** https://x.com/tensorzero
- **LinkedIn:** https://www.linkedin.com/company/tensorzero
- **GitHub Discussions:** https://github.com/tensorzero/tensorzero/discussions

### Content
- **Blog:** https://www.tensorzero.com/blog (9 posts)
- **Podcast:** https://www.aiengineeringpodcast.com/episodepage/optimize-your-ai-applications-automatically-with-the-tensorzero-llm-gateway_638729313800208083

### Distribution
- **PyPI:** https://pypi.org/project/tensorzero/
- **Docker Hub:** https://hub.docker.com/r/tensorzero/gateway
- **Crates.io:** https://crates.io/crates/tensorzero

### Launch/Press
- **Hacker News:** https://news.ycombinator.com/item?id=41557020 (Show HN, Sep 2024)
- **Product Hunt:** https://www.producthunt.com/products/tensorzero
- **VentureBeat:** https://venturebeat.com/infrastructure/tensorzero-nabs-7-3m-seed-to-solve-the-messy-world-of-enterprise-llm-development/

### Assets
- **Examples:** https://github.com/tensorzero/tensorzero/tree/main/examples (18+ examples)
- **Playground:** Built into TensorZero UI
- **Contributing:** https://github.com/tensorzero/tensorzero/blob/main/CONTRIBUTING.md
- **Releases:** https://github.com/tensorzero/tensorzero/releases (CalVer)

### Funding
- **$7.3M Seed** (Aug 2025)
- **Lead:** FirstMark
- **Investors:** Bessemer Venture Partners, Bedrock, DRW, Coalition
- **Founders:** Gabriel Bianconi (CEO), Viraj Mehta (CTO)
- **Crunchbase:** https://www.crunchbase.com/organization/tensorzero

### Partnerships & Integrations

**Model Providers (unified gateway)**
- OpenAI, Anthropic, Google (Vertex AI, Gemini)
- AWS Bedrock, AWS SageMaker, Azure OpenAI
- DeepSeek, Fireworks, Groq, Mistral, Together AI, vLLM, xAI

**Observability**
- OpenTelemetry (OTLP) export to Jaeger, Datadog, Grafana
- Langfuse compatible

**Developer Tools**
- Cursor IDE (reverse-engineered client for observability/A/B testing)

**Podcasts**
- AI Engineering Podcast (Viraj Mehta)
- Open Source Startup Podcast #163
- Hard Software / BEM.ai Podcast
- Techstrong TV (Gabriel Bianconi)

**Media Coverage**
- VentureBeat, AlleyWatch, Yahoo Finance, PR Newswire
- Open Source For You, StartupHub.AI

**Investor Promotion**
- FirstMark actively promotes via portfolio page and blog
- Bessemer Venture Partners lists in portfolio

**Case Study**
- Large European Bank (code changelog automation)

---

## 3. TextGrad

### Repository
- **GitHub:** https://github.com/zou-group/textgrad
- **Stars:** 3,339
- **Contributors:** 20
- **License:** MIT

### Documentation
- **Site:** https://textgrad.readthedocs.io/en/latest/
- **Examples:** https://github.com/zou-group/textgrad/tree/main/examples/notebooks

### Community
- **Discord/Slack:** None
- **Twitter:** Researchers only (@james_y_zou, @mertyuksekgonul, @ShengLiu_)
- **GitHub Discussions:** https://github.com/zou-group/textgrad/discussions

### Content
- **Stanford HAI Blog:** https://hai.stanford.edu/news/textgrad-autograd-text
- **YouTube:** No channel

### Distribution
- **PyPI:** https://pypi.org/project/textgrad/
- **Conda:** https://anaconda.org/conda-forge/textgrad

### Launch/Press
- **Hacker News:** https://news.ycombinator.com/item?id=44179464
- **Product Hunt:** Not listed

### Assets
- **Logo:** https://github.com/zou-group/textgrad/blob/main/assets/logo_full.png
- **Hugging Face Demo:** https://huggingface.co/spaces/TextGrad/demo
- **Releases:** https://github.com/zou-group/textgrad/releases

### Research
- **Nature (March 2025):** https://www.nature.com/articles/s41586-025-08661-4
- **ArXiv:** https://arxiv.org/abs/2406.07496
- **NeurIPS 2025:** metaTextGrad paper

### Funding
- Stanford HAI support
- Academic (Zou Group, Stanford)

### Partnerships & Integrations

**Academic Collaborations**
- Stanford HAI (primary promotion)
- Chan Zuckerberg Biohub (co-developed)
- ETH Zurich / EPFL (transatlantic partnership)

**Framework Comparisons**
- Frequently compared with DSPy (complementary approaches)
- PyTorch-style API design

**Media Coverage**
- Stanford HAI blog and Twitter promotion
- MarkTechPost coverage
- Nature publication (March 2025)

**Research Team**
- James Zou (lead), Mert Yuksekgonul, Federico Bianchi, Carlos Guestrin

---

## 4. Inspect AI

### Repository
- **GitHub:** https://github.com/UKGovernmentBEIS/inspect_ai
- **Stars:** 1,724
- **Contributors:** 176
- **License:** MIT

### Documentation
- **Site:** https://inspect.aisi.org.uk/
- **Tutorial:** https://inspect.aisi.org.uk/tutorial.html
- **Pre-built Evals:** https://ukgovernmentbeis.github.io/inspect_evals/ (100+)

### Community
- **Discord/Slack:** None
- **Twitter:** https://x.com/AISecurityInst (UK AISI)
- **GitHub Issues:** Primary support channel

### Content
- **Blog:** https://www.aisi.gov.uk/blog
- **YouTube:** No channel, but conference talks available

### Distribution
- **PyPI:** https://pypi.org/project/inspect-ai/
- **VS Code Extension:** https://marketplace.visualstudio.com/items?itemName=ukaisi.inspect-ai

### Launch/Press
- **Hacker News:** Occasional mentions
- **Product Hunt:** Not listed

### Assets
- **Examples:** https://github.com/UKGovernmentBEIS/inspect_ai/tree/main/examples
- **Changelog:** https://github.com/UKGovernmentBEIS/inspect_ai/blob/main/CHANGELOG.md
- **Contributing:** https://github.com/UKGovernmentBEIS/inspect_ai/blob/main/CONTRIBUTING.md

### Research
- **Conference Talk:** https://parlance-labs.com/education/evals/allaire.html (JJ Allaire at Mastering LLMs)

### Funding
- UK Government (AI Security Institute)

### Partnerships & Integrations

**Government Partnerships**
- UK AI Security Institute (AISI) - primary framework for nearly all automated evaluations
- US AI Safety Institute - joint pre-deployment evaluation of OpenAI o1
- US CAISI - adopted Inspect's sandbox providers

**AI Safety Community**
- Apollo Research (officially adopted Inspect as primary framework)
- METR (Model Evaluation and Threat Research)
- Anthropic, DeepMind, Grok (major AI labs adopted)
- RAND Corporation
- Center for AI Safety (CAIS)

**Framework Integrations**
- Multi-model: OpenAI, Anthropic, Google, Groq, Mistral, xAI, AWS Bedrock, Azure AI, vLLM, Ollama
- Agent Bridge: OpenAI Agents SDK, LangChain, Pydantic AI
- Hugging Face LightEval (uses inspect-ai as backend)

**Conferences**
- NeurIPS 2025 (AISI hosted full-day workshop, 10 papers)
- Parlance Labs education series

**Key Personnel**
- JJ Allaire (Founder of RStudio/Posit)

---

## 5. promptfoo

### Repository
- **GitHub:** https://github.com/promptfoo/promptfoo
- **Stars:** 10,300
- **Contributors:** 238
- **License:** MIT

### Documentation
- **Site:** https://www.promptfoo.dev/docs/intro/
- **Getting Started:** https://www.promptfoo.dev/docs/getting-started/
- **API Reference:** https://www.promptfoo.dev/docs/api-reference/

### Community
- **Discord:** https://discord.gg/promptfoo
- **Twitter:** https://x.com/promptfoo
- **Founder Twitter:** https://x.com/iwebst (Ian Webster)
- **LinkedIn:** https://www.linkedin.com/company/promptfoo/

### Content
- **Blog:** https://www.promptfoo.dev/blog/
- **Newsletter:** None
- **Podcasts:** a16z, CyberBytes, Latent Space

### Distribution
- **npm:** https://www.npmjs.com/package/promptfoo (34.6K weekly downloads)
- **Install:** `npx promptfoo@latest init`

### Launch/Press
- **Hacker News:** https://news.ycombinator.com/item?id=35807020 (Show HN, May 2023)
- **Product Hunt:** https://www.producthunt.com/products/promptfoo

### Assets
- **Cloud Platform:** https://promptfoo.app
- **Config Validator:** https://www.promptfoo.dev/validator/
- **LLM Security Database:** https://www.promptfoo.dev/lm-security-db/
- **Press Page:** https://www.promptfoo.dev/press/
- **Releases:** https://www.promptfoo.dev/docs/releases/

### Funding
- **$23.6M total** (Seed + Series A)
- **Series A:** $18.4M (July 2025, Insight Partners)
- **Seed:** $5.18M (July 2024)
- **Investors:** a16z, Insight Partners
- **Angels:** Tobi Lutke (Shopify CEO), Stanislav Vishnevskiy (Discord CTO)

### Other
- SOC2, ISO 27001 certified, HIPAA compliant
- Claims 127 of Fortune 500 as users

### Partnerships & Integrations

**Framework Integrations**
- LangChain (official guide for PromptTemplate)
- LangGraph (full evaluation support)
- CrewAI (red teaming support)
- Langfuse (bi-directional prompt management)

**Security Frameworks**
- OWASP LLM Top 10 (official security solution)
- NIST AI RMF (built-in preset)
- MITRE ATLAS

**Platform Integrations**
- Docker (official blog partnership)
- AWS Workshop Studio ("Mastering LLM Evaluation")
- 50+ AI model providers

**Podcasts**
- Latent Space (Ian Webster, Oct 2025)
- a16z AI Podcast (3 appearances)
- CyberBytes Podcast

**Conferences**
- ScaleUp:AI 2025 (Insight Partners)
- AI Security Summit 2025
- DEF CON 33, Black Hat USA 2025, RSA 2025
- Multiple BSides conferences

**Enterprise Customers**
- Shopify, Amazon (confirmed)
- 127 Fortune 500 companies

**Educational Partners**
- OpenAI ("Build Hour: Prompt Testing")
- Anthropic (Prompt Evaluations Course)
- AWS (Workshop Studio)
- IBM Skills Network

**Investor Promotion**
- a16z (3 podcast appearances, Anjney Midha)
- Insight Partners (blog features, ScaleUp:AI)

**Media Coverage**
- TechCrunch, Ars Technica, Stanford Cyber Policy Center (DeepSeek research)
- SecurityWeek, SiliconANGLE (funding)

---

## 6. DeepEval

### Repository
- **GitHub:** https://github.com/confident-ai/deepeval
- **Stars:** 13,475
- **Contributors:** 229
- **License:** Apache-2.0

### Documentation
- **DeepEval Docs:** https://deepeval.com/docs/getting-started
- **Confident AI Docs:** https://www.confident-ai.com/docs
- **Tutorials:** https://deepeval.com/tutorials/tutorial-introduction

### Community
- **Discord:** https://discord.gg/a3K9c8GRGt
- **Twitter (DeepEval):** https://x.com/deepeval
- **Twitter (Confident AI):** https://x.com/confident_ai
- **LinkedIn:** https://www.linkedin.com/company/confident-ai

### Content
- **Blog:** https://confident-ai.com/blog
- **Newsletter:** Weekly (signup on blog page)
- **Demo Video:** https://youtu.be/PB3ngq7x4ko

### Distribution
- **PyPI:** https://pypi.org/project/deepeval/
- **Install:** `pip install deepeval`

### Launch/Press
- **Hacker News (YC Launch):** https://news.ycombinator.com/item?id=43116633
- **Product Hunt:** https://www.producthunt.com/products/confident-ai

### Assets
- **Cloud Platform:** https://app.confident-ai.com
- **Colab Quickstart:** https://colab.research.google.com/drive/1PPxYEBa6eu__LquGoFFJZkhYgWVYE6kh
- **Changelog:** https://deepeval.com/changelog
- **Contributing:** https://github.com/confident-ai/deepeval/blob/main/CONTRIBUTING.md

### Funding
- **$2.7M total**
- **Seed:** $2.2M (closed in 5 days)
- **Y Combinator W25**
- **Investors:** Flex Capital, Liquid 2 Ventures, January Capital

### Partnerships & Integrations

**Framework Integrations**
- LangChain (DeepEvalCallbackHandler)
- LlamaIndex
- Hugging Face (DeepEvalHuggingFaceCallback)
- CrewAI, PydanticAI, OpenAI Agents
- OpenTelemetry (Grafana, Datadog)

**Cloud Deployment**
- AWS, Azure, GCP (on-premise options)
- LiteLLM integration

**Enterprise Customers**
- Microsoft, BCG, AstraZeneca, AXA, Capgemini
- Stellantis, Mercedes Benz, Booking, Accenture, Cisco, Toyota

**YC Promotion**
- Launch HN post (117 upvotes)
- YC Twitter/LinkedIn promotion of DeepTeam launch

**Content Creators**
- DataCamp tutorial (Abid Ali Awan)
- Codecademy guide
- Multiple Medium authors

**Products**
- DeepEval (open-source)
- Confident AI (cloud platform)
- DeepTeam (red teaming framework)

---

## 7. AutoGen

### Repository
- **GitHub:** https://github.com/microsoft/autogen
- **Stars:** 54,300
- **Contributors:** 557
- **License:** MIT / CC-BY-4.0

### Documentation
- **Site:** https://microsoft.github.io/autogen/
- **Stable:** https://microsoft.github.io/autogen/stable/
- **Gallery:** https://microsoft.github.io/autogen/0.2/docs/Gallery/

### Community
- **Discord:** https://aka.ms/autogen-discord
- **Twitter:** https://twitter.com/pyautogen
- **LinkedIn:** https://www.linkedin.com/company/105812540
- **GitHub Discussions:** https://github.com/microsoft/autogen/discussions

### Content
- **Blog:** https://devblogs.microsoft.com/autogen/
- **Videos:** https://www.microsoft.com/en-us/research/project/autogen/videos/
- **Newsletter:** None

### Distribution
- **PyPI (core):** https://pypi.org/project/autogen-core/
- **PyPI (agentchat):** https://pypi.org/project/autogen-agentchat/
- **PyPI (studio):** https://pypi.org/project/autogenstudio/
- **NuGet (.NET):** https://www.nuget.org/packages/Microsoft.AutoGen.Core/

### Launch/Press
- **Hacker News:** https://news.ycombinator.com/item?id=37926741
- **Product Hunt:** Not listed (Magentic-UI only)

### Assets
- **AutoGen Studio:** `pip install autogenstudio && autogenstudio ui`
- **Hugging Face Playground:** https://huggingface.co/spaces/thinkall/AutoGen_Playground
- **Releases:** https://github.com/microsoft/autogen/releases (98 releases)
- **Contributing:** https://github.com/microsoft/autogen/blob/main/CONTRIBUTING.md

### Research
- **ArXiv:** https://arxiv.org/abs/2308.08155
- **COLM 2024:** https://openreview.net/forum?id=BAakY1hNKS
- **MS Research:** https://www.microsoft.com/en-us/research/project/autogen/

### Funding
- Microsoft Research
- Merging with Semantic Kernel into "Microsoft Agent Framework" (Oct 2025)

### Partnerships & Integrations

**Microsoft Ecosystem**
- Semantic Kernel merger into "Microsoft Agent Framework" (Oct 2025, GA Q1 2026)
- Azure AI Foundry Agent Service (GA May 2025)
- Copilot Studio integration via A2A protocol
- Connectors: Microsoft Graph, SharePoint, Redis, Elastic

**Framework Integrations**
- LlamaIndex (LLamaIndexConversableAgent)
- Model Context Protocol (MCP) support
- Multi-model: OpenAI, Anthropic Claude, Google Gemini, Together.AI (75+ models)

**Enterprise Customers (via Salesforce Ventures)**
- AT&T, Accenture, HSBC, JP Morgan
- Novo Nordisk, Citrix, TCS, TeamViewer, Elastic
- 28 customers across Fortune 500 + government agencies

**Podcasts**
- AI Frontiers Podcast (Chi Wang, Spotify)
- Microsoft Research Podcast

**Conferences**
- Microsoft Build 2024/2025
- Microsoft Research Forum
- NeurIPS 2023, SciPy 2024
- AI.DEV Conference (Linux Foundation)

**Research**
- COLM 2024 publication
- Best Paper at ICLR 2024 LLM Agents Workshop
- Magentic-One (generalist multi-agent system)

**Key Personnel**
- Chi Wang (founder, now at Google DeepMind)
- Qingyun Wu (co-creator)
- Victor Dibia (AutoGen Studio)

**AG2 Fork**
- Community fork led by original creators
- 20 maintainers from Google, IBM, Meta, Penn State, UW

---

## 8. CrewAI

### Repository
- **GitHub:** https://github.com/crewAIInc/crewAI
- **Stars:** 43,673
- **Contributors:** 277
- **License:** MIT

### Documentation
- **Site:** https://docs.crewai.com
- **API Reference:** https://docs.crewai.com/en/api-reference/introduction
- **Cookbooks:** https://docs.crewai.com/en/examples/cookbooks

### Community
- **Discord:** https://discord.com/invite/crewai
- **Twitter:** https://twitter.com/crewAIInc
- **Founder Twitter:** https://twitter.com/joaomdmoura
- **Forum:** https://community.crewai.com
- **LinkedIn:** https://www.linkedin.com/in/joaomdmoura/

### Content
- **Blog:** https://blog.crewai.com
- **Newsletter:** Monthly (signup at crewai.com)
- **Learning Platform:** https://learn.crewai.com
- **Resources:** https://www.crewai.com/resources

### Distribution
- **PyPI:** https://pypi.org/project/crewai/
- **Install:** `pip install crewai`

### Launch/Press
- **Hacker News:** https://news.ycombinator.com/item?id=41918658
- **Product Hunt:** https://www.producthunt.com/products/crewai-2 (#2 on launch day)

### Assets
- **Cloud Platform:** https://app.crewai.com
- **CrewAI Studio:** https://docs.crewai.com/en/enterprise/features/crew-studio
- **Brand Guide:** https://www.crewai.com/brand
- **Logo:** https://brandfetch.com/crewai.com
- **Examples Repo:** https://github.com/crewAIInc/crewAI-examples
- **Changelog:** https://docs.crewai.com/en/changelog

### Funding
- **$18M total**
- **Series A:** Insight Partners (Oct 2024)
- **Inception:** Boldstart Ventures
- **Investors:** Craft Ventures, Earl Grey Capital, Andrew Ng
- **Crunchbase:** https://www.crunchbase.com/organization/crewai

### Partnerships & Integrations

**Cloud Partners**
- **AWS** - Powers Bedrock Agents with CrewAI (official case study)
- **IBM** - Integration with watsonx.ai, custom portal at ibm.crewai.com
- **NVIDIA** - NIM microservices, NeMo Retriever, Llama Nemotron
- **Cloudera** - Partnership announcement Dec 2024
- **HPE** - On-prem agentic AI infrastructure, HPE Private Cloud AI

**Framework Integrations**
- LangChain (LangChainTool wrapper)
- Native integrations: Gmail, Microsoft Teams, Notion, HubSpot, Salesforce, Slack

**Enterprise Customers**
- PwC (code gen accuracy 10% to 70%)
- IBM (federal eligibility automation)
- DocuSign (sales research automation)
- NVIDIA, Capgemini
- Claims 60% of Fortune 500

**Influencers**
- Andrew Ng (investor, DeepLearning.AI courses)
- Dharmesh Shah (HubSpot CTO, investor)
- Amjad Masad (Replit CEO, investor, Signal speaker)

**Podcasts**
- Software Engineering Daily (June 2025)
- The Data Exchange (May 2024)
- Scrum Master Toolbox (March 2024)
- AI Frontiers (Valory)

**Conferences**
- CrewAI Signal 2024/2025 (own conference, 500+ attendees)
- The AI Conference 2024
- Miami AI Agent Summit (April 2025)
- AI User Conference

**Investor Promotion**
- Insight Partners (blog features, Behind the Investment, ScaleUp story)
- Boldstart Ventures (announcement, Medium article)

**Media Coverage**
- TechCrunch, VentureBeat, SiliconANGLE, GlobeNewswire
- IBM Think, DigitalOcean educational content

**Community**
- 40K GitHub stars
- 100K certified developers via learn.crewai.com
- 1.4 billion agentic automations processed

---

## 9. Agent Lightning

### Repository
- **GitHub:** https://github.com/microsoft/agent-lightning
- **Stars:** 14,100
- **Contributors:** 29
- **License:** MIT

### Documentation
- **Site:** https://microsoft.github.io/agent-lightning/
- **MS Research:** https://www.microsoft.com/en-us/research/project/agent-lightning/

### Community
- **Discord:** https://discord.gg/RYk7CdvDR7
- **Twitter:** Community mentions only
- **Reddit:** https://www.reddit.com/r/LocalLLaMA/comments/1m9m670/

### Content
- **Blog:** https://agent-lightning.github.io/
- **MS Research Blog:** https://www.microsoft.com/en-us/research/blog/agent-lightning-adding-reinforcement-learning-to-ai-agents-without-code-rewrites/
- **vLLM Blog:** https://blog.vllm.ai/2025/10/22/agent-lightning.html
- **Medium:** https://medium.com/@yugez/tuning-any-ai-agent-with-tinker-agent-lightning-part-1-1d8c9a397f0e

### Distribution
- **PyPI:** https://pypi.org/project/agentlightning/
- **Install:** `pip install agentlightning`

### Launch/Press
- **Hacker News:** https://news.ycombinator.com/item?id=45706729
- **Product Hunt:** Not listed

### Assets
- **Examples:** https://github.com/microsoft/agent-lightning/tree/main/examples
- **Changelog:** https://microsoft.github.io/agent-lightning/stable/changelog/
- **Contributing:** https://github.com/microsoft/agent-lightning/blob/main/docs/community/contributing.md
- **Releases:** https://github.com/microsoft/agent-lightning/releases (7 releases)

### Research
- **ArXiv:** https://arxiv.org/abs/2508.03680

### Funding
- Microsoft Research Asia - Shanghai

### Partnerships & Integrations

**Microsoft Ecosystem**
- Microsoft Agent Framework compatibility (Semantic Kernel + AutoGen)
- Multi-framework support: LangChain, OpenAI Agent SDK, AutoGen, CrewAI

**vLLM Partnership**
- Official vLLM blog post (Oct 2025)
- `return_token_ids: true` feature designed for Agent Lightning
- vLLM maintainers collaboration

**Community Projects**
- DeepWerewolf (Chinese Werewolf game with AgentScope)
- AgentFlow (modular multi-agent framework)
- Youtu-Agent (verified 128 GPU RL training)

**Media Coverage**
- Microsoft Research Blog
- MarkTechPost, Analytics Vidhya, AI Base News

---

## 10. ADAS

### Repository
- **GitHub:** https://github.com/ShengranHu/ADAS
- **Stars:** 1,500
- **Contributors:** 3
- **License:** Apache-2.0

### Documentation
- **Project Page:** https://www.shengranhu.com/ADAS/

### Community
- **Discord/Slack:** None
- **Twitter:** https://x.com/shengranhu (author)

### Content
- **Podcast:** https://twimlai.com/podcast/twimlai/automated-design-of-agentic-systems/ (TWIML #700)
- **Blog:** None (Medium articles by others)

### Distribution
- Not published as a package (research code only)

### Launch/Press
- **Hacker News:** https://news.ycombinator.com/item?id=42264007
- **Product Hunt:** Not listed

### Assets
- **ICLR 2025 Slides:** https://iclr.cc/media/iclr-2025/Slides/28073.pdf
- No tagged releases (17 commits)

### Research
- **ICLR 2025:** Main venue
- **NeurIPS 2024 Workshop:** Outstanding Paper Award
- **ArXiv:** https://arxiv.org/abs/2408.08435
- **OpenReview:** https://openreview.net/forum?id=t9U3LW7JVX
- **Hugging Face:** https://huggingface.co/papers/2408.08435

### Funding
- Academic (University of British Columbia, Vector Institute)
- Canada CIFAR AI Chair

### Partnerships & Integrations

**Academic Collaborations**
- University of British Columbia (Shengran Hu)
- Vector Institute (Jeff Clune, Canada CIFAR AI Chair)
- DeepMind (Jeff Clune is Senior Research Advisor)
- Sakana AI (Shengran Hu was research scientist intern)

**Framework Compatibility**
- LangChain (can search within and build upon)
- AutoGen (can use existing tools)
- Code-based search space leveraging FM coding proficiency

**Podcasts**
- TWIML AI Podcast #700 (Shengran Hu, Sep 2024)

**Academic Talks (Jeff Clune)**
- Stanford CS "Self-Improving AI Agents" guest lecture
- University of Illinois AI Disruption Speaker Series
- Schwartz Reisman Institute (U Toronto)

**Conferences**
- ICLR 2025 (main venue publication)
- NeurIPS 2024 Open-World Agents Workshop (Outstanding Paper Award, 3% acceptance)
- Vector Institute ICLR 2025 coverage

**Media Coverage**
- TechTalks, MarkTechPost
- Multiple Medium articles

**Related Research (Same Team)**
- Darwin Godel Machine (open-ended evolution)
- AI Scientist-v2 (automated scientific discovery)

---

## General OSS Launch Checklist

Based on community best practices research.

### GitHub Repo Essentials
- [ ] LICENSE (MIT or Apache 2.0)
- [ ] README with logo, badges, demo GIF, one-liner, quickstart, install command
- [ ] CONTRIBUTING.md
- [ ] CODE_OF_CONDUCT.md (Contributor Covenant)
- [ ] SECURITY.md
- [ ] CHANGELOG.md (Keep a Changelog format)
- [ ] Issue templates (bug report, feature request)
- [ ] PR template
- [ ] Topic tags for discoverability
- [ ] Social preview image (og:image)
- [ ] Branch protection on main
- [ ] GitHub Discussions enabled
- [ ] "good first issue" labels (aim for 25% of issues)

### CI/CD
- [ ] Tests on every PR
- [ ] Test coverage badge
- [ ] Linting/formatting checks
- [ ] Automated releases to npm/PyPI on tags
- [ ] Dependabot/security scanning

### Documentation
- [ ] Docs site (Docusaurus or MkDocs Material)
- [ ] Getting started / Quickstart (< 5 minutes)
- [ ] Installation guide
- [ ] API reference (auto-generated)
- [ ] Tutorials for common use cases
- [ ] Concepts / Architecture
- [ ] Examples directory with READMEs
- [ ] FAQ
- [ ] Changelog

### Community
- [ ] Discord server (or GitHub Discussions minimum)
- [ ] Twitter/X account
- [ ] LinkedIn page
- [ ] Contributor recognition (All Contributors)

### Launch Channels (priority order)
1. **Hacker News "Show HN"** - highest value for dev tools
2. **Reddit** - r/MachineLearning, r/LocalLLaMA, r/programming
3. **Twitter/X** - threads with demo GIFs
4. **Product Hunt** - link to docs/landing page, not raw GitHub
5. **Dev.to / Hashnode / Medium** - launch article
6. **Newsletters** - JavaScript Weekly, TLDR, Console.dev
7. **Awesome Lists** - submit to relevant awesome-* repos

### Content
- [ ] Launch blog post explaining "why"
- [ ] Demo GIF or video
- [ ] Blog with ongoing posts
- [ ] Newsletter (optional)

### Distribution
- [ ] npm/PyPI package with clean name
- [ ] Docker image (if applicable)
- [ ] Semantic versioning
- [ ] GitHub Releases with notes

### Key Resources
- **GitHub Open Source Guides:** https://opensource.guide/
- **Make a README:** https://www.makeareadme.com/
- **Best README Template:** https://github.com/othneildrew/Best-README-Template
- **Awesome READMEs:** https://github.com/matiassingers/awesome-readme
- **shields.io:** https://shields.io/ (badges)
- **All Contributors:** https://allcontributors.org/
- **choosealicense.com:** https://choosealicense.com/
- **Contributor Covenant:** https://www.contributor-covenant.org/
- **Keep a Changelog:** https://keepachangelog.com/
- **GitHub Stars Playbook:** https://livecycle.io/blogs/opensource-github-stars/
- **HN vs Product Hunt:** https://medium.com/@baristaGeek/lessons-launching-a-developer-tool-on-hacker-news-vs-product-hunt-and-other-channels-27be8784338b
