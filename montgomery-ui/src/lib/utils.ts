import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatNumber(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return v.toLocaleString();
  return String(v);
}

export function formatCurrency(n: number | null | undefined): string {
  const v = Number(n);
  if (!Number.isFinite(v)) return '$0';
  if (v >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v.toFixed(0)}`;
}

export function formatPercent(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export function getModuleColor(module: string): string {
  const colors: Record<string, string> = {
    sentinel: '#ef4444',
    youthshield: '#a855f7',
    blight: '#3b82f6',
    compass: '#10b981',
    command: '#f59e0b',
  };
  return colors[module] || '#94a3b8';
}

export function getModuleBgClass(module: string): string {
  const classes: Record<string, string> = {
    sentinel: 'bg-sentinel-500/10 border-sentinel-500/30',
    youthshield: 'bg-youthshield-500/10 border-youthshield-500/30',
    blight: 'bg-blight-500/10 border-blight-500/30',
    compass: 'bg-compass-500/10 border-compass-500/30',
  };
  return classes[module] || 'bg-slate-500/10 border-slate-500/30';
}

export function getSeverityColor(severity: string): string {
  const s = severity.toLowerCase();
  if (s === 'critical' || s === 'high') return 'text-red-400 bg-red-500/20';
  if (s === 'medium' || s === 'warning') return 'text-amber-400 bg-amber-500/20';
  if (s === 'low') return 'text-emerald-400 bg-emerald-500/20';
  return 'text-slate-400 bg-slate-500/20';
}

export function timeAgo(date: string): string {
  const now = new Date();
  const then = new Date(date);
  const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return then.toLocaleDateString();
}
