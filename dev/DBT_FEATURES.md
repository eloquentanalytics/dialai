# dbt (data build tool) Features Reference

Competitive analysis of dbt, the leading data transformation framework. dbt pioneered "analytics engineering" as a discipline and represents a model for developer-focused data tooling that DIAL can learn from.

---

## Why dbt Matters for DIAL

dbt is relevant to DIAL's competitive positioning because:

1. **Developer Experience Pioneer** - dbt brought software engineering practices (version control, testing, documentation, modularity) to data transformation
2. **Community-Led Growth** - Built a 100K+ member community before significant commercial revenue
3. **Open Core Success** - Demonstrates how to balance open source adoption with commercial cloud offering
4. **Category Creation** - Coined "analytics engineering" and created a new job title/discipline
5. **TypeScript Parallel** - Just as dbt brought engineering practices to SQL analysts, DIAL brings trust/delegation to AI workflows

---

## Summary

| Attribute | Value |
|-----------|-------|
| **GitHub Stars** | ~10K (dbt-core) |
| **License** | Apache 2.0 |
| **Primary Language** | Python |
| **Total Funding** | $416M |
| **Valuation** | $4.2B (Series D, Feb 2022) |
| **Commercial Offering** | dbt Cloud |
| **Community Size** | 100K+ members |
| **Paying Customers** | 5,000+ |
| **Weekly Active Teams** | 50,000+ |

---

## Positioning

**One-liner:** "dbt enables data analysts and engineers to transform their data using the same practices that software engineers use to build applications."

**Category:** Analytics Engineering / Data Transformation

**Key Value Props:**
- Transform data in your warehouse using SQL
- Version control your data transformations
- Test your data quality
- Document your data models
- Modular, reusable SQL with Jinja templating

---

## 1. dbt Core (Open Source)

### Repository
- **GitHub:** https://github.com/dbt-labs/dbt-core
- **Stars:** ~10,000
- **Contributors:** 300+
- **License:** Apache 2.0
- **Language:** Python

### Documentation
- **Site:** https://docs.getdbt.com
- **Developer Hub:** https://docs.getdbt.com/docs/introduction
- **API Reference:** https://docs.getdbt.com/reference/references-overview
- **Tutorials:** https://docs.getdbt.com/guides
- **Best Practices:** https://docs.getdbt.com/best-practices

### Distribution
- **PyPI:** https://pypi.org/project/dbt-core/
- **Install:** `pip install dbt-core`
- **Current Version:** 1.11.x
- **Adapters:** Separate packages for each data platform (dbt-snowflake, dbt-bigquery, dbt-databricks, etc.)

### Assets
- **Examples:** https://github.com/dbt-labs/jaffle_shop (canonical example project)
- **Packages Hub:** https://hub.getdbt.com (community packages)
- **Changelog:** https://github.com/dbt-labs/dbt-core/blob/main/CHANGELOG.md
- **Releases:** https://github.com/dbt-labs/dbt-core/releases
- **Contributing:** https://github.com/dbt-labs/dbt-core/blob/main/CONTRIBUTING.md

---

## 2. dbt Cloud (Commercial)

### Platform
- **URL:** https://cloud.getdbt.com
- **Pricing:** https://www.getdbt.com/pricing

### Features
- **IDE:** Browser-based development environment
- **Orchestration:** Job scheduling and execution
- **CI/CD:** Pull request integration and testing
- **Semantic Layer:** Metrics definitions and governance
- **Discovery:** Data catalog and lineage
- **Observability:** Monitoring and alerting

### Enterprise Features
- SSO / SAML
- Audit logging
- Role-based access control
- Private link / VPC connectivity
- SLA guarantees

---

## Community

### Platforms
- **Slack:** Primary community hub (100K+ members)
- **Forum:** https://discourse.getdbt.com
- **Website:** https://www.getdbt.com/community

