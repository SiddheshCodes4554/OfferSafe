import type { RedFlag } from '../api';

interface RedFlagListProps {
  flags: RedFlag[];
}

export default function RedFlagList({ flags }: RedFlagListProps) {
  if (flags.length === 0) {
    return (
      <div className="animate-fade-in-up rounded-xl border border-success/20 bg-success-soft/10 px-5 py-4 text-center">
        <p className="text-success font-medium">✓ No red-flag keywords detected</p>
        <p className="text-sm text-text-muted mt-1">The document does not contain common scam phrases</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-danger text-lg">⚠</span>
        <h3 className="text-sm font-semibold uppercase tracking-widest text-text-secondary">
          Red-Flag Keywords
          <span className="ml-2 text-xs font-normal text-text-muted">({flags.length} found)</span>
        </h3>
      </div>

      <div className="flex flex-wrap gap-2">
        {flags.map((flag) => (
          <span
            key={flag.keyword}
            className="
              inline-flex items-center gap-1.5
              rounded-lg border border-danger/20
              bg-danger-soft/20 px-3 py-1.5
              text-sm text-danger font-medium
              transition-colors hover:bg-danger-soft/35
            "
          >
            {flag.keyword}
            {flag.count > 1 && (
              <span className="ml-0.5 rounded-full bg-danger/20 px-1.5 py-0.5 text-xs tabular-nums">
                ×{flag.count}
              </span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}
