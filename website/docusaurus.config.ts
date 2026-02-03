import { themes as prismThemes } from "prism-react-renderer";
import type { Config } from "@docusaurus/types";
import type * as Preset from "@docusaurus/preset-classic";

const config: Config = {
  title: "DIAL",
  tagline: "Dynamic Integration between AI and Labor",
  favicon: "img/favicon.svg",

  // Set the production url of your site here
  url: "https://eloquentanalytics.github.io",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages, this is usually "/<projectName>/"
  baseUrl: "/dialai/",

  // GitHub pages deployment config.
  organizationName: "eloquentanalytics",
  projectName: "dialai",

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/eloquentanalytics/dialai/tree/main/website/",
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Force dark mode as default
    colorMode: {
      defaultMode: "dark",
      disableSwitch: false,
      respectPrefersColorScheme: false,
    },
    // Social card for sharing
    image: "img/hero-illustration.svg",
    navbar: {
      title: "DIAL",
      logo: {
        alt: "DIAL Logo",
        src: "img/logo.svg",
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          to: "/constitution",
          position: "left",
          label: "Constitution",
        },
        {
          to: "/docs/concepts/intro",
          position: "left",
          label: "Concepts",
        },
        {
          to: "/docs/getting-started/installation",
          position: "left",
          label: "Get Started",
        },
        {
          href: "https://github.com/eloquentanalytics/dialai",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Learn",
          items: [
            {
              label: "Introduction",
              to: "/docs/intro",
            },
            {
              label: "Getting Started",
              to: "/docs/getting-started/installation",
            },
            {
              label: "Concepts",
              to: "/docs/concepts/intro",
            },
          ],
        },
        {
          title: "Guides",
          items: [
            {
              label: "State Machines",
              to: "/docs/guides/state-machines",
            },
            {
              label: "Registering Specialists",
              to: "/docs/guides/registering-specialists",
            },
            {
              label: "Implementing Strategies",
              to: "/docs/guides/implementing-strategies",
            },
          ],
        },
        {
          title: "Community",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/eloquentanalytics/dialai",
            },
            {
              label: "Issues",
              href: "https://github.com/eloquentanalytics/dialai/issues",
            },
          ],
        },
      ],
      logo: {
        alt: "DIAL - Dynamic Integration between AI and Labor",
        src: "img/logo.svg",
        width: 50,
        height: 50,
      },
      copyright: `Copyright © ${new Date().getFullYear()} DIAL Contributors. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ["bash", "json", "typescript"],
    },
    // Announcement bar (optional)
    announcementBar: {
      id: "alpha_notice",
      content:
        '⚡ DIAL is in active development. <a href="/docs/intro">Learn about the framework</a> and help shape the future of AI-human collaboration.',
      backgroundColor: "#1e293b",
      textColor: "#94a3b8",
      isCloseable: true,
    },
  } satisfies Preset.ThemeConfig,

  markdown: {
    mermaid: true,
  },
  themes: ["@docusaurus/theme-mermaid"],
  
  // Head tags for custom fonts
  headTags: [
    {
      tagName: "link",
      attributes: {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
    },
    {
      tagName: "link",
      attributes: {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "anonymous",
      },
    },
  ],
};

export default config;
