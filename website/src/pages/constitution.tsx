import Layout from "@theme/Layout";
import { marked } from "marked";
import { useMemo } from "react";
import styles from "./constitution.module.css";
import { constitutionMarkdown } from "../data/constitution";

export default function Constitution(): JSX.Element {
  const htmlContent = useMemo(() => {
    // Configure marked options
    marked.setOptions({
      gfm: true,
      breaks: false,
    });

    // Parse markdown to HTML
    return marked.parse(constitutionMarkdown) as string;
  }, []);

  return (
    <Layout
      title="The DIAL Constitution"
      description="A detailed description of how AI specialists should reason and behave within the DIAL framework. This document plays a role in training and evaluation, and its content directly shapes specialist behavior."
    >
      <div className="container margin-vert--lg">
        <div className="row">
          <div className="col col--8 col--offset-2">
            <article
              className={styles.constitution}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          </div>
        </div>
      </div>
    </Layout>
  );
}
