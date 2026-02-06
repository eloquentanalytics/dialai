import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Maps MCP tool names to their corresponding markdown documentation files.
 * Each tool has its own dedicated markdown file in the api/ directory.
 */
const TOOL_TO_DOC_FILE: Record<string, string> = {
  run_session: "runSession.md",
  run_session_from_definition: "runSession.md", // Same function, different input
  create_session: "createSession.md",
  get_session: "getSession.md",
  get_sessions: "getSessions.md",
  register_proposer: "registerProposer.md",
  register_voter: "registerVoter.md",
  execute_transition: "executeTransition.md",
  evaluate_consensus: "evaluateConsensus.md",
};

/**
 * Extracts the description from a markdown file.
 * Looks for the first paragraph after the main heading (removes frontmatter and code blocks).
 */
function extractDescription(markdown: string): string | null {
  // Remove frontmatter (between --- markers)
  let content = markdown.replace(/^---[\s\S]*?---\n\n/, "");

  // Remove the main heading (first # heading)
  content = content.replace(/^# .+\n\n/, "");

  // Extract the first paragraph (text before first code block or next heading)
  const firstParagraph = content
    .split(/\n\n/)
    .find((para) => para.trim() && !para.trim().startsWith("```"));

  if (!firstParagraph) {
    return null;
  }

  // Clean up: remove any remaining code block markers and trim
  return firstParagraph.replace(/```[\s\S]*?```/g, "").trim() || null;
}

/**
 * Loads the API documentation from an individual markdown file and extracts a description.
 * Falls back to a default description if the file can't be read or parsed.
 */
export function getToolDescription(
  toolName: string,
  defaultDescription: string
): string {
  try {
    const docFile = TOOL_TO_DOC_FILE[toolName];
    if (!docFile) {
      return defaultDescription;
    }

    // Resolve path to the docs directory relative to this file
    // When compiled, this file will be in dist/dialai/, so we go up to project root
    const docsPath = resolve(
      __dirname,
      "../../../website/docs/api",
      docFile
    );
    const markdown = readFileSync(docsPath, "utf-8");

    const description = extractDescription(markdown);
    return description || defaultDescription;
  } catch (error) {
    // If we can't read the docs, fall back to the default
    console.error(
      `Warning: Could not load documentation for ${toolName}:`,
      error instanceof Error ? error.message : error
    );
    return defaultDescription;
  }
}
