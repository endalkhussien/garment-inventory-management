import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "JetBrains Mono", "ui-monospace", "monospace"],
      },
      colors: {
        page: "var(--bg-page)",
        surface: "var(--bg-surface)",
        card: "var(--bg-card)",
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          container: "var(--primary-container)",
          fixed: "var(--primary-fixed)",
        },
        action: {
          DEFAULT: "var(--color-action)",
          hover: "var(--color-action-hover)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
          fixed: "var(--secondary-fixed)",
          "fixed-dim": "var(--secondary-fixed-dim)",
          container: "var(--secondary-container)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        muted: "var(--text-muted)",
        border: "var(--border-color)",
        "on-primary": "var(--text-on-primary)",
        "outline-variant": "var(--outline-variant)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
        elevated: "var(--shadow-elevated)",
      },
      borderRadius: {
        DEFAULT: "0.125rem",
        lg: "0.25rem",
        xl: "0.5rem",
        full: "0.75rem",
      },
      maxWidth: {
        content: "1440px",
      },
      spacing: {
        "sidebar": "260px",
        "sidebar-collapsed": "64px",
      },
    },
  },
  plugins: [],
};

export default config;
