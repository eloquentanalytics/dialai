# Agent-First Tools & Platforms Reference

Analysis of tools and platforms specifically designed for AI agents to use—not just MCP, but the broader ecosystem of "agent-native" infrastructure.

---

## Why This Matters for DIAL

These tools represent a shift from "APIs for developers" to "APIs for agents":

1. **Self-describing endpoints** - Agents can discover what's available
2. **Managed authentication** - Credentials never reach agent context
3. **Secure execution** - Sandboxed environments for generated code
4. **Intent-driven design** - Actions over CRUD operations

DIAL's delegation model intersects with this space: agents need trusted tools to delegate to.

---

## Summary Comparison

| Tool | Category | Funding | Key Innovation |
|------|----------|---------|----------------|
| Composio | Integration Platform | $29M | 10K+ tools, managed OAuth |
| Arcade | Secure Actions | $12M | SSO for AI agents |
| Toolhouse | Agent BaaS | $8.5M | One-click agent deployment |
| E2B | Code Sandboxes | $35M | 150ms sandbox startup |
| Computer Use | GUI Automation | Anthropic | Visual screen control |
| Arazzo | Workflow Spec | OpenAPI Initiative | Deterministic API workflows |
| AgenticAPI | API Design | Open Source | Intent-driven endpoints |

---

## 1. Composio

### Overview
Composio is an agent-native integration platform providing 10,000+ tools for AI agents to interact with real-world applications. The platform handles the "plumbing" of agent integrations—authentication, permissions, and LLM-optimized tool descriptions.

### Repository
- **GitHub:** https://github.com/ComposioHQ/composio
- **Stars:** ~15,000
- **License:** Apache 2.0
- **Language:** Python, TypeScript

### Documentation
- **Site:** https://docs.composio.dev
- **Blog:** https://composio.dev/blog

### Positioning
**"Skills that evolve with your Agents"**

### Key Features
- **10,000+ Tools:** Pre-built integrations for Gmail, Slack, GitHub, Notion, HubSpot, Salesforce, etc.
- **Managed OAuth:** Credentials never reach agent context
- **SOC 2 Compliant:** Enterprise-grade security
- **Framework Agnostic:** Works with LangChain, CrewAI, AutoGen, OpenAI Agents SDK
- **MCP Support:** Also provides MCP servers for tools

### Funding
| Round | Date | Amount | Lead |
|-------|------|--------|------|
| Seed | 2024 | $4M | Elevation Capital |
| Series A | July 2025 | $25M | Lightspeed Venture Partners |
| **Total** | | **$29M** | |

### Investors
- **Lead:** Lightspeed Venture Partners, Elevation Capital
- **Notable Angels:** Guillermo Rauch (Vercel CEO), Dharmesh Shah (HubSpot CTO), Gokul Rajaram, Soham Mazumdar (Rubrik)
- **Others:** SV Angel, Blitzscaling Ventures, Operator Partners, Agent Fund (Yohei Nakajima)

### Founders
- **Soham Ganatra** - Co-founder
- **Karan Vaidya** - Co-founder

### Adoption
- 100,000+ developers
- Used by top YC companies (April, OpenNote, Airweave, Den, Dash)

### Distribution
- **PyPI:** https://pypi.org/project/composio-core/
- **npm:** https://www.npmjs.com/package/composio-core
- **Install:** `pip install composio-core` / `npm install composio-core`

### Why It Matters
Composio solves the "last mile" problem for AI agents—agents can reason, but they need authenticated access to tools. By handling OAuth server-side, agents never see credentials, solving a critical security problem.

---

## 2. Arcade

### Overview
Arcade provides secure, authenticated actions for AI agents. Founded by the team that built Okta's authentication API, Arcade is essentially "SSO for AI agents"—giving agents the same permissions as the humans they assist.

### Repository
- **GitHub:** https://github.com/ArcadeAI/arcade-ai
- **License:** Open source components
- **Language:** Python

### Documentation
- **Site:** https://docs.arcade.dev
- **Blog:** https://blog.arcade.dev

### Positioning
**"Go Beyond Chat: Make AI actually do things."**

