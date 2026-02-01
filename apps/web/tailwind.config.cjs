/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"] ,
  theme: {
    extend: {
      colors: {
        primary: "#ff3333",
        "primary-hover": "#d92b2b",

        lobster: "#ff3e3e",
        "lobster-dark": "#3d0f0f",

        "bg-terminal": "#050505",
        "surface-terminal": "#0a0a0a",
        "border-terminal": "#262626",

        "border-dark": "#262626",

        "background-dark": "#020202",
        "surface-dark": "#0c0c0c",
        "panel-dark": "#141414",
        "card-dark": "#1a1d24",

        "text-dim": "#888888",
        "text-bright": "#eeeeee",

        "text-muted": "#888888",
        "text-main": "#ededed",

        "neon-green": "#00ff41",
        "neon-red": "#ff2a2a",
        "trade-yes": "#00ff94",
        "trade-no": "#ff1a1a",

        "accent-blue": "#3b82f6"
      },
      fontFamily: {
        display: ["Space Grotesk", "ui-sans-serif", "system-ui", "sans-serif"],
        body: ["Noto Sans", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: [
          "JetBrains Mono",
          "Fira Code",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "Monaco",
          "Consolas",
          "monospace"
        ]
      },
      borderRadius: {
        DEFAULT: "2px",
        sm: "2px",
        md: "4px",
        lg: "4px",
        xl: "6px",
        full: "9999px"
      },
      boxShadow: {
        "glow-red": "0 0 10px rgba(255, 62, 62, 0.3)",
        "glow-green": "0 0 8px rgba(0, 255, 65, 0.3)",
        glow: "0 0 15px rgba(255, 51, 51, 0.2)",
        "glow-sm": "0 0 8px rgba(255, 51, 51, 0.3)"
      },
      backgroundImage: {
        "terminal-grid":
          "linear-gradient(#111 1px, transparent 1px), linear-gradient(90deg, #111 1px, transparent 1px)",
        "grid-pattern":
          "linear-gradient(to right, #1a1a1a 1px, transparent 1px), linear-gradient(to bottom, #1a1a1a 1px, transparent 1px)"
      }
    }
  },
  plugins: [
    require("@tailwindcss/forms"),
    require("@tailwindcss/typography"),
    require("@tailwindcss/container-queries")
  ]
};
