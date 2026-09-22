"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, Terminal, ExternalLink } from "lucide-react";

interface AiMarkdownRendererProps {
  content: string;
  className?: string;
}

/**
 * Interactive Code Block with Copy-to-Clipboard functionality
 */
function CodeBlock({ language, code }: { language?: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="my-3 overflow-hidden rounded-xl border border-gray-800 bg-gray-950 text-gray-100 shadow-md">
      <div className="flex items-center justify-between border-b border-gray-800 bg-gray-900/90 px-3.5 py-1.5 text-xs text-gray-400">
        <span className="flex items-center gap-1.5 font-mono text-[11px] font-semibold text-orange-400 uppercase tracking-wider">
          <Terminal className="h-3.5 w-3.5" />
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition cursor-pointer"
          title="Copy code"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3 text-emerald-400" />
              <span className="text-emerald-400 font-bold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3.5 font-mono text-xs leading-relaxed text-gray-200">
        <code>{code}</code>
      </pre>
    </div>
  );
}

/**
 * Premium Markdown Renderer designed specifically for FoodFlow AI Assistant
 * Supports GFM tables, interactive food list formatting, copyable code, and responsive callouts.
 */
export default function AiMarkdownRenderer({ content, className = "" }: AiMarkdownRendererProps) {
  // Strip any accidental raw JSON remnants that might have leaked into markdown
  const safeContent = content
    .replace(/```(?:food_recommendations|order_status|action_buttons|json)?[\s\S]*/gi, "")
    .replace(/\[\s*\{\s*"id"[\s\S]*/gi, "")
    .replace(/\{\s*"orderId"[\s\S]*/gi, "")
    .replace(/\[\s*\{\s*"type"[\s\S]*/gi, "")
    .trim();

  return (
    <div className={`prose prose-sm max-w-none text-sm leading-relaxed text-gray-800 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mt-3 mb-2 text-base font-extrabold text-gray-900 border-b border-orange-100 pb-1.5 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500 inline-block" />
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mt-3 mb-1.5 text-sm font-bold text-gray-900 flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-orange-400 inline-block" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-2 mb-1 text-xs font-bold uppercase tracking-wider text-orange-600">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-2 leading-relaxed text-gray-800 last:mb-0">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-bold text-gray-900 bg-orange-50/90 px-1 py-0.5 rounded text-orange-950 border border-orange-200/50">
              {children}
            </strong>
          ),
          em: ({ children }) => (
            <em className="text-gray-700 italic">{children}</em>
          ),
          ul: ({ children }) => (
            <ul className="my-2 space-y-1 pl-4 list-disc marker:text-orange-500 text-gray-800">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="my-2 space-y-1 pl-4 list-decimal marker:text-orange-500 font-medium text-gray-800">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-0.5">{children}</li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2.5 border-l-3 border-orange-500 bg-orange-50/60 pl-3 py-1.5 rounded-r-xl text-xs italic text-gray-700">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="my-3 overflow-x-auto rounded-xl border border-gray-200/90 bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse divide-y divide-gray-200">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-orange-50/80 text-orange-950 font-bold border-b border-gray-200 text-xs uppercase tracking-wider">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-gray-100 bg-white">{children}</tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-orange-50/30 transition-colors">{children}</tr>
          ),
          th: ({ children }) => (
            <th className="px-3 py-2 font-bold text-gray-800">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-3 py-2 text-gray-700 leading-normal">{children}</td>
          ),
          code: ({ node, inline, className: codeClassName, children, ...props }: any) => {
            const codeString = String(children).replace(/\n$/, "");
            const match = /language-(\w+)/.exec(codeClassName || "");
            const language = match ? match[1] : undefined;

            if (inline || !codeString.includes("\n")) {
              return (
                <code
                  className="font-mono text-xs px-1.5 py-0.5 rounded-md bg-gray-100 font-semibold text-orange-700 border border-gray-200/70"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return <CodeBlock language={language} code={codeString} />;
          },
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-orange-600 hover:text-orange-700 font-semibold underline underline-offset-2 transition"
            >
              <span>{children}</span>
              <ExternalLink className="h-3 w-3 inline opacity-70" />
            </a>
          ),
          hr: () => <hr className="my-3 border-t border-gray-200/80" />,
        }}
      >
        {safeContent}
      </ReactMarkdown>
    </div>
  );
}
