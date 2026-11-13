import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import rehypeHighlight from 'rehype-highlight';
import { Copy, Check } from 'lucide-react';

interface MarkdownRendererProps {
  content: string;
}

function extractText(node: React.ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join('');
  }
  if (React.isValidElement(node) && (node.props as any)?.children !== undefined) {
    return extractText((node.props as any).children);
  }
  return '';
}

interface CodeBlockProps {
  language?: string;
  rawCode: string;
  children: React.ReactNode;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ language, rawCode, children }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(rawCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-3.5 rounded-xl overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-[#0d0e12] font-mono text-[12.5px] sm:text-[13px] leading-relaxed shadow-sm w-full max-w-full min-w-0">
      <div className="flex items-center justify-between px-4 py-2 bg-[#16171d] border-b border-neutral-800 text-neutral-400 text-xs select-none">
        <span className="font-sans font-medium text-[11px] text-neutral-300 tracking-wide">
          {language || 'code'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-neutral-700/50 hover:text-white transition-colors cursor-pointer text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/60"
          title="Copy code to clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-teal-400" />
              <span className="text-teal-400">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      <div className="p-4 overflow-x-auto code-scrollbar text-[#e2e8f0]">
        <pre className="m-0 font-mono">
          <code className={language ? `hljs language-${language}` : 'hljs'}>{children}</code>
        </pre>
      </div>
    </div>
  );
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  return (
    <div className="chatgpt-markdown text-[14px] sm:text-[15px] leading-relaxed text-neutral-800 dark:text-neutral-200 break-words [overflow-wrap:anywhere] space-y-2.5 w-full min-w-0 max-w-full overflow-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex, [rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          pre({ children }) {
            return <>{children}</>;
          },
          code({ className, children, node, ...props }) {
            const match = /language-([^\s]+)/.exec(className || '');
            const rawCode = extractText(children).replace(/\n$/, '');
            const isMultiline =
              Boolean(match) ||
              Boolean(className && className.includes('hljs')) ||
              rawCode.includes('\n') ||
              (node?.position?.start?.line !== undefined &&
                node?.position?.end?.line !== undefined &&
                node.position.start.line !== node.position.end.line);

            if (!isMultiline) {
              return (
                <code
                  className="px-1.5 py-0.5 mx-0.5 rounded-md bg-neutral-100 dark:bg-[#202026] text-teal-700 dark:text-teal-300 font-mono text-[12.5px] border border-neutral-200 dark:border-neutral-700/60"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            const language = match ? match[1] : '';
            return (
              <CodeBlock language={language} rawCode={rawCode}>
                {children}
              </CodeBlock>
            );
          },
          h1({ children }) {
            return (
              <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 dark:text-white mt-4 mb-2 pb-1.5 border-b border-neutral-200 dark:border-neutral-800">
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
              <blockquote className="my-3 px-4 py-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-100/70 dark:bg-[#16161a] text-neutral-700 dark:text-neutral-300">
                {children}
              </blockquote>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto code-scrollbar my-3.5 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xs">
                <table className="min-w-full text-left text-xs sm:text-sm divide-y divide-neutral-200 dark:divide-neutral-800 bg-white dark:bg-[#121216] tabular-nums">
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
            const safeHref = href && /^https?:\/\//i.test(href) ? href : '#';
            return (
              <a
                href={safeHref}
                target="_blank"
                rel="noopener noreferrer"
                className="text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 underline underline-offset-2 transition-colors font-medium"
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
