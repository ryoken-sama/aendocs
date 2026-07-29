interface StatCardProps {
  icon: string;
  label: string;
  value: number | null;
  loading: boolean;
  onClick: () => void;
}

/** One of the dashboard's 4 top-row stat cards — icon + label + a big
 * primary-pink number, or an animated placeholder while loading. Clicking
 * it navigates to the section that number came from. */
export function StatCard({ icon, label, value, loading, onClick }: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer rounded-xl border border-border bg-surface p-4 text-left transition-colors hover:border-primary/40 hover:bg-white/5"
    >
      <div className="flex items-center gap-2 text-sm text-muted">
        <i className={`${icon} text-lg leading-none`} aria-hidden="true" />
        <span>{label}</span>
      </div>
      {loading || value === null ? (
        <div className="mt-2 h-8 w-16 animate-pulse rounded bg-border" />
      ) : (
        <p className="mt-1 text-3xl font-bold text-primary">{value.toLocaleString()}</p>
      )}
    </button>
  );
}
