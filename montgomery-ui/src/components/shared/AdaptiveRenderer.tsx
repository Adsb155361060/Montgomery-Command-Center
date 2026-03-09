/**
 * AdaptiveRenderer — universal fallback renderer for AI-generated JSON data.
 *
 * Renders any JSON object tree as flat, readable sections — tables, key-value
 * grids, and inline lists. Avoids deeply nested collapsible accordions.
 * Ensures ALL data from AI responses is visible without excessive clicking.
 */
import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

/* ─── Helpers ─── */

/** Try multiple keys on an object and return the first non-null/undefined/empty value */
export function pick(obj: any, ...keys: string[]): any {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return undefined;
}

/** Convert camelCase / snake_case / PascalCase key to readable Title Case */
export function labelify(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/_/g, ' ')
    .replace(/^\s/, '')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim();
}

/** Format a dollar value */
export function fmtDollars(n: number | string): string {
  const num = typeof n === 'string' ? parseFloat(n.replace(/[^0-9.-]/g, '')) : n;
  if (isNaN(num)) return String(n);
  if (num >= 1_000_000_000) return `$${(num / 1_000_000_000).toFixed(2)}B`;
  if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `$${(num / 1_000).toFixed(0)}K`;
  return `$${num.toLocaleString()}`;
}

/** Parse dollar strings like "$4.2M", "$500K", "$1,200,000" into numbers */
export function parseDollarStr(s: string): number {
  const match = String(s).match(/\$?([\d,.]+)\s*(B|billion|M|million|K|thousand)?/i);
  if (!match) return NaN;
  let val = parseFloat(match[1].replace(/,/g, ''));
  const unit = (match[2] || '').toLowerCase();
  if (unit === 'b' || unit === 'billion') val *= 1_000_000_000;
  else if (unit === 'm' || unit === 'million') val *= 1_000_000;
  else if (unit === 'k' || unit === 'thousand') val *= 1_000;
  return val;
}

/** Deep-extract: recursively sum all numeric fields matching a key pattern */
export function deepSum(obj: any, pattern: RegExp): number {
  if (!obj || typeof obj !== 'object') return 0;
  let total = 0;
  for (const [k, v] of Object.entries(obj)) {
    if (typeof v === 'number' && pattern.test(k)) total += v;
    else if (typeof v === 'object') total += deepSum(v, pattern);
  }
  return total;
}

