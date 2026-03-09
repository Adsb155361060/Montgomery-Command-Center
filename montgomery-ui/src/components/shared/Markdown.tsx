import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownProps {
  children: string;
  /** sm = 13px, base = 14px (default), lg = 15px */
  size?: 'sm' | 'base' | 'lg';
  className?: string;
}

/**
 * Renders markdown text with styled headings, lists, bold, links, code blocks, and tables.
 * Drop-in replacement for raw `<p>{text}</p>` when displaying AI responses.
 */
export function Markdown({ children, size = 'base', className = '' }: MarkdownProps) {
  const fontClass = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-[15px]' : 'text-sm';

  return (
    <div className={`markdown-body ${fontClass} ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        h1: ({ children }) => <h1 className="text-xl font-bold text-white mt-5 mb-3 pb-2 border-b border-slate-700/50">{children}</h1>,
        h2: ({ children }) => <h2 className="text-lg font-bold text-white mt-4 mb-2">{children}</h2>,
        h3: ({ children }) => <h3 className="text-base font-semibold text-slate-200 mt-3 mb-1.5">{children}</h3>,
        h4: ({ children }) => <h4 className="text-sm font-semibold text-slate-300 mt-2 mb-1">{children}</h4>,
        p: ({ children }) => <p className="text-slate-300 leading-relaxed mb-3 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
        em: ({ children }) => <em className="text-slate-400 italic">{children}</em>,
        a: ({ href, children }) => (
          <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors">
            {children}
          </a>
        ),
        ul: ({ children }) => <ul className="list-disc list-outside ml-5 space-y-1 mb-3 text-slate-300">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside ml-5 space-y-1 mb-3 text-slate-300">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed pl-1">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-3 border-amber-500/50 pl-4 py-1 my-3 bg-amber-500/5 rounded-r-lg text-slate-400 italic">
            {children}
          </blockquote>
        ),
        code: ({ className, children }) => {
          const isInline = !className;
          if (isInline) {
            return <code className="px-1.5 py-0.5 bg-slate-800 border border-slate-700/50 rounded text-amber-300 text-[0.85em] font-mono">{children}</code>;
          }
          return (
            <pre className="bg-slate-800/80 border border-slate-700/50 rounded-xl p-4 my-3 overflow-x-auto">
              <code className="text-xs font-mono text-slate-300 leading-relaxed">{children}</code>
            </pre>
          );
        },
        hr: () => <hr className="border-slate-700/50 my-4" />,
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-xl border border-slate-700/50">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-slate-800/50 text-slate-300">{children}</thead>,
        th: ({ children }) => <th className="px-3 py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{children}</th>,
        td: ({ children }) => <td className="px-3 py-2 text-slate-300 border-t border-slate-700/30">{children}</td>,
      }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