### Key Features
- **100+ Pre-built Tools:** Gmail, Slack, GitHub, Salesforce, etc.
- **Server-side OAuth:** Tokens never reach the LLM
- **User-specific Permissions:** Agents inherit human permissions
- **MCP Support:** Arcade MCP servers available
- **Framework Integration:** Works with OpenAI Agents SDK, LangGraph

### Funding
| Round | Date | Amount | Lead |
|-------|------|--------|------|
| Seed | March 2025 | $12M | Laude Ventures |

### Investors
- **Lead:** Laude Ventures (Andy Konwinski, Perplexity co-founder)
- **Others:** Neotribe, Flybridge Capital Partners, Hanabi Capital
- **Notable:** Pete Sonsini (early Databricks, Perplexity investor)

### Founders
- **Alex Salazar** - CEO
  - Previously: VP at Okta (built auth products)
  - Founded Stormpath (acquired by Okta in 2017)

- **Sam Partee** - CTO
  - Previously: Engineer at Redis
  - Contributor to LangChain, LlamaIndex

### Key Innovation
The founders realized that the authentication problem they solved for human developers at Okta/Stormpath is even more critical for AI agents. Agents need delegated access without ever seeing credentials.

### Distribution
- **PyPI:** `pip install arcade-ai`
- **MCP Servers:** Pre-built for common services

### Why It Matters
Arcade's thesis: agents will replace workers, so they need the same access controls. "SSO for AI agents" is a powerful framing that enterprises understand.

---

## 3. Toolhouse

### Overview
Toolhouse is a Backend-as-a-Service (BaaS) for AI agents. The pitch: "Build AI agents from a simple prompt, ship to production in one click." Pre-loaded with RAG, evals, memory, and edge functions.

### Repository
- **GitHub:** https://github.com/toolhouseai
- **Examples:** https://github.com/toolhouseai/toolhouse-examples

### Documentation
- **Site:** https://docs.toolhouse.ai
- **Main:** https://toolhouse.ai

### Positioning
**"Deploy smarter AI in one click."**

### Key Features
- **One-Click Deployment:** Prompt → production agent
- **Pre-loaded Capabilities:** RAG, evals, memory, edge functions, storage
- **Low-Latency Infrastructure:** Optimized cloud deployment
- **Built-in Security:** Auth, monitoring, observability included
- **Token Optimization:** Reduces token usage

### Funding
| Round | Date | Amount | Lead |
|-------|------|--------|------|
| Seed | 2024 | $8.5M | M13 |

### Investors
- **Lead:** M13
- **Others:** Neo, Flybridge, K5 Global, Irregular, 500 Global, Ganas Ventures, Vento

### Founders
- **Daniele Bernardi** - Co-founder
  - Previously: Developer ecosystems at Twitter and Meta

- **Orlando Kalossakas** - Co-founder
  - Previously: Co-founded Dashcam (AI QA agent)
  - Experience growing developer marketplaces

### Enterprise Users
- Cloudflare
- NVIDIA
- Groq
- Snowflake

### Distribution
- **PyPI:** `pip install toolhouse`
- **npm:** `npm install @toolhouseai/sdk`

### Why It Matters
Toolhouse is betting that most teams don't want to build agent infrastructure—they want to build agents. Abstracting away RAG, memory, and deployment is valuable for rapid prototyping.

---

## 4. E2B (Code Interpreter Sandboxes)

### Overview
E2B provides secure, isolated sandboxes for running AI-generated code. Built on Firecracker (same tech as AWS Lambda), sandboxes start in ~150ms and provide full VM isolation.

### Repository
- **GitHub:** https://github.com/e2b-dev/E2B
- **Code Interpreter:** https://github.com/e2b-dev/code-interpreter
- **Stars:** ~10,000+
- **License:** Apache 2.0
- **Language:** Python, TypeScript

### Documentation
- **Site:** https://e2b.dev/docs
- **Blog:** https://e2b.dev/blog

### Positioning
**"The Enterprise AI Agent Cloud"**

### Key Features
- **Fast Startup:** ~150ms sandbox initialization
- **Full Isolation:** Firecracker-based VMs
- **Code Interpreter SDK:** Python & JS for AI-generated code
- **Jupyter Integration:** Built-in Jupyter server
- **Filesystem Access:** Persistent storage options
- **Internet Access:** Sandboxes can make network calls

