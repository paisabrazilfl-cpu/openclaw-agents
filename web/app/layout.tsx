import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OpenClaw Console",
  description:
    "MVP console for the OpenClaw multi-agent fleet — chat with 9 specialized agents wired to LLM providers, web search, vector memory, and code execution.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
