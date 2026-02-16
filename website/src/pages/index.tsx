import clsx from "clsx";
import Link from "@docusaurus/Link";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import useBaseUrl from "@docusaurus/useBaseUrl";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import { useEffect, useRef, useState, type RefObject } from "react";
import styles from "./index.module.css";

// ──── Gauge constants ────
const GAUGE_CX = 200;
const GAUGE_CY = 195;
const GAUGE_R = 140;
const GAUGE_START_DEG = 225; // math degrees (lower-left)
const GAUGE_SWEEP_DEG = 270; // total sweep (lower-left → top → lower-right)

function gaugePoint(progress: number) {
  const angleDeg = GAUGE_START_DEG - progress * GAUGE_SWEEP_DEG;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: GAUGE_CX + GAUGE_R * Math.cos(angleRad),
    y: GAUGE_CY - GAUGE_R * Math.sin(angleRad),
  };
}

function gaugeArc(fromPct: number, toPct: number): string {
  if (toPct <= fromPct + 0.002) return "";
  const start = gaugePoint(fromPct);
  const end = gaugePoint(toPct);
  const sweep = (toPct - fromPct) * GAUGE_SWEEP_DEG;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${GAUGE_R} ${GAUGE_R} 0 ${largeArc} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function formatCost(cost: number): string {
  if (cost >= 0.01) return `$${cost.toFixed(2)}`;
  if (cost >= 0.001) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(4)}`;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

// Build tick marks once
const gaugeTicks = Array.from({ length: 28 }, (_, i) => {
  const p = i / 27;
  const angle = ((GAUGE_START_DEG - p * GAUGE_SWEEP_DEG) * Math.PI) / 180;
  const isMajor = i % 9 === 0;
  const innerR = isMajor ? GAUGE_R - 16 : GAUGE_R - 10;
  const outerR = GAUGE_R - 4;
  return {
    x1: GAUGE_CX + innerR * Math.cos(angle),
    y1: GAUGE_CY - innerR * Math.sin(angle),
    x2: GAUGE_CX + outerR * Math.cos(angle),
    y2: GAUGE_CY - outerR * Math.sin(angle),
    major: isMajor,
  };
});

// Label positions (just outside the arc ends)
const labelR = GAUGE_R + 24;
const leftLabelPos = {
  x: GAUGE_CX + labelR * Math.cos((GAUGE_START_DEG * Math.PI) / 180),
  y: GAUGE_CY - labelR * Math.sin((GAUGE_START_DEG * Math.PI) / 180),
};
const rightLabelPos = {
  x:
    GAUGE_CX +
    labelR *
      Math.cos(
        ((GAUGE_START_DEG - GAUGE_SWEEP_DEG) * Math.PI) / 180,
      ),
  y:
    GAUGE_CY -
    labelR *
      Math.sin(
        ((GAUGE_START_DEG - GAUGE_SWEEP_DEG) * Math.PI) / 180,
      ),
};

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

// Three-step journey: Model → Measure → Delegate
const steps = [
  {
    number: "01",
    title: "Model",
    description:
      "Define your decision process as a state machine. States, transitions, and prompts that describe what matters at each step.",
    link: "/docs/guides/state-machines",
  },
  {
    number: "02",
    title: "Measure",
    description:
      "Register AI and human specialists. DIAL runs decision cycles and measures which AI specialist best predicts what humans choose — tracking cost, latency, and alignment.",
    link: "/docs/concepts/decision-cycle",
  },
  {
    number: "03",
    title: "Delegate",
    description:
      "As alignment is demonstrated, the system progressively delegates to the most trusted specialist. If alignment degrades, it reverts automatically.",
    link: "/docs/concepts/consensus-strategies#progressive-collapse",
  },
];

// What DIAL gives you — the concrete outputs
const outputs = [
  {
    icon: "img/icon-empirical-trust.svg",
    title: "Cost per Decision",
    description:
      "Exact USD, token count, and latency for every proposal and vote. Know what each AI specialist costs before you trust it.",
  },
  {
    icon: "img/icon-human-primacy.svg",
    title: "Alignment Rate",
    description:
      "Continuous measurement of how well each specialist predicts human choices. Not a training-time metric — a production metric.",
  },
  {
    icon: "img/icon-progressive-collapse.svg",
    title: "Progressive Delegation",
    description:
      "Proven decisions get faster and cheaper. Hard decisions stay with humans. The system tells you which is which, with data.",
  },
];

// Progressive collapse flow — the horizontal illustration on the landing page
const collapseStages = [
  {
    number: "1",
    title: "Model",
    description: "Define states, transitions, and prompts",
    link: "/process",
  },
  {
    number: "2",
    title: "Screens",
    description: "Build interfaces for human operators",
    link: "/process",
  },
  {
    number: "3",
    title: "Prompts",
    description: "Build LLM strategies with exemplars",
    link: "/process",
  },
  {
    number: "4",
    title: "Operate",
    description: "Humans lead, LLMs shadow every decision",
    link: "/process",
  },
  {
    number: "5",
    title: "Measure",
    description: "Arbiter tracks alignment, prunes LLMs",
    link: "/process",
  },
  {
    number: "6",
    title: "Collapse",
    description: "LLMs take over, humans spot-check",
    link: "/process",
  },
];

const codeExample = `import { createSession, registerProposer, runSession } from "dialai";

const machine = {
  machineName: "content-review",
  initialState: "draft",
  goalState: "published",
  states: {
    draft: {
      prompt: "Review the content. Submit for review or keep editing?",
      transitions: { submit: "review" },
    },
    review: {
      prompt: "Check correctness, clarity, and tone. Approve or reject?",
      transitions: { approve: "published", reject: "draft" },
    },
    published: {},
  },
};

// Register AI specialists — each is a model + strategy + prompt
registerProposer({
  specialistId: "ai-reviewer-gpt4o-mini",
  machineName: "content-review",
  modelId: "openai/gpt-4o-mini",      // $0.003 per decision
});

registerProposer({
  specialistId: "ai-reviewer-llama",
  machineName: "content-review",
  modelId: "meta-llama/llama-3-8b",   // $0.0002 per decision
});

// Run to completion — DIAL measures alignment + cost
const session = await runSession(machine);`;

const cliExample = `# Run a machine from JSON
$ npx dialai machine.json

Machine:       content-review
Initial state: draft
Goal state:    published
Specialists:   3 proposers, 2 voters
Final state:   published ✓
Cost:          $0.018 (6 decisions)
Alignment:     96.2% (vs. human baseline)

# Or expose as an MCP server
$ npx dialai --mcp

# Or point to a remote server
$ DIALAI_BASE_URL=https://dial.internal npx dialai --mcp`;

function HeroDial() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const delay = setTimeout(() => {
      const duration = 3500;
      const startTime = performance.now();

      function tick(now: number) {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / duration, 1);
        setProgress(easeOutCubic(t));
        if (t < 1) requestAnimationFrame(tick);
      }

      requestAnimationFrame(tick);
    }, 600);

    return () => clearTimeout(delay);
  }, []);

  // Derived animated values
  const cost = 4.2 * Math.pow(0.0001 / 4.2, progress);
  const alignment = 12 + progress * (99.2 - 12);
  const models =
    progress < 0.2 ? 6 : progress < 0.4 ? 4 : progress < 0.65 ? 2 : 1;

  const indicator = gaugePoint(progress);
  const trackPath = gaugeArc(0, 1);
  const fillPath = gaugeArc(0, progress);

  return (
    <div className={styles.heroDial}>
      <svg
        viewBox="0 0 400 330"
        className={styles.dialSvg}
        aria-label="Animated gauge showing progressive delegation from human to autonomous"
        role="img"
      >
        <defs>
          <linearGradient
            id="gaugeGradient"
            x1="0%"
            y1="50%"
            x2="100%"
            y2="50%"
          >
            <stop
              offset="0%"
              style={{ stopColor: "var(--dial-emphasis)" }}
            />
            <stop
              offset="100%"
              style={{ stopColor: "var(--dial-accent-light)" }}
            />
          </linearGradient>
          <filter id="indicatorGlow">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Decorative concentric rings */}
        <circle
          cx={GAUGE_CX} cy={GAUGE_CY} r={172}
          fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.06"
        />
        <circle
          cx={GAUGE_CX} cy={GAUGE_CY} r={158}
          fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.04"
        />
        <circle
          cx={GAUGE_CX} cy={GAUGE_CY} r={122}
          fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.04"
        />
        <circle
          cx={GAUGE_CX} cy={GAUGE_CY} r={108}
          fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.03"
        />
        <circle
          cx={GAUGE_CX} cy={GAUGE_CY} r={78}
          fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.03"
        />

        {/* Track arc (background) */}
        <path
          d={trackPath}
          fill="none"
          stroke="currentColor"
          strokeWidth="6"
          strokeLinecap="round"
          opacity="0.08"
        />

        {/* Tick marks */}
        {gaugeTicks.map((tick, i) => (
          <line
            key={i}
            x1={tick.x1} y1={tick.y1}
            x2={tick.x2} y2={tick.y2}
            stroke="currentColor"
            strokeWidth={tick.major ? 1.5 : 0.75}
            opacity={tick.major ? 0.15 : 0.08}
          />
        ))}

        {/* Filled arc (animated) */}
        {fillPath && (
          <path
            d={fillPath}
            fill="none"
            stroke="url(#gaugeGradient)"
            strokeWidth="6"
            strokeLinecap="round"
          />
        )}

        {/* Indicator glow + dot */}
        {progress > 0.01 && (
          <>
            <circle
              cx={indicator.x} cy={indicator.y} r="14"
              fill="var(--dial-accent-light)" opacity="0.15"
              filter="url(#indicatorGlow)"
            />
            <circle
              cx={indicator.x} cy={indicator.y} r="6"
              fill="var(--dial-accent-light)"
            />
          </>
        )}

        {/* Center pivot dot */}
        <circle
          cx={GAUGE_CX} cy={GAUGE_CY} r="4"
          fill="currentColor" opacity="0.1"
        />

        {/* End labels */}
        <text
          x={leftLabelPos.x} y={leftLabelPos.y + 4}
          textAnchor="middle"
          fill="var(--dial-emphasis)"
          fontSize="11"
          fontFamily="var(--ifm-font-family-monospace)"
          fontWeight="500"
        >
          Human
        </text>
        <text
          x={rightLabelPos.x} y={rightLabelPos.y + 4}
          textAnchor="middle"
          fill="var(--dial-accent-light)"
          fontSize="11"
          fontFamily="var(--ifm-font-family-monospace)"
          fontWeight="500"
        >
          Autonomous
        </text>
      </svg>

      {/* Animated counters */}
      <div className={styles.dialCounters}>
        <div className={styles.dialCounter}>
          <span className={styles.dialCounterValue}>
            {formatCost(cost)}
          </span>
          <span className={styles.dialCounterLabel}>per decision</span>
        </div>
        <div className={styles.dialCounter}>
          <span className={styles.dialCounterValue}>
            {alignment.toFixed(1)}%
          </span>
          <span className={styles.dialCounterLabel}>alignment</span>
        </div>
        <div className={styles.dialCounter}>
          <span className={styles.dialCounterValue}>{models}</span>
          <span className={styles.dialCounterLabel}>
            {models === 1 ? "model" : "models"}
          </span>
        </div>
      </div>
    </div>
  );
}