### Social
- **Twitter:** https://twitter.com/getdbt
- **LinkedIn:** https://www.linkedin.com/company/dbt-labs
- **YouTube:** https://www.youtube.com/c/daboratory

### Meetups
- **Local Meetups:** dbt meetups in major cities worldwide
- **Virtual Events:** Regular online community events

---

## Content

### Newsletter
- **The Analytics Engineering Roundup:** https://roundup.getdbt.com
- **Curated by:** Tristan Handy (since 2015)
- **Frequency:** Weekly
- **Focus:** Data science, analytics, and analytics engineering articles

### Podcast
- **The Analytics Engineering Podcast**
- **Hosts:** Tristan Handy, Julia Schottenstein
- **Frequency:** Biweekly
- **Platforms:** Apple Podcasts, Spotify, all major platforms
- **URL:** https://roundup.getdbt.com/s/the-analytics-engineering-podcast

### Blog
- **URL:** https://www.getdbt.com/blog
- **Focus:** Product updates, best practices, community stories

### Learning
- **dbt Learn:** https://learn.getdbt.com (free courses)
- **Certifications:** dbt Analytics Engineering Certification

---

## Conference: Coalesce

### Overview
- **Name:** Coalesce
- **Tagline:** "The analytics engineering conference"
- **Frequency:** Annual
- **2025 Location:** Las Vegas, Oct 13-16

### History
- **Coalesce 2020:** First virtual event
- **Coalesce 2021:** Virtual, 5,000+ attendees
- **Coalesce 2022:** Hybrid (New Orleans + virtual)
- **Coalesce 2023:** San Diego
- **Coalesce 2024:** Las Vegas
- **Coalesce 2025:** Las Vegas (upcoming)

### Content
- Keynotes from Tristan Handy
- Customer case studies
- Technical deep dives
- Community sessions
- Partner ecosystem

---

## Launch/Press

### Hacker News
- **"What Is Dbt and Why Are Companies Using It?"** https://news.ycombinator.com/item?id=29424445
- Multiple Show HN posts for dbt ecosystem tools
- Recognized as "main game changers in modernizing the data engineering stack"

### Press Coverage
- First Round Review: "How dbt Labs Built a $4.2B Software Business out of a Two-Person Consultancy"
- TechCrunch, BigDataWire, Silicon Republic coverage
- Regular data industry press

---

## Funding

### Rounds
| Round | Date | Amount | Valuation | Lead |
|-------|------|--------|-----------|------|
| Seed | 2019 | $5M | - | Andreessen Horowitz |
| Series A | 2020 | $29M | - | Andreessen Horowitz |
| Series B | 2021 | $150M | $1.5B | Sequoia |
| Series C | 2021 | $150M | - | Altimeter |
| Series D | Feb 2022 | $222M | $4.2B | Altimeter |

### Total
- **Funding:** $416M
- **Valuation:** $4.2B (as of Series D)

### Investors
- **Lead:** Altimeter, Sequoia, Andreessen Horowitz
- **Strategic:** Databricks, Snowflake, Salesforce Ventures
- **Others:** Amplify Partners, Coatue, Tiger Global, ICONIQ Growth, GV, GIC

### Crunchbase
- https://www.crunchbase.com/organization/dbt-labs

---

## Team

### Founders
- **Tristan Handy** - CEO & Co-founder
  - Previously: VP Marketing at RJMetrics, COO at Argyle Social
  - 20+ years data experience
  - Creator of Analytics Engineering Roundup newsletter
  - Twitter: @jthandy

- **Drew Banin** - Co-founder
  - Previously: Data Engineer
  - Core dbt architecture

- **Connor McArthur** - Co-founder

### Company
- **Name:** dbt Labs (formerly Fishtown Analytics)
- **Founded:** 2016
- **Rebranded:** 2021
- **Headquarters:** Philadelphia, PA
- **Employees:** 400+ (as of 2023)

---

