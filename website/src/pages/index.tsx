import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import { useEffect, useRef, useState, type RefObject } from "react";
import styles from "./index.module.css";

// Import images directly for better bundling
import HeroIllustrationSvg from "@site/static/img/hero-illustration.svg";

// IntersectionObserver hook for entrance animations
function useInView(options?: IntersectionObserverInit): [RefObject<HTMLElement | null>, boolean] {
  const ref = useRef<HTMLElement | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.15, ...options },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, inView];
}

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
      "Trust is earned through demonstrated alignment with human decisions, not assumed. Every AI vote counts equally, and human votes always override. Specialists prove their value one decision at a time.",
    accent: "trust",
  },
];

// Concepts for the "How It Works" section
const concepts = [
  {
    title: "State Machines",
    icon: "img/icon-state-machine.svg",
    description:
      "Model any task as a state machine with defined states, transitions, and decision prompts.",
    link: "/docs/guides/state-machines",
  },
  {
    title: "Specialists",
    icon: "img/icon-specialists.svg",
    description:
      "Pluggable AI and human actors that propose transitions and vote on alternatives.",
    link: "/docs/concepts/specialists",
  },
  {
    title: "Decision Cycle",
    icon: "img/icon-decision-cycle.svg",
    description:
      "A five-phase cycle — Solicit, Propose, Vote, Arbitrate, Execute — repeated until resolution.",
    link: "/docs/concepts/decision-cycle",
  },
];

const codeExample = `import { createDialClient } from '@dialai/core';

const machine = {
  id: 'content-review',
  initial: 'draft',
  states: {
    draft:    { on: { SUBMIT: 'review' } },
    review:   { on: { APPROVE: 'published', REJECT: 'draft' } },
    published: { type: 'final' },
  },
};

const client = createDialClient({ machine });
const result = await client.run();
// result.costs → per-specialist USD, latency, alignment`;

function HeroSection() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroContent}>
        <div className={styles.heroText}>
          <Heading as="h1" className={styles.heroTitle}>
            <span className={styles.titleGradient}>DIAL</span>
          </Heading>
          <p className={styles.heroTagline}>
            Dynamic Integration between AI and Labor
          </p>
          <p className={styles.heroDescription}>
            A TypeScript framework for teams building AI-assisted workflows who
            need to know exactly what delegation costs — in dollars, time, and
            quality.
          </p>
          <div className={styles.heroButtons}>
            <Link
              className={clsx("button button--secondary button--lg", styles.heroButtonPrimary)}
              to="/docs/intro"
            >
              Read the Docs
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
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref as RefObject<HTMLElement>}
      className={clsx(styles.principles, inView && styles.animateIn)}
    >
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Core Principles
          </Heading>
          <p className={styles.sectionSubtitle}>
            Three ideas that shape how DIAL works.
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
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref as RefObject<HTMLElement>}
      className={clsx(styles.questionSection, inView && styles.animateIn)}
    >
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
            <div className={styles.metricsIntro}>
              <p className={styles.metricsLabel}>
                DIAL tracks per-specialist:
              </p>
              <div className={styles.costMetrics}>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>$0.003</span>
                  <span className={styles.metricLabel}>costUSD</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>~200ms</span>
                  <span className={styles.metricLabel}>latencyMsec</span>
                </div>
                <div className={styles.metric}>
                  <span className={styles.metricValue}>94.2%</span>
                  <span className={styles.metricLabel}>alignment</span>
                </div>
              </div>
              <p className={styles.metricsCaption}>
                Illustrative framework output per specialist per decision cycle
              </p>
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
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref as RefObject<HTMLElement>}
      className={clsx(styles.howItWorks, inView && styles.animateIn)}
    >
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
      </div>
    </section>
  );
}

function CodeExampleSection() {
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref as RefObject<HTMLElement>}
      className={clsx(styles.codeSection, inView && styles.animateIn)}
    >
      <div className="container">
        <div className={styles.codeContent}>
          <div className={styles.codeTextCol}>
            <Heading as="h2" className={styles.sectionTitle}>
              Define a machine. Get cost data.
            </Heading>
            <p className={styles.sectionSubtitle} style={{ margin: 0 }}>
              Model your workflow as a state machine, register AI and human
              specialists, and DIAL measures per-decision delegation costs
              automatically.
            </p>
          </div>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={styles.codeDot} />
              <span className={styles.codeDot} />
              <span className={styles.codeDot} />
              <span className={styles.codeFilename}>example.ts</span>
            </div>
            <pre className={styles.codePre}>
              <code>{codeExample}</code>
            </pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function StartingPessimisticSection() {
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref as RefObject<HTMLElement>}
      className={clsx(styles.pessimisticSection, inView && styles.animateIn)}
    >
      <div className="container">
        <div className={styles.pessimisticContent}>
          <div className={styles.pessimisticVisual}>
            <div className={styles.weightScale}>
              <div className={styles.weightAI}>
                <span className={styles.weightLabel}>AI Specialist</span>
                <span className={styles.weightValue}>+1</span>
                <span className={styles.weightNote}>Equal vote</span>
              </div>
              <div className={styles.weightDivider}>
                <span>vs</span>
              </div>
              <div className={styles.weightHuman}>
                <span className={styles.weightLabel}>Human</span>
                <span className={styles.weightValue}>∞</span>
                <span className={styles.weightNote}>Always overrides</span>
              </div>
            </div>
          </div>
          <div className={styles.pessimisticText}>
            <Heading as="h2">AI Starts with Nothing</Heading>
            <p>
              DIAL is opinionated: it assumes AI will have no role in the
              process. Every AI vote counts equally, but a single human vote
              overrides all of them. The assumption is that the task is too
              difficult for AI and only humans can navigate it.
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
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref as RefObject<HTMLElement>}
      className={clsx(styles.cta, inView && styles.animateIn)}
    >
      <div className="container">
        <div className={styles.ctaContent}>
          <Heading as="h2" className={styles.ctaTitle}>
            Start measuring delegation costs.
          </Heading>
          <p className={styles.ctaDescription}>
            Install DIAL and get per-decision cost data for your state machines.
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
      description="A framework for measuring exactly what it costs — in dollars, time, and quality — to delegate any decision to AI."
    >
      <HeroSection />
      <main>
        <TheQuestionSection />
        <HowItWorksSection />
        <CodeExampleSection />
        <PrinciplesSection />
        <StartingPessimisticSection />
        <CTASection />
      </main>
    </Layout>
  );
}
