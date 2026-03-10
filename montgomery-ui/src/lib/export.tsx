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
  style.id = 'mcc-print-style';
  style.textContent = `
    @media print {
      /* ── 1. Hide EVERYTHING first ── */
      body * {
        visibility: hidden !important;
      }

      /* ── 2. Completely remove sidebar, header, floating elements, buttons ── */
      nav,
      header,
      aside,
      .no-print,
      [class*="FloatingAi"],
      [class*="Onboarding"],
      [class*="sidebar"],
      [class*="Sidebar"] {
        display: none !important;
      }

      /* ── 3. Make main content visible ── */
      main,
      main * {
        visibility: visible !important;
      }

      /* ── 4. Position main as full-page content ── */
      main {
        position: fixed !important;
        left: 0 !important;
        top: 0 !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 32px 40px !important;
        background: white !important;
        z-index: 99999 !important;
        overflow: visible !important;
      }

      /* Remove sidebar offset */
      .ml-64, [class*="ml-64"] {
        margin-left: 0 !important;
      }

      /* ── 5. Hide interactive elements inside main ── */
      main button,
      main select,
      main input,
      main [class*="FilterBar"],
      main [class*="filter"],
      main [class*="Pagination"],
      main [class*="pagination"],
      main [class*="ExportButton"],
      main [class*="export"] {
        display: none !important;
      }

      /* ── 6. Print-friendly typography ── */
      main { font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif; }
      main, main * { color: #1e293b !important; }
      main h1, main h2, main h3, main h4 { color: #0f172a !important; font-weight: 700; }
      main h1 { font-size: 22px; margin-bottom: 4px; }
      main h2 { font-size: 18px; }
      main h3 { font-size: 15px; }
      main p, main span, main li, main td { font-size: 11px; line-height: 1.5; }
      main code { background: #f1f5f9; padding: 2px 6px; border-radius: 3px; font-size: 10px; }
      main a { color: #2563eb !important; text-decoration: underline; }

      /* ── 7. Clean up card backgrounds ── */
      main [class*="glass-card"],
      main [class*="bg-navy"],
      main [class*="bg-slate-8"],
      main [class*="bg-slate-9"],
      main [class*="bg-slate-7"] {
        background: white !important;
        border: 1px solid #e2e8f0 !important;
        box-shadow: none !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
      }

      /* ── 8. Tables ── */
      main table { border-collapse: collapse; width: 100%; page-break-inside: auto; }
      main thead { display: table-header-group; }
      main tr { page-break-inside: avoid; }
      main th, main td {
        border: 1px solid #cbd5e1;
        padding: 6px 8px;
        text-align: left;
        font-size: 10px;
      }
      main th { background: #f1f5f9 !important; font-weight: 600; color: #0f172a !important; }

      /* ── 9. Badges ── */
      main .badge, main [class*="badge"] {
        border: 1px solid #94a3b8 !important;
        background: #f8fafc !important;
        padding: 1px 5px;
        border-radius: 3px;
        font-size: 9px;
      }

      /* ── 10. Grid layouts → stack for print ── */
      main .grid {
        display: block !important;
      }
      main .grid > * {
        margin-bottom: 8px;
        page-break-inside: avoid;
      }

      /* ── 11. Also support explicit print-target (BriefingPage) ── */
      .print-target, .print-target * { visibility: visible !important; }

      /* ── 12. Title header ── */
      main::before {
        content: "${title}";
        display: block;
        font-size: 24px;
        font-weight: 700;
        color: #0f172a;
        border-bottom: 2px solid #e2e8f0;
        padding-bottom: 12px;
        margin-bottom: 20px;
      }

      @page {
        margin: 0.6in;
        size: A4;
      }
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
    <div ref={ref} className="relative no-print">
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