### Use Cases
- AI data analysis
- Running AI-generated code
- Coding agent playgrounds
- Codegen evaluation
- Full AI-generated app execution

### Funding
| Round | Date | Amount | Lead |
|-------|------|--------|------|
| Seed | Oct 2024 | $11.5M | Decibel Partners |
| Series A | July 2025 | $21M | Insight Partners |
| **Total** | | **$35M** | |

### Investors
- **Lead:** Insight Partners, Decibel Partners (Alessio Fanelli)
- **Others:** Sunflower Capital, Kaya
- **Angels:** Scott Johnston (former Docker CEO)

### Founders
- **Vasek Mlejnsky** - Co-founder & CEO
  - Czech founder
  - Childhood friends with co-founder

- **Tomas Valenta** - Co-founder

### Adoption
- **88% of Fortune 100** use E2B for frontier agentic workflows
- Hundreds of millions of sandboxes initiated
- More than half of Fortune 500

### Distribution
- **PyPI:** https://pypi.org/project/e2b/
- **npm:** https://www.npmjs.com/package/e2b
- **Install:** `pip install e2b` / `npm install e2b`

### Why It Matters
Code execution is dangerous—AI-generated code could do anything. E2B makes it safe by providing ephemeral, isolated environments. Essential infrastructure for coding agents.

---

## 5. Anthropic Computer Use (Agent Computer Interface)

### Overview
Anthropic's Computer Use is a capability that allows Claude to interact with computers like humans do—seeing screens, moving cursors, clicking buttons, and typing text. Launched in public beta October 2024.

### Documentation
- **API Docs:** https://docs.anthropic.com/en/docs/build-with-claude/computer-use
- **Announcement:** https://www.anthropic.com/news/3-5-models-and-computer-use

### Positioning
**"Teaching Claude general computer skills"**

### Key Capabilities
- **Screen Vision:** Claude "sees" screenshots
- **Cursor Control:** Move mouse, click buttons
- **Keyboard Input:** Type text into applications
- **Application Agnostic:** Works with any GUI software

### How It Works
1. Developer sends text + screenshot of computer state
2. Claude analyzes and decides on action
3. Claude returns command (click, type, scroll)
4. Developer executes command, captures new screenshot
5. Loop continues until task complete

### The "Agent Loop"
```
User Request → Claude → Tool Request → Execute → Screenshot → Claude → ...
```

### Technical Requirements
- **API Header:** `anthropic-beta: computer-use-2025-01-24`
- **Model:** `claude-sonnet-4-5` (or compatible)
- **Availability:** Anthropic API, Amazon Bedrock, Google Cloud Vertex AI

### Early Adopters
- Asana
- Canva
- Cognition
- DoorDash
- Replit
- The Browser Company

### Key Innovation
Instead of building custom API integrations for every application, Computer Use bypasses the need by teaching Claude general computer skills. This is the "Agent Computer Interface" (ACI) concept.

### Why It Matters
Computer Use represents a different approach than tool-calling: instead of discrete APIs, the agent interacts with the same GUI humans use. This works for legacy software without APIs.

---

## 6. Arazzo Specification

### Overview
Arazzo is an open specification from the OpenAPI Initiative that defines deterministic API workflows. While OpenAPI describes individual endpoints, Arazzo describes how to sequence calls to achieve outcomes.

### Repository
- **GitHub:** https://github.com/OAI/Arazzo-Specification
- **Spec Version:** 1.0.1 (current), 1.1.0 (in development)

### Documentation
- **Official:** https://www.openapis.org/arazzo-specification
- **Spec:** https://spec.openapis.org/arazzo/latest.html

### Positioning
**"A Tapestry for Deterministic API Workflows"**

### What Problem It Solves
- **OpenAPI:** Describes what an API can do (endpoints, parameters)
- **Arazzo:** Describes how to use APIs to complete tasks (workflows, sequences)

### Key Concepts
- **Workflows:** Sequences of API calls to achieve outcomes
- **Steps:** Individual API operations within a workflow
- **Dependencies:** How outputs of one step feed into another
- **Conditions:** When to branch or skip steps

### Example Use Case
```yaml
# Arazzo workflow: "Create a customer and subscribe them"
workflows:
  - workflowId: create-subscription
    steps:
      - stepId: create-customer
        operationId: createCustomer
        outputs:
          customerId: $response.body.id
      - stepId: create-subscription
        operationId: createSubscription
        parameters:
          customerId: $steps.create-customer.outputs.customerId
```

