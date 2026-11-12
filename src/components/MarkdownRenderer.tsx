import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

interface CodeBlockProps {
  language?: string;
  code: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3.5 rounded-xl overflow-hidden border border-neutral-700/60 bg-[#0d0d10] font-mono text-[12.5px] sm:text-[13px] leading-relaxed shadow-lg w-full max-w-full min-w-0">
      {/* Code Header Bar like ChatGPT / Claude */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#18181c] border-b border-neutral-800 text-neutral-400 text-xs select-none">
        <span className="font-sans font-semibold text-[11px] text-neutral-300 uppercase tracking-wider">
          {language || 'code'}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-neutral-700/50 hover:text-white transition-colors cursor-pointer text-[11px] font-medium"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-teal-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Body */}
      <div className="p-4 overflow-x-auto text-[#e2e8f0]">
        <pre className="m-0 font-mono">
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="chatgpt-markdown text-[14px] sm:text-[14.5px] leading-relaxed text-neutral-800 dark:text-neutral-200 break-words [overflow-wrap:anywhere] space-y-2.5 w-full min-w-0 max-w-full overflow-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const isInline = !className && typeof children === 'string' && !children.includes('\n');

            if (isInline) {
              return (
                <code
                  className="px-1.5 py-0.5 mx-0.5 rounded-md bg-neutral-100 dark:bg-[#202026] text-teal-700 dark:text-teal-300 font-mono text-[12.5px] border border-neutral-200 dark:border-neutral-700/60"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const codeString = String(children).replace(/\n$/, '');
            const language = match ? match[1] : '';

            return <CodeBlock language={language} code={codeString} />;
          },
          h1({ children }) {
            return (
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mt-4 mb-2 pb-1 border-b border-neutral-200 dark:border-neutral-800">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-lg sm:text-xl font-bold text-neutral-900 dark:text-white mt-3.5 mb-2">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-base sm:text-lg font-semibold text-neutral-800 dark:text-neutral-100 mt-3 mb-1.5">
                {children}
              </h3>
            );
          },
          h4({ children }) {
            return (
              <h4 className="text-sm sm:text-base font-semibold text-neutral-700 dark:text-neutral-200 mt-2 mb-1">
                {children}
              </h4>
            );
          },
          p({ children }) {
            return <p className="mb-2.5 leading-relaxed last:mb-0">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc pl-5 my-2.5 space-y-1.5 text-neutral-700 dark:text-neutral-300">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal pl-5 my-2.5 space-y-1.5 text-neutral-700 dark:text-neutral-300">{children}</ol>;
          },
          li({ children }) {
            return <li className="leading-relaxed">{children}</li>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-3 border-teal-500 pl-4 my-3 italic text-neutral-600 dark:text-neutral-400 bg-neutral-100/70 dark:bg-neutral-900/40 py-1.5 rounded-r-lg">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-3.5 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-sm">
                <table className="min-w-full text-left text-xs sm:text-sm divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-[#121216]">
                  {children}
                </table>
              </div>
            );
          },
          thead({ children }) {
            return <thead className="bg-neutral-50 dark:bg-[#1a1a20] text-neutral-800 dark:text-neutral-200 font-semibold">{children}</thead>;
          },
          tbody({ children }) {
            return <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-neutral-700 dark:text-neutral-300">{children}</tbody>;
          },
          tr({ children }) {
            return <tr className="hover:bg-neutral-50 dark:hover:bg-neutral-800/30 transition-colors">{children}</tr>;
          },
          th({ children }) {
            return <th className="px-4 py-2.5 font-semibold text-neutral-900 dark:text-neutral-100">{children}</th>;
          },
          td({ children }) {
            return <td className="px-4 py-2.5 text-neutral-700 dark:text-neutral-300">{children}</td>;
          },
          a({ href, children }) {
            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 underline underline-offset-2 transition-colors font-medium inline-flex items-center gap-1"
              >
                {children}
              </a>
            );
          },
          hr() {
            return <hr className="my-4 border-neutral-200 dark:border-neutral-800" />;
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
