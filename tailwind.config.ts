import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        page: "var(--bg-page)",
        surface: "var(--bg-surface)",
        card: "var(--bg-card)",
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
        },
        secondary: {
          DEFAULT: "var(--color-secondary)",
        },
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        muted: "var(--text-muted)",
        border: "var(--border-color)",
        "on-primary": "var(--text-on-primary)",
      },
      boxShadow: {
        card: "var(--shadow-card)",
      },
      borderRadius: {
        lg: "0.5rem",
      },
      spacing: {
        1: "0.5rem",
        2: "1rem",
        3: "1.5rem",
        4: "2rem",
      },
    },
  },
  plugins: [],
};

export default config;