### 2025 Updates
- **v1.0.1:** Clarifications, improved examples, JSON Schema validation
- **v1.1.0 (upcoming):** AsyncAPI support for event-driven workflows

### Why It Matters for Agents
Arazzo adds an "agent experience" (AX) layer to API documentation. Agents can read Arazzo specs to understand not just what's possible, but how to accomplish goals.

### Governance
- **Organization:** OpenAPI Initiative (Linux Foundation)
- **Contributors:** SmartBear, Postman, and community

---

## 7. AgenticAPI

### Overview
AgenticAPI is an open-source framework for designing APIs specifically for AI agent consumption. It shifts from CRUD operations to intent-driven actions.

### Repository
- **Site:** https://agenticapi.com
- **Docs:** https://agenticapi.com/docs/what-is-agentic-api/

### Positioning
**"The new way to API."**

### The ACTION Framework
AgenticAPI introduces custom HTTP verbs aligned with agent tasks:

| Verb | Purpose | Example |
|------|---------|---------|
| **A**cquire | Retrieve data | Fetch user profile |
| **C**ompute | Process/analyze | Summarize a report |
| **T**ransact | State changes | Book a meeting |
| **I**nform/Communicate | Send notifications | Alert a team |
| **O**rchestrate | Coordinate workflows | Chain tasks |
| **N**avigate | Guide through flows | Multi-step wizards |

### Technical Implementation
- **Built on:** FastAPI + Pydantic
- **OpenAPI Extensions:** `x-action`, `x-category` for semantic discovery
- **Custom HTTP Methods:** `SUMMARIZE`, `FETCH`, `NOTIFY` instead of just GET/POST
- **Self-Describing:** Agents can query available actions dynamically

### Key Principles
1. **Intent over CRUD:** APIs express business goals, not data operations
2. **Self-describing:** Endpoints explain their purpose semantically
3. **Agent-discoverable:** Agents can enumerate available actions
4. **Type-safe:** Pydantic models for structured I/O

### Example
```python
# Traditional REST
POST /documents/{id}/summary

# AgenticAPI
SUMMARIZE /documents/{id}
```

### Why It Matters
AgenticAPI represents a philosophical shift: instead of making agents understand human APIs, design APIs that agents naturally understand. The ACTION verbs map to how agents think about tasks.

---

## Patterns & Lessons for DIAL

### Common Themes

1. **Credentials Never in Context**
   - Composio, Arcade: Server-side OAuth
   - E2B: Isolated execution environments
   - Lesson: Trust boundaries matter for agent security

2. **Self-Describing Tools**
   - Arazzo: Workflow semantics
   - AgenticAPI: Intent-driven verbs
   - Lesson: Agents need to discover and understand capabilities

3. **Sandboxed Execution**
   - E2B: Firecracker VMs
   - Lesson: Agent-generated code is untrusted code

4. **Framework Agnostic**
   - All tools work with LangChain, CrewAI, OpenAI SDK, etc.
   - Lesson: Don't lock into one framework

### What's Missing (DIAL's Opportunity)

1. **Trust Calibration:** None of these tools help agents understand *how much* to trust their own outputs
2. **Progressive Delegation:** No framework for escalating from full-auto to human-in-loop based on confidence
3. **State Machine Semantics:** Tools focus on actions, not structured decision workflows

---

## Resources

### Official Sites
- **Composio:** https://composio.dev
- **Arcade:** https://arcade.dev
- **Toolhouse:** https://toolhouse.ai
- **E2B:** https://e2b.dev
- **Anthropic Computer Use:** https://docs.anthropic.com/en/docs/build-with-claude/computer-use
- **Arazzo:** https://www.openapis.org/arazzo-specification
- **AgenticAPI:** https://agenticapi.com

### GitHub Repositories
- **Composio:** https://github.com/ComposioHQ/composio
- **Arcade:** https://github.com/ArcadeAI/arcade-ai
- **Toolhouse:** https://github.com/toolhouseai
- **E2B:** https://github.com/e2b-dev/E2B
- **Arazzo:** https://github.com/OAI/Arazzo-Specification
