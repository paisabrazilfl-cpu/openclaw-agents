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
        ink: {
          950: "#0a0b10",
          900: "#0f1117",
          800: "#161922",
          700: "#1e222e",
          600: "#2a2f3d",
        },
        claw: {
          400: "#7c9cff",
          500: "#5b7cff",
          600: "#4361ee",
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
