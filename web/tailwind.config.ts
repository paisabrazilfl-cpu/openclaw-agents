import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Warm near-black neutrals (Claude dark theme)
        ink: {
          950: "#1a1714",
          900: "#221f1b",
          800: "#2c2925",
          700: "#3a352f",
          600: "#4b453d",
        },
        // Claude / Anthropic coral-clay accent
        claw: {
          400: "#e0a085",
          500: "#d97757",
          600: "#bd5d3c",
        },
      },
      fontFamily: {
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
    },
  },
  plugins: [],
};

export default config;
