import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        cream: "var(--cream)",
        "cream-deep": "var(--cream-deep)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        cobalt: "var(--cobalt)",
        "cobalt-deep": "var(--cobalt-deep)",
        pink: "var(--pink)",
        yellow: "var(--yellow)",
        mint: "var(--mint)",
        "white-warm": "var(--white-warm)",
        "f1-red": "var(--f1-red)",
        "f1-dark": "var(--f1-dark)",
      },
      fontFamily: {
        display: ["var(--font-display)", "sans-serif"],
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
      },
      letterSpacing: {
        tightest: "-0.04em",
        tighter: "-0.03em",
      },
      fontSize: {
        "hero-xl": ["clamp(56px, 10vw, 144px)", { lineHeight: "0.88", letterSpacing: "-0.04em" }],
        "hero-lg": ["clamp(52px, 10vw, 148px)", { lineHeight: "0.88", letterSpacing: "-0.04em" }],
        "hero-md": ["clamp(40px, 7vw, 112px)", { lineHeight: "0.9", letterSpacing: "-0.035em" }],
        "display-lg": ["clamp(40px, 6vw, 96px)", { lineHeight: "0.9", letterSpacing: "-0.03em" }],
        "display-md": ["clamp(30px, 4vw, 64px)", { lineHeight: "0.95", letterSpacing: "-0.025em" }],
      },
      maxWidth: {
        wide: "1440px",
        content: "1280px",
      },
    },
  },
  plugins: [],
};

export default config;
