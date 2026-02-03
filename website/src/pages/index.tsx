import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import styles from "./index.module.css";

// Import images directly for better bundling
import HeroIllustrationSvg from "@site/static/img/hero-illustration.svg";
import DiagramDecisionFlow from "@site/static/img/diagram-decision-flow.svg";

// Feature data for the main principles section
const principles = [
  {
    title: "Human Primacy",
    icon: "img/icon-human-primacy.svg",
    description:
      "The human is always right — not because humans are infallible, but because humans have context that AI cannot access. AI specialists learn to predict human choices, not to replace human judgment.",
    accent: "human",
  },
  {
    title: "Progressive Collapse",
    icon: "img/icon-progressive-collapse.svg",
    description:
      "Over repeated decision cycles, measuring how well AI predicts human choices causes the multi-agent deliberation structure to progressively collapse into deterministic execution.",
    accent: "ai",
  },
  {
    title: "Empirical Trust",
    icon: "img/icon-empirical-trust.svg",
    description:
      "Trust is earned through demonstrated alignment with human decisions, not assumed. LLM specialists start with weight 0.0 and must prove their value through accurate predictions.",
    accent: "trust",
  },
];

// Concepts for the "How It Works" section
const concepts = [
  {
    title: "State Machines",
    icon: "img/icon-state-machine.svg",
    description:
      "Model any task as a state machine. Define states, transitions, and decision prompts. DIAL coordinates specialists to navigate from any state back to the default.",
    link: "/docs/guides/state-machines",
  },
  {
    title: "Specialists",
    icon: "img/icon-specialists.svg",
    description:
      "Pluggable actors — both AI models and humans — that propose transitions and vote on alternatives. Each specialist has a weight that evolves based on performance.",
    link: "/docs/concepts/specialists",
  },
  {
    title: "Decision Cycle",
    icon: "img/icon-decision-cycle.svg",
    description:
      "A five-phase cycle: Solicit → Propose → Vote → Arbitrate → Execute. The cycle repeats until the session returns to its default state.",
    link: "/docs/concepts/decision-cycle",
  },
];

function HeroSection() {
  const { siteConfig } = useDocusaurusContext();
  const patternGrid = useBaseUrl("img/pattern-grid.svg");
  
  return (
    <header className={styles.hero}>
      <div 
        className={styles.heroBackground} 
        style={{ backgroundImage: `radial-gradient(ellipse 80% 50% at 20% 40%, rgba(26, 163, 255, 0.15) 0%, transparent 50%), radial-gradient(ellipse 60% 40% at 80% 60%, rgba(255, 201, 26, 0.1) 0%, transparent 40%), url('${patternGrid}')` }}
      />
      <div className={styles.heroContent}>
        <div className={styles.heroText}>
          <Heading as="h1" className={styles.heroTitle}>
            <span className={styles.titleGradient}>DIAL</span>
          </Heading>
          <p className={styles.heroTagline}>
            Dynamic Integration between AI and Labor
          </p>
          <p className={styles.heroDescription}>
            A coordination framework for AI and human specialists making
            decisions together within state machines. Know exactly what it costs
            to delegate any task to AI — in dollars, time, and quality.
          </p>
          <div className={styles.heroButtons}>
            <Link
              className={clsx("button button--secondary button--lg", styles.heroButtonPrimary)}
              to="/docs/intro"
            >
              Get Started
            </Link>
            <Link
              className={clsx("button button--outline button--secondary button--lg", styles.heroButtonSecondary)}
              to="https://github.com/eloquentanalytics/dialai"
            >
              View on GitHub
            </Link>
          </div>
        </div>
        <div className={styles.heroVisual}>
          <HeroIllustrationSvg 
            className={styles.heroIllustration}
            role="img"
            aria-label="DIAL Framework - AI and Human Coordination"
          />
        </div>
      </div>
    </header>
  );
}

function PrincipleCard({ title, icon, description, accent }) {
  const iconUrl = useBaseUrl(icon);
  return (
    <div className={clsx(styles.principleCard, styles[`principleCard--${accent}`])}>
      <div className={styles.principleIcon}>
        <img src={iconUrl} alt={title} />
      </div>
      <Heading as="h3" className={styles.principleTitle}>
        {title}
      </Heading>
      <p className={styles.principleDescription}>{description}</p>
    </div>
  );
}

