/**
 * Export content as a downloadable file.
 */

/** Download a string as a file */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

/** Export raw markdown text as .md file */
export function exportAsMarkdown(content: string, filename = 'export') {
  downloadFile(content, `${filename}.md`, 'text/markdown');
}

/** Export raw text as .txt file */
export function exportAsText(content: string, filename = 'export') {
  // Strip markdown formatting for plain text
  const plain = content
    .replace(/#{1,6}\s+/g, '')       // headings
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/\*(.*?)\*/g, '$1')     // italic
    .replace(/`{1,3}(.*?)`{1,3}/gs, '$1') // code
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // links
    .replace(/^[-*+]\s+/gm, '• ')   // list items
    .replace(/^>\s+/gm, '  ')       // blockquotes
    .replace(/---+/g, '────────────────────'); // hr
  downloadFile(plain, `${filename}.txt`, 'text/plain');
}

/** Export as PDF by printing */
export function exportAsPDF(title: string) {
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      /* Hide sidebar, header, floating buttons, export menu */
      nav, header, aside,
      .no-print,
      [class*="FloatingAi"],
      [class*="sidebar"],
      button { visibility: hidden; height: 0; overflow: hidden; }

      /* Show the main content area */
      body, body * { visibility: visible; }
      main {
        position: absolute; left: 0; top: 0; width: 100%;
        margin: 0; padding: 40px;
        color: #1e293b; background: white;
        font-family: 'Georgia', serif;
      }
      main * { color: #334155; }
      main h1, main h2, main h3, main h4 { color: #0f172a; }
      main code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; }
      main a { color: #2563eb; }

      /* Also support the explicit print-target class for BriefingPage */
      .print-target, .print-target * { visibility: visible; }
      .print-target {
        position: absolute; left: 0; top: 0; width: 100%;
        padding: 40px; color: #1e293b; background: white;
        font-family: 'Georgia', serif;
      }

      /* Remove dark backgrounds and borders for print */
      [class*="glass-card"],
      [class*="bg-navy"],
      [class*="bg-slate-8"],
      [class*="bg-slate-9"] {
        background: white !important;
        border-color: #e2e8f0 !important;
      }

      /* Ensure tables and badges print legibly */
      table { border-collapse: collapse; width: 100%; }
      th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 11px; }
      th { background: #f1f5f9; font-weight: 600; }
      .badge { border: 1px solid #cbd5e1; padding: 2px 6px; border-radius: 4px; font-size: 10px; }

      /* Remove the sidebar margin */
      .ml-64, [class*="ml-64"] { margin-left: 0 !important; }

      .no-print { display: none !important; }
      @page { margin: 0.75in; }
    }
  `;
  document.head.appendChild(style);
  document.title = title;
  window.print();
  setTimeout(() => {
    document.head.removeChild(style);
    document.title = 'Montgomery Command Center';
  }, 500);
}

/**
 * ExportMenu button dropdown.
 */
import { useState, useRef, useEffect } from 'react';
import { Download, FileText, File, Printer } from 'lucide-react';

interface ExportButtonProps {
  content: string;
  filename?: string;
  title?: string;
  size?: 'sm' | 'md';
}

export function ExportButton({ content, filename = 'export', title = 'Export', size = 'sm' }: ExportButtonProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const btnClass = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-4 py-2 text-sm';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`${btnClass} flex items-center gap-1.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-slate-400 hover:text-white hover:border-slate-600 transition-all`}
      >
        <Download className={size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
        Export
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-44 bg-slate-800 border border-slate-700/50 rounded-xl shadow-2xl shadow-black/50 z-50 py-1 animate-slide-up">
          <button
            onClick={() => { exportAsMarkdown(content, filename); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 flex items-center gap-2 transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" /> Markdown (.md)
          </button>
          <button
            onClick={() => { exportAsText(content, filename); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 flex items-center gap-2 transition-colors"
          >
            <File className="w-3.5 h-3.5 text-emerald-400" /> Plain Text (.txt)
          </button>
          <button
            onClick={() => { exportAsPDF(title); setOpen(false); }}
            className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:bg-slate-700/50 flex items-center gap-2 transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-amber-400" /> Print / PDF
          </button>
        </div>
      )}
    </div>
  );
}
