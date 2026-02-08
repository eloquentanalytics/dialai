import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    "intro",
    {
      type: "category",
      label: "Concepts",
      collapsed: false,
      items: [
        "concepts/intro",
        "concepts/sessions",
        "concepts/specialists",
        "concepts/decision-cycle",
        "concepts/arbitration",
        "concepts/human-primacy",
        "concepts/related-work",
      ],
    },
    {
      type: "category",
      label: "Implementation",
      collapsed: false,
      items: [
        {
          type: "category",
          label: "Getting Started",
          items: [
            "getting-started/installation",
            "getting-started/quick-start",
          ],
        },
        {
          type: "category",
          label: "Guides",
          items: [
            "guides/state-machines",
            "guides/registering-specialists",
            "guides/implementing-strategies",
            "guides/proxy-mode",
          ],
        },
        {
          type: "category",
          label: "API Reference",
          items: [
            "api/intro",
            "api/types",
            "api/submitArbitration",
            "api/cli",
          ],
        },
        {
          type: "category",
          label: "Examples",
          items: ["examples/intro"],
        },
      ],
    },
    "agent-experience",
    "ecosystem",
    "roadmap",
  ],
};

export default sidebars;