function PrinciplesSection() {
  return (
    <section className={styles.principles}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Core Principles
          </Heading>
          <p className={styles.sectionSubtitle}>
            DIAL is built on three foundational ideas that redefine how AI and
            humans collaborate.
          </p>
        </div>
        <div className={styles.principlesGrid}>
          {principles.map((principle, idx) => (
            <PrincipleCard key={idx} {...principle} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TheQuestionSection() {
  return (
    <section className={styles.questionSection}>
      <div className="container">
        <div className={styles.questionContent}>
          <div className={styles.questionText}>
            <Heading as="h2" className={styles.questionTitle}>
              The Question DIAL Answers
            </Heading>
            <blockquote className={styles.questionQuote}>
              Given any task modeled as a state machine: how do you know — in{" "}
              <span className={styles.highlight}>dollars</span>,{" "}
              <span className={styles.highlight}>time</span>, and{" "}
              <span className={styles.highlight}>quality</span> — exactly what it
              would cost to turn that task over to a minimally competent AI
              decision-maker?
            </blockquote>
            <p className={styles.questionFollow}>
              And how involved should humans remain in performing those tasks
              over the long term as a form of quality control?
            </p>
          </div>
          <div className={styles.questionVisual}>
            <div className={styles.costMetrics}>
              <div className={styles.metric}>
                <span className={styles.metricValue}>$0.003</span>
                <span className={styles.metricLabel}>per decision</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricValue}>~200ms</span>
                <span className={styles.metricLabel}>latency</span>
              </div>
              <div className={styles.metric}>
                <span className={styles.metricValue}>94.2%</span>
                <span className={styles.metricLabel}>alignment</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ConceptCard({ title, icon, description, link }) {
  const iconUrl = useBaseUrl(icon);
  return (
    <Link to={link} className={styles.conceptCard}>
      <div className={styles.conceptIcon}>
        <img src={iconUrl} alt={title} />
      </div>
      <Heading as="h3" className={styles.conceptTitle}>
        {title}
      </Heading>
      <p className={styles.conceptDescription}>{description}</p>
      <span className={styles.conceptLink}>Learn more →</span>
    </Link>
  );
}

function HowItWorksSection() {
  return (
    <section className={styles.howItWorks}>
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            How It Works
          </Heading>
          <p className={styles.sectionSubtitle}>
            DIAL provides the primitives to model, coordinate, and measure
            AI-human collaboration.
          </p>
        </div>
        <div className={styles.conceptsGrid}>
          {concepts.map((concept, idx) => (
            <ConceptCard key={idx} {...concept} />
          ))}
        </div>
        <div className={styles.flowDiagram}>
          <DiagramDecisionFlow 
            className={styles.flowImage}
            role="img"
            aria-label="Decision Cycle Flow"
          />
        </div>
      </div>
    </section>
  );
}

function StartingPessimisticSection() {
  return (
    <section className={styles.pessimisticSection}>
      <div className="container">
        <div className={styles.pessimisticContent}>
          <div className={styles.pessimisticVisual}>
            <div className={styles.weightScale}>
              <div className={styles.weightAI}>
                <span className={styles.weightLabel}>AI Specialist</span>
                <span className={styles.weightValue}>0.0</span>
                <span className={styles.weightNote}>Starts with nothing</span>
              </div>
              <div className={styles.weightDivider}>
                <span>vs</span>
              </div>
              <div className={styles.weightHuman}>
                <span className={styles.weightLabel}>Human</span>
                <span className={styles.weightValue}>1.0</span>
                <span className={styles.weightNote}>Full authority</span>
              </div>
            </div>
          </div>
          <div className={styles.pessimisticText}>
            <Heading as="h2">AI Starts with Nothing</Heading>
            <p>
              DIAL is opinionated: it assumes AI will have no role in the
              process. LLM specialists start with weight zero. The assumption is
              that the task is too difficult for AI and only humans can navigate
              it.
            </p>
            <p className={styles.emphasisText}>
              DIAL then provides the mechanism to prove otherwise, one decision
              at a time.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className={styles.cta}>
      <div className="container">
        <div className={styles.ctaContent}>
          <Heading as="h2" className={styles.ctaTitle}>
            Ready to measure AI-human collaboration?
          </Heading>
          <p className={styles.ctaDescription}>
            Start building with DIAL and discover exactly what tasks can be
            delegated to AI — with precise cost data.
          </p>
          <div className={styles.ctaButtons}>
            <Link
              className="button button--secondary button--lg"
              to="/docs/getting-started/installation"
            >
              Install DIAL
            </Link>
            <Link
              className="button button--outline button--secondary button--lg"
              to="/docs/concepts/intro"
            >
              Read the Concepts
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function Home(): JSX.Element {
  const { siteConfig } = useDocusaurusContext();
  return (
    <Layout
      title="Dynamic Integration between AI and Labor"
      description="A coordination framework for AI and human specialists making decisions together within state machines. Know exactly what it costs to delegate tasks to AI."
    >
      <HeroSection />
      <main>
        <PrinciplesSection />
        <TheQuestionSection />
        <HowItWorksSection />
        <StartingPessimisticSection />
        <CTASection />
      </main>
    </Layout>
  );
}
