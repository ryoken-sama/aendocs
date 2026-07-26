import type { DocRequirementStatus } from "../../types";
import { StatusBadge } from "../layout/StatusBadge";

export function ChecklistGrid({ items }: { items: DocRequirementStatus[] }) {
  return (
    <div className="rounded-md border border-slate-200 dark:border-slate-800">
      <ul className="divide-y divide-slate-200 dark:divide-slate-800">
        {items.map((item) => (
          <li
            key={item.category}
            className="flex items-center justify-between px-4 py-2.5 text-sm"
          >
            <span>{item.category}</span>
            <StatusBadge status={item.status} />
          </li>
        ))}
      </ul>
    </div>
  );
}
