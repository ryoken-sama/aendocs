import { Combobox, type ComboOption } from "./Combobox";
import type { FilterOption } from "../../types";

export interface StudentFilters {
  branchId: string;
  agentId: string;
  countryId: string;
  institutionId: string;
  status: string;
}

interface FilterBarProps {
  options: {
    branch: FilterOption[];
    agent: FilterOption[];
    country: FilterOption[];
    institution: FilterOption[];
    status: string[];
  };
  filters: StudentFilters;
  onChange: (field: keyof StudentFilters, value: string) => void;
}

function toComboOptions(options: FilterOption[]): ComboOption[] {
  return options.map((o) => ({ value: o.id, label: o.name }));
}

function statusToComboOptions(options: string[]): ComboOption[] {
  return options.map((s) => ({ value: s, label: s }));
}

export function FilterBar({ options, filters, onChange }: FilterBarProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Combobox
        label="Branch"
        options={toComboOptions(options.branch)}
        value={filters.branchId}
        onChange={(v) => onChange("branchId", v)}
      />
      <Combobox
        label="Agent"
        options={toComboOptions(options.agent)}
        value={filters.agentId}
        onChange={(v) => onChange("agentId", v)}
      />
      <Combobox
        label="Country"
        options={toComboOptions(options.country)}
        value={filters.countryId}
        onChange={(v) => onChange("countryId", v)}
      />
      <Combobox
        label="Institution"
        options={toComboOptions(options.institution)}
        value={filters.institutionId}
        onChange={(v) => onChange("institutionId", v)}
      />
      <Combobox
        label="Status"
        options={statusToComboOptions(options.status)}
        value={filters.status}
        onChange={(v) => onChange("status", v)}
      />
    </div>
  );
}
