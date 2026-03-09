export function SkeletonCard() {
  return (
    <div className="glass rounded-xl border border-slate-700/50 p-5">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl shimmer-bg" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 shimmer-bg rounded" />
          <div className="h-7 w-32 shimmer-bg rounded" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex gap-4 p-4 border-b border-slate-700/30">
      {[1,2,3,4].map(i => (
        <div key={i} className={`h-4 shimmer-bg rounded ${i === 1 ? 'w-24' : i === 2 ? 'w-32' : i === 3 ? 'flex-1' : 'w-16'}`} />
      ))}
    </div>
  );
}

export function SkeletonTable({ rows = 8 }: { rows?: number }) {
  return (
    <div className="glass rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="h-12 shimmer-bg" />
      {Array.from({ length: rows }).map((_, i) => <SkeletonRow key={i} />)}
    </div>
  );
}

export function SkeletonText({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={`h-4 shimmer-bg rounded ${i === lines - 1 ? 'w-2/3' : 'w-full'}`} />
      ))}
    </div>
  );
}
