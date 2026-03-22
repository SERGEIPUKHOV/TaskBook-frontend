import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
    "./store/**/*.{ts,tsx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        canvas: "rgb(var(--canvas) / <alpha-value>)",
        paper: "rgb(var(--paper) / <alpha-value>)",
        ink: "rgb(var(--ink) / <alpha-value>)",
        muted: "rgb(var(--muted) / <alpha-value>)",
        line: "rgb(var(--line) / <alpha-value>)",
        accent: "rgb(var(--accent) / <alpha-value>)",
        success: "rgb(var(--success) / <alpha-value>)",
        danger: "rgb(var(--danger) / <alpha-value>)",
        anxiety: "rgb(var(--anxiety) / <alpha-value>)",
        priority: "rgb(var(--priority) / <alpha-value>)",
      },
      fontFamily: {
        sans: ['"Inter"', '"Avenir Next"', '"Segoe UI"', "system-ui", "sans-serif"],
        mono: ['"JetBrains Mono"', '"SF Mono"', '"Menlo"', "monospace"],
      },
      boxShadow: {
        panel: "0 18px 45px rgba(17, 24, 39, 0.07)",
        paper: "0 8px 24px rgba(15, 23, 42, 0.08), 0 1px 0 rgba(255, 255, 255, 0.7) inset",
      },
      borderRadius: {
        "2xl": "1.5rem",
      },
      backgroundImage: {
        "paper-fade":
          "radial-gradient(circle at top left, rgba(59,130,246,0.10), transparent 35%), radial-gradient(circle at bottom right, rgba(245,158,11,0.10), transparent 30%)",
      },
    },
  },
  plugins: [],
};

export default config;