function HeroSection() {
  return (
    <header className={styles.hero}>
      <div className={styles.heroContent}>
        <div className={styles.heroText}>
          <Heading as="h1" className={styles.heroTitle}>
            <span className={styles.titleGradient}>DIAL</span>
          </Heading>
          <p className={styles.heroTagline}>
            Measure the cost of AI. Automate what's proven.
          </p>
          <p className={styles.heroDescription}>
            DIAL measures whether AI can reliably replace human decisions — and
            at what cost. Model your process, let AI and humans participate
            together, and get exact data on cost, quality, and alignment at
            every step.
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
          <HeroDial />
        </div>
      </div>
    </header>
  );
}

function MetricsSection() {
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
              For this specific task, at this specific step: can AI do it? Which
              model does it best? What does it{" "}
              <span className={styles.highlight}>cost</span>? And how often does
              a <span className={styles.highlight}>human</span> need to{" "}
              <span className={styles.highlight}>check</span>?
            </blockquote>
            <p className={styles.questionFollow}>
              DIAL tracks per-specialist, per-decision economics so you can
              answer these questions with data, not guesswork.
            </p>
          </div>
          <div className={styles.questionVisual}>
            <div className={styles.metricsIntro}>
              <p className={styles.metricsLabel}>
                Per-specialist, per-decision:
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
                Every proposal and vote records cost, latency, tokens, and
                alignment against human ground truth
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function OutputCard({ icon, title, description }) {
  const iconUrl = useBaseUrl(icon);
  return (
    <div className={styles.principleCard}>
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

function WhatYouGetSection() {
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref as RefObject<HTMLElement>}
      className={clsx(styles.principles, inView && styles.animateIn)}
    >
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            What DIAL Gives You
          </Heading>
          <p className={styles.sectionSubtitle}>
            Exact numbers on whether AI can handle each step of your process —
            and what it costs.
          </p>
        </div>
        <div className={styles.principlesGrid}>
          {outputs.map((output, idx) => (
            <OutputCard key={idx} {...output} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StepCard({ number, title, description, link }) {
  return (
    <Link to={link} className={styles.conceptCard}>
      <div className={styles.stepNumber}>{number}</div>
      <Heading as="h3" className={styles.conceptTitle}>
        {title}
      </Heading>
      <p className={styles.conceptDescription}>{description}</p>
      <span className={styles.conceptLink}>Learn more →</span>
    </Link>
  );
}

function JourneySection() {
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
            Three steps from "humans do everything" to "AI handles what's
            proven."
          </p>
        </div>
        <div className={styles.conceptsGrid}>
          {steps.map((step, idx) => (
            <StepCard key={idx} {...step} />
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
              Define. Register. Measure.
            </Heading>
            <p className={styles.sectionSubtitle} style={{ margin: 0 }}>
              Define a state machine, register competing AI specialists, and
              DIAL measures which one best predicts human choices — with exact
              cost data.
            </p>
          </div>
          <div className={styles.codeBlock}>
            <div className={styles.codeHeader}>
              <span className={styles.codeDot} />
              <span className={styles.codeDot} />
              <span className={styles.codeDot} />
              <span className={styles.codeFilename}>app.ts</span>
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

function CollapseFlowSection() {
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref as RefObject<HTMLElement>}
      className={clsx(styles.collapseSection, inView && styles.animateIn)}
    >
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Progressive Collapse
          </Heading>
          <p className={styles.sectionSubtitle}>
            From "nobody agrees" to "one cheap model handles it." Click any
            stage to see exactly how it works.
          </p>
        </div>
        <div className={styles.collapseFlow}>
          {collapseStages.map((stage, idx) => (
            <div key={idx} className={styles.collapseStageWrapper}>
              <Link to={stage.link} className={clsx(
                styles.collapseStage,
                idx === collapseStages.length - 1 && styles.collapseStageFinal
              )}>
                <span className={styles.collapseStageNumber}>
                  {stage.number}
                </span>
                <span className={styles.collapseStageTitle}>
                  {stage.title}
                </span>
                <span className={styles.collapseStageDesc}>
                  {stage.description}
                </span>
              </Link>
              {idx < collapseStages.length - 1 && (
                <div className={styles.collapseArrow}>→</div>
              )}
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: "1.5rem" }}>
          <Link
            className={clsx("button button--outline button--secondary", styles.collapseLink)}
            to="/process"
          >
            See how it works →
          </Link>
              </div>
              </div>
    </section>
  );
}

function DeveloperExperienceSection() {
  const [ref, inView] = useInView();
  return (
    <section
      ref={ref as RefObject<HTMLElement>}
      className={clsx(styles.principles, inView && styles.animateIn)}
    >
      <div className="container">
        <div className={styles.sectionHeader}>
          <Heading as="h2" className={styles.sectionTitle}>
            Built for Developers and AI Agents
          </Heading>
          <p className={styles.sectionSubtitle}>
            A TypeScript library, CLI, and MCP server. Use it from your code,
            your terminal, or your AI assistant.
          </p>
              </div>
        <div className={styles.devModes}>
          <div className={styles.devMode}>
            <div className={styles.devModeHeader}>
              <span className={styles.devModeIcon}>$_</span>
              <span className={styles.devModeTitle}>CLI</span>
            </div>
            <code className={styles.devModeCode}>npx dialai machine.json</code>
            <p className={styles.devModeDesc}>
              Run a machine from the command line. Get cost and alignment
              results immediately.
            </p>
          </div>
          <div className={styles.devMode}>
            <div className={styles.devModeHeader}>
              <span className={styles.devModeIcon}>⚡</span>
              <span className={styles.devModeTitle}>MCP Server</span>
            </div>
            <code className={styles.devModeCode}>npx dialai --mcp</code>
            <p className={styles.devModeDesc}>
              Expose DIAL as tools for Claude, Cursor, or any MCP-compatible AI
              assistant.
            </p>
          </div>
          <div className={styles.devMode}>
            <div className={styles.devModeHeader}>
              <span className={styles.devModeIcon}>{"{}"}</span>
              <span className={styles.devModeTitle}>TypeScript</span>
            </div>
            <code className={styles.devModeCode}>
              import {"{ runSession }"} from "dialai"
            </code>
            <p className={styles.devModeDesc}>
              Import as a library for maximum control. Embed DIAL in your
              application.
            </p>
          </div>
        </div>
        <div className={styles.devNote}>
          <p>
            Switch between local and remote with one env var:{" "}
            <code>DIALAI_BASE_URL</code>
          </p>
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
            Know what AI costs before you trust it.
          </Heading>
          <p className={styles.ctaDescription}>
            Model your decision process. Measure AI alignment. Get exact
            numbers on cost, quality, and when to delegate.
          </p>
          <div className={styles.ctaButtons}>
            <Link
              className="button button--secondary button--lg"
              to="/docs/getting-started/installation"
            >
              Get Started
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
      title="Measure the cost of AI. Automate what's proven."
      description="DIAL measures whether AI can reliably replace human decisions — and at what cost. Per-decision tracking of dollars, latency, and alignment against human ground truth."
    >
      <HeroSection />
      <main>
        <MetricsSection />
        <WhatYouGetSection />
        <JourneySection />
        <CodeExampleSection />
        <CollapseFlowSection />
        <DeveloperExperienceSection />
        <CTASection />
      </main>
    </Layout>
  );
}
