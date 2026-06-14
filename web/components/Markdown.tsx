"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// GitHub-flavored markdown rendering for chat messages (tables, code, lists,
// task lists, autolinks). Links open in a new tab.
export function Markdown({ children }: { children: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer" />
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
