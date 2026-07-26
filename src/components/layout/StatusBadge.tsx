import type { DocStatus } from "../../types";

const ICONS: Record<DocStatus, string> = {
  present: "✅",
  missing: "❌",
  not_required: "➖",
};

const LABELS: Record<DocStatus, string> = {
  present: "Present",
  missing: "Missing",
  not_required: "Not required",
};

export function StatusBadge({ status }: { status: DocStatus }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm">
      <span aria-hidden="true">{ICONS[status]}</span>
      <span>{LABELS[status]}</span>
    </span>
  );
}
