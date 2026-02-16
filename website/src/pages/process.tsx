import clsx from "clsx";
import Link from "@docusaurus/Link";
import Layout from "@theme/Layout";
import Heading from "@theme/Heading";
import styles from "./process.module.css";

/* =========================================================
   Data: The steps of progressive collapse
   ========================================================= */

const steps = [
  {
    id: "model",
    number: "01",
    title: "Model Your Task",
    subtitle: "Define states, transitions, and decision prompts",
    body: "Break your process into a state machine. Each state is a decision point; each transition is a possible action. Write a decision prompt for each state that tells any specialist — human or AI — what to evaluate and what their options are.",
    icon: "⬡",
  },
  {
    id: "screens",
    number: "02",
    title: "Build Human Screens",
    subtitle: "Give humans the interface to operate the machine",
    body: "Build screens for each state so humans can see the context, select the next transition, and provide metadata and reasoning for their choice. Every human decision becomes ground truth that the system learns from.",
    icon: "◻",
  },
  {
    id: "prompts",
    number: "03",
    title: "Build Prompt Strategies",
    subtitle: "Give LLMs the tools to participate",
    body: "Create prompt strategies that collect recent session history and exemplars so LLMs can select the next transition as a tool call, providing metadata and reasoning as parameters. The prompts improve automatically as exemplars accumulate.",
    icon: "⬢",
  },
  {
    id: "humans",
    number: "04",
    title: "Train the Human Team",
    subtitle: "Assemble operators and teach them the screens",
    body: "Recruit the humans who will operate the state machine. Train them on the screens, the decision criteria, and how to provide clear reasoning. Their decisions are the standard everything else is measured against.",
    icon: "◉",
  },
  {
    id: "llms",
    number: "05",
    title: "Assemble the LLM Group",
    subtitle: "Register AI specialists with their prompt strategies",
    body: "Register a group of LLMs as proposers and voters, each with a prompt strategy. Different models, different prompts, different approaches — all competing at the same decision points. More diversity means better coverage.",
    icon: "◈",
  },
  {
    id: "operate",
    number: "06",
    title: "Humans Operate, LLMs Shadow",
    subtitle: "Run sessions with humans in the lead",
    body: "Humans begin operating sessions using the state machine and screens. In parallel, LLMs shadow every decision — submitting proposals and votes managed by an arbiter. At this stage, every decision still requires human approval. The LLMs are learning, not deciding.",
    icon: "◎",
  },
  {
    id: "align",
    number: "07",
    title: "Measure and Prune",
    subtitle: "The arbiter accumulates alignment data on each specialist",
    body: "Over time, the arbiter tracks how often each LLM agrees with human decisions. Specialists that consistently disagree or add no signal are disabled. The group is gradually reduced to as few LLMs as possible — the ones that best predict what humans would choose.",
    icon: "◇",
  },
  {
    id: "collapse",
    number: "08",
    title: "LLMs Take Over",
    subtitle: "Consensus confidence passes the threshold",
    body: "Iterate on the LLMs and prompt strategies until consensus confidence crosses the threshold you set. The LLMs gradually take over the process — making decisions autonomously while humans drop to occasional spot-checks. If alignment ever degrades, the system automatically reverts to human oversight.",
    icon: "◆",
  },
];

/* =========================================================
   Page
   ========================================================= */

export default function Process(): JSX.Element {
  return (
    <Layout
      title="How It Works"
      description="Eight steps from full human operation to autonomous AI execution — with humans always in control."
    >
      <header className={styles.hero}>
        <Heading as="h1" className={styles.heroTitle}>
          How It Works
        </Heading>
        <p className={styles.heroSubtitle}>
          Eight steps from full human operation to autonomous AI execution.
          The system earns trust one decision at a time — and the humans never
          fully leave.
        </p>
      </header>

      <main>
        <div className={styles.timeline}>
          {steps.map((step) => (
            <section
              key={step.id}
              id={step.id}
              className={styles.stage}
            >
              <div className={styles.stageDot} />
              <div className={styles.stageNumber}>{step.number}</div>
              <Heading as="h2" className={styles.stageTitle}>
                {step.title}
              </Heading>
              <div className={styles.stageBody}>
                <p className={styles.stageSubtitle}>{step.subtitle}</p>
                <p>{step.body}</p>
              </div>
            </section>
          ))}
        </div>

        <div className={styles.ctaSection}>
          <div className={styles.ctaCard}>
            <Heading as="h3" className={styles.ctaTitle}>
              Want the full picture?
            </Heading>
            <p className={styles.ctaDesc}>
              The implementation guide covers the exact algorithms — consensus
              scoring, alignment measurement, pruning criteria, the trip line,
              and self-healing — with worked examples at every stage.
            </p>
            <Link
              className={styles.ctaLink}
              to="/docs/guides/progressive-collapse"
            >
              Read the implementation guide →
            </Link>
          </div>
        </div>

        <div style={{ textAlign: "center", padding: "2rem" }}>
          <Link className={styles.backLink} to="/">
            ← Back to home
          </Link>
        </div>
      </main>
    </Layout>
  );
}
