import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    "intro",
    {
      type: "category",
      label: "Getting Started",
      items: ["getting-started/installation", "getting-started/quick-start"],
    },
    {
      type: "category",
      label: "Concepts",
      items: [
        "concepts/intro",
        "concepts/sessions",
        "concepts/specialists",
        "concepts/decision-cycle",
        "concepts/arbitration",
        "concepts/human-primacy",
      ],
    },
    {
      type: "category",
      label: "Guides",
      items: [
        "guides/state-machines",
        "guides/registering-specialists",
        "guides/implementing-strategies",
      ],
    },
    {
      type: "category",
      label: "API Reference",
      items: ["api/intro"],
    },
    {
      type: "category",
      label: "Examples",
      items: ["examples/intro"],
    },
  ],
};

export default sidebars;