/** Deep-find: find first value in nested object matching a key pattern */
export function deepFind(obj: any, pattern: RegExp): any {
  if (!obj || typeof obj !== 'object') return undefined;
  for (const [k, v] of Object.entries(obj)) {
    if (pattern.test(k) && v != null && v !== '') return v;
  }
  for (const v of Object.values(obj)) {
    if (typeof v === 'object') {
      const found = deepFind(v, pattern);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

/** Check if a value looks like a dollar amount */
function isDollar(key: string, value: any): boolean {
  if (typeof value === 'string' && /^\$/.test(value)) return true;
  const k = key.toLowerCase();
  return (k.includes('cost') || k.includes('revenue') || k.includes('value') || k.includes('budget') ||
    k.includes('investment') || k.includes('price') || k.includes('amount') || k.includes('fund') || k.includes('wage'));
}

/** Check if a key looks like a percentage */
function isPercent(key: string): boolean {
  const k = key.toLowerCase();
  return k.includes('percent') || k.includes('rate') || k.includes('ratio') || k.includes('change');
}

/* ─── Flat value formatter ─── */
function formatValue(key: string, value: any): string {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') {
    if (isDollar(key, value)) return fmtDollars(value);
    if (isPercent(key) && Math.abs(value) < 200) return `${value}%`;
    return value.toLocaleString();
  }
  return String(value);
}

/* ─── Flatten a nested object into a list of { path, key, value } entries ─── */
interface FlatEntry { path: string[]; key: string; value: any }

function flattenObject(obj: any, path: string[] = [], maxDepth = 6): FlatEntry[] {
  if (!obj || typeof obj !== 'object' || path.length >= maxDepth) return [];
  const result: FlatEntry[] = [];

  for (const [k, v] of Object.entries(obj)) {
    if (v === null || v === undefined || v === '') continue;
    const currentPath = [...path, k];

    if (Array.isArray(v)) {
      result.push({ path: currentPath, key: k, value: v });
    } else if (typeof v === 'object') {
      // Check if it's a "leaf" object (all primitive values)
      const entries = Object.entries(v!);
      const allPrimitive = entries.every(([, val]) => typeof val !== 'object' || val === null);
      if (allPrimitive) {
        result.push({ path: currentPath, key: k, value: v });
      } else {
        // Recurse but also collect any primitive children
        const primitives: Record<string, any> = {};
        const nested: [string, any][] = [];
        for (const [ck, cv] of entries) {
          if (cv !== null && cv !== undefined && cv !== '') {
            if (typeof cv === 'object') nested.push([ck, cv]);
            else primitives[ck] = cv;
          }
        }
        if (Object.keys(primitives).length > 0) {
          result.push({ path: currentPath, key: k, value: primitives });
        }
        for (const [ck, cv] of nested) {
          result.push(...flattenObject({ [ck]: cv }, currentPath, maxDepth));
        }
      }
    } else {
      result.push({ path: currentPath, key: k, value: v });
    }
  }
  return result;
}

/* ─── Group flat entries by top-level section ─── */
interface Section { title: string; entries: { label: string; value: any; depth: number }[] }

function groupIntoSections(entries: FlatEntry[]): Section[] {
  const sections: Map<string, Section> = new Map();

  for (const entry of entries) {
    const sectionKey = entry.path.length > 1 ? entry.path[0] : '_root';
    const sectionTitle = sectionKey === '_root' ? 'Overview' : labelify(sectionKey);

    if (!sections.has(sectionKey)) {
      sections.set(sectionKey, { title: sectionTitle, entries: [] });
    }

    const label = entry.path.length > 1
      ? entry.path.slice(1).map(labelify).join(' › ')
      : labelify(entry.key);

    sections.get(sectionKey)!.entries.push({
      label,
      value: entry.value,
      depth: entry.path.length - 1,
    });
  }
  return [...sections.values()];
}

/* ─── Render a primitive value with formatting ─── */
function RenderValue({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === '') return null;
  const str = String(value);

  if (typeof value === 'number' && isPercent(label)) {
    return <span className="text-slate-200 font-mono">{value}%</span>;
  }
  if (isDollar(label, value) && typeof value === 'number') {
    return <span className="text-emerald-400 font-mono">{fmtDollars(value)}</span>;
  }
  if (typeof value === 'string' && /^\$/.test(value)) {
    return <span className="text-emerald-400 font-mono">{value}</span>;
  }
  if (typeof value === 'boolean') {
    return <span className={value ? 'text-emerald-400' : 'text-red-400'}>{value ? 'Yes' : 'No'}</span>;
  }
  if (str.length > 200) {
    return <span className="text-slate-300 leading-relaxed">{str}</span>;
  }
  return <span className="text-slate-200">{str}</span>;
}

/* ─── Render a value cell (handles primitives, objects, arrays inline) ─── */
function ValueCell({ label, value }: { label: string; value: any }) {
  // Primitive
  if (typeof value !== 'object' || value === null) {
    return <RenderValue label={label} value={value} />;
  }

  // Array of primitives → pill tags inline
  if (Array.isArray(value) && value.every(i => typeof i !== 'object')) {
    return (
      <span className="inline-flex flex-wrap gap-1">
        {value.map((item, i) => (
          <span key={i} className="px-2 py-0.5 bg-slate-700/40 rounded text-slate-300 text-[11px]">{String(item)}</span>
        ))}
      </span>
    );
  }

  // Array of objects → mini rows
  if (Array.isArray(value)) {
    return (
      <div className="space-y-2 mt-1">
        {value.map((item, i) => (
          <div key={i} className="pl-3 border-l-2 border-slate-600/30">
            {typeof item === 'object' && item !== null ? (
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                {Object.entries(item).filter(([, v]) => v != null && v !== '').map(([k, v]) => (
                  <React.Fragment key={k}>
                    <span className="text-[11px] text-slate-500 font-medium">{labelify(k)}</span>
                    <span className="text-[11px] text-slate-300">{typeof v === 'object' ? <ValueCell label={k} value={v} /> : formatValue(k, v) || String(v)}</span>
                  </React.Fragment>
                ))}
              </div>
            ) : (
              <span className="text-[11px] text-slate-300">{String(item)}</span>
            )}
          </div>
        ))}
      </div>
    );
  }

  // Object → inline key-value pairs
  const entries = Object.entries(value).filter(([, v]) => v != null && v !== '');
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
      {entries.map(([k, v]) => (
        <React.Fragment key={k}>
          <span className="text-[11px] text-slate-500 font-medium">{labelify(k)}</span>
          <span className="text-[11px] text-slate-300">{typeof v === 'object' ? <ValueCell label={k} value={v} /> : formatValue(k, v) || String(v)}</span>
        </React.Fragment>
      ))}
    </div>
  );
}

/* ─── Section block — flat layout, no nesting ─── */
function SectionBlock({ section, defaultOpen }: { section: Section; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  // Separate primitives from complex entries
  const primitiveEntries = section.entries.filter(e => typeof e.value !== 'object');
  const complexEntries = section.entries.filter(e => typeof e.value === 'object');

  return (
    <div className="border border-slate-700/30 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-slate-800/30 transition-colors text-left"
      >
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">{section.title}</h4>
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500">{section.entries.length} fields</span>
          {open ? <ChevronUp className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 pt-2 space-y-3 border-t border-slate-700/20">
          {/* Primitive key-value pairs as a compact grid */}
          {primitiveEntries.length > 0 && (
            <div className={`grid gap-x-6 gap-y-1.5 ${primitiveEntries.length > 4 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'}`}>
              {primitiveEntries.map((e, i) => (
                <div key={i} className="flex items-baseline gap-2 text-xs py-0.5">
                  <span className="text-slate-500 font-medium whitespace-nowrap">{e.label}:</span>
                  <RenderValue label={e.label} value={e.value} />
                </div>
              ))}
            </div>
          )}

          {/* Complex values as labeled blocks */}
          {complexEntries.map((e, i) => (
            <div key={i} className="space-y-1">
              <h5 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{e.label}</h5>
              <div className="bg-slate-800/20 rounded-lg p-3">
                <ValueCell label={e.label} value={e.value} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Main Export ─── */

interface AdaptiveRendererProps {
  /** The raw AI response data object */
  data: any;
  /** Keys that have already been rendered elsewhere (skip them) */
  excludeKeys?: Set<string>;
  /** Title for the section */
  title?: string;
}

/**
 * Renders all unhandled fields from an AI response as structured UI.
 * Uses a flat layout with sections grouped by top-level key —
 * no deeply nested collapsible accordions.
 */
export function AdaptiveRenderer({ data, excludeKeys, title }: AdaptiveRendererProps) {
  if (!data || typeof data !== 'object') return null;

  // Filter excluded keys
  const filtered: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== null && v !== undefined && v !== '' && !(excludeKeys?.has(k))) {
      filtered[k] = v;
    }
  }
  if (Object.keys(filtered).length === 0) return null;

  // Flatten & group
  const flatEntries = flattenObject(filtered);
  const sections = groupIntoSections(flatEntries);

  if (sections.length === 0) return null;

  return (
    <div className="glass-card p-6 space-y-3">
      {title && <h3 className="text-sm font-semibold text-slate-300 mb-2">{title}</h3>}
      {sections.map((section, i) => (
        <SectionBlock
          key={section.title + i}
          section={section}
          defaultOpen={i < 3}
        />
      ))}
    </div>
  );
}

/**
 * Renders a flat key-value display of all primitive fields of an object.
 * Good for inline use within cards/table rows.
 */
export function RenderFields({ data, excludeKeys }: { data: any; excludeKeys?: Set<string> }) {
  if (!data || typeof data !== 'object') return null;
  const entries = Object.entries(data).filter(
    ([k, v]) => v !== null && v !== undefined && v !== '' &&
      typeof v !== 'object' && !(excludeKeys?.has(k))
  );
  if (entries.length === 0) return null;
  return (
    <div className="space-y-1 mt-2">
      {entries.map(([k, v]) => (
        <div key={k} className="text-xs flex gap-1.5">
          <span className="text-slate-500 font-medium">{labelify(k)}:</span>
          <RenderValue label={k} value={v} />
        </div>
      ))}
    </div>
  );
}

/**
 * Inline smart renderer: never shows raw JSON. Renders any value as nice UI.
 * Use this instead of `JSON.stringify(v)` in all pages.
 */
export function SmartValue({ label, value }: { label: string; value: any }) {
  if (value === null || value === undefined || value === '') return null;
  return <ValueCell label={label} value={value} />;
}

/**
 * Render any value as a string (for contexts that need a string, not JSX).
 * Never returns raw JSON. Summarizes objects/arrays intelligently.
 */
export function smartText(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return value.toLocaleString();
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    if (value.length === 0) return '';
    if (value.every(i => typeof i !== 'object')) return value.join(', ');
    // Array of objects: take first text-like field from each
    return value.map((item, i) => {
      if (typeof item !== 'object') return String(item);
      const text = Object.values(item).find(v => typeof v === 'string' && (v as string).length > 3);
      return text ? String(text) : `Item ${i + 1}`;
    }).join('; ');
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value).filter(([, v]) => v != null && v !== '');
    return entries.map(([k, v]) => `${labelify(k)}: ${typeof v === 'object' ? smartText(v) : v}`).join(', ');
  }
  return String(value);
}

export default AdaptiveRenderer;
