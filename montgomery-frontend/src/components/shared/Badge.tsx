interface BadgeProps {
  label: string;
  color?: 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'slate' | 'orange';
}

const colorMap = {
  red: 'bg-red-500/15 text-red-400 border-red-500/30',
  amber: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  green: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  blue: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  purple: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  slate: 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  orange: 'bg-orange-500/15 text-orange-400 border-orange-500/30',
};

export function severityColor(severity: string): 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'slate' | 'orange' {
  const map: Record<string, 'red' | 'amber' | 'green' | 'blue' | 'purple' | 'slate' | 'orange'> = {
    critical: 'red', high: 'orange', medium: 'amber', low: 'blue',
    open: 'red', closed: 'green', pending: 'amber', active: 'green', inactive: 'slate',
    compliant: 'green', 'non-compliant': 'red',
  };
  return map[severity?.toLowerCase()] ?? 'slate';
}

export default function Badge({ label, color = 'slate' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${colorMap[color]}`}>
      {label}
    </span>
  );
}