## Partnerships & Integrations

### Data Warehouse Partners
| Platform | Adapter | Status |
|----------|---------|--------|
| Snowflake | dbt-snowflake | Strategic investor |
| Databricks | dbt-databricks | Strategic investor, deep partnership |
| BigQuery | dbt-bigquery | Supported |
| Redshift | dbt-redshift | Supported |
| PostgreSQL | dbt-postgres | Supported |
| Spark | dbt-spark | Supported |
| Trino | dbt-trino | Community |
| DuckDB | dbt-duckdb | Community |

### Ecosystem Tools
- **Fivetran:** Data ingestion → dbt transformation
- **Airbyte:** Open source ingestion
- **Hightouch:** Reverse ETL from dbt models
- **Census:** Operational analytics
- **Looker:** BI integration
- **Tableau:** BI integration
- **Metabase:** BI integration

### Enterprise Customers
- JetBlue, Spotify, GitLab, Canva
- 5,000+ paying customers
- 50,000+ teams using dbt weekly

---

## Key Concepts

### Analytics Engineering
dbt pioneered the "analytics engineering" discipline:
- Bridge between data engineering and data analysis
- Apply software engineering practices to analytics
- Own the transformation layer in the data stack

### The dbt Workflow
```
Sources → Staging → Intermediate → Marts → BI/Analytics
```

### Core Features
- **Models:** SQL SELECT statements that define transformations
- **Tests:** Data quality assertions (unique, not_null, accepted_values, relationships)
- **Documentation:** Inline descriptions and auto-generated docs site
- **Sources:** Declare and test raw data tables
- **Seeds:** CSV files loaded into warehouse
- **Snapshots:** Slowly changing dimension tracking
- **Macros:** Reusable Jinja functions

### The Semantic Layer
- Centralized metric definitions
- Consistent business logic
- API for downstream tools

---

## Growth Trajectory

| Year | Milestone |
|------|-----------|
| 2016 | Founded as Fishtown Analytics |
| 2016 | dbt open sourced |
| 2019 | 1,000+ users, Seed funding |
| 2020 | dbt Cloud launches, Series A |
| 2021 | Rebrand to dbt Labs, Series B/C |
| 2021 | First Coalesce conference |
| 2022 | Series D at $4.2B valuation |
| 2023 | 50K+ weekly active teams |
| 2024 | Semantic Layer GA, 5K+ customers |

---

## Lessons for DIAL

### What dbt Did Right
1. **Community First:** Built 100K+ community before heavy monetization
2. **Category Creation:** Invented "analytics engineering" terminology
3. **Developer Experience:** Made SQL feel like software engineering
4. **Open Core Balance:** Core functionality free, enterprise features paid
5. **Content Marketing:** Newsletter since 2015, podcast, annual conference
6. **Ecosystem Enablement:** Package hub, adapters, integrations

### Applicable to DIAL
1. **Create a category:** "Delegation engineering" or "Trust-calibrated AI"
2. **Community investment:** Discord, content, meetups before revenue
3. **Developer-first:** TypeScript-first, great DX, composable primitives
4. **Open core model:** Free core, paid enterprise/cloud features
5. **Thought leadership:** Newsletter, blog, conference presence

---

## Resources

### Official
- **Website:** https://www.getdbt.com
- **Documentation:** https://docs.getdbt.com
- **GitHub:** https://github.com/dbt-labs
- **Community:** https://www.getdbt.com/community
- **Blog:** https://www.getdbt.com/blog

### Learning
- **dbt Learn:** https://learn.getdbt.com
- **Tutorials:** https://docs.getdbt.com/guides
- **Package Hub:** https://hub.getdbt.com

### Content
- **Newsletter:** https://roundup.getdbt.com
- **Podcast:** https://roundup.getdbt.com/s/the-analytics-engineering-podcast
- **YouTube:** https://www.youtube.com/c/daboratory
