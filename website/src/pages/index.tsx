import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import styles from "./index.module.css";

function HomepageHeader() {
  const { siteConfig } = useDocusaurusContext();
  return (
    <header className={clsx("hero hero--primary", styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/intro"
          >
            Get Started
          </Link>
          <Link
            className="button button--outline button--secondary button--lg"
            to="https://github.com/eloquentanalytics/dialai"
            style={{ marginLeft: "1rem" }}
          >
            GitHub
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title}`}
      description="Dynamic Integration between AI and Labor - A coordination framework for AI and human specialists making decisions together within state machines."
    >
      <HomepageHeader />
      <main>
        <div className="container margin-vert--lg">
          <div className="row">
            <div className="col col--4">
              <div className="card">
                <div className="card__header">
                  <Heading as="h3">Human Primacy</Heading>
                </div>
                <div className="card__body">
                  <p>
                    The human is always right — not because humans are infallible,
                    but because humans have context that AI cannot access. AI
                    specialists learn to predict human choices, not to replace
                    human judgment.
                  </p>
                </div>
              </div>
            </div>
            <div className="col col--4">
              <div className="card">
                <div className="card__header">
                  <Heading as="h3">Progressive Collapse</Heading>
                </div>
                <div className="card__body">
                  <p>
                    Over repeated decision cycles, measuring how well AI predicts
                    human choices causes the multi-agent deliberation structure
                    to progressively collapse into deterministic execution.
                  </p>
                </div>
              </div>
            </div>
            <div className="col col--4">
              <div className="card">
                <div className="card__header">
                  <Heading as="h3">Empirical Trust</Heading>
                </div>
                <div className="card__body">
                  <p>
                    Trust is earned through demonstrated alignment with human
                    decisions, not assumed. LLM specialists start with weight
                    0.0 and must prove their value.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </Layout>
  );
}
