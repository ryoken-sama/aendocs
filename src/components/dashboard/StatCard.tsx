interface StatCardProps {
  icon: string;
  label: string;
  value: number | null;
  loading: boolean;
  loadingText: string;
  onClick: () => void;
}

/** One of the dashboard's 4 top-row stat cards — icon + label + a big
 * primary-pink number, or loading status text while its data is still in
 * flight. Clicking it navigates to the section that number came from. */
export function StatCard({ icon, label, value, loading, loadingText, onClick }: StatCardProps) {
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
        <p className="mt-2 text-xs text-muted">{loadingText}</p>
      ) : (
        <p className="mt-1 text-3xl font-bold text-primary">{value.toLocaleString()}</p>
      )}
    </button>
  );
}
