import { Combobox } from "./Combobox";

export interface StudentFilters {
  branch: string;
  country: string;
  university: string;
  status: string;
}

interface FilterBarProps {
  options: {
    branch: string[];
    country: string[];
    university: string[];
    status: string[];
  };
  filters: StudentFilters;
  onChange: (field: keyof StudentFilters, value: string) => void;
}

export function FilterBar({ options, filters, onChange }: FilterBarProps) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Combobox
        label="Branch"
        options={options.branch}
        value={filters.branch}
        onChange={(v) => onChange("branch", v)}
      />
      <Combobox
        label="Country"
        options={options.country}
        value={filters.country}
        onChange={(v) => onChange("country", v)}
      />
      <Combobox
        label="University"
        options={options.university}
        value={filters.university}
        onChange={(v) => onChange("university", v)}
      />
      <Combobox
        label="Status"
        options={options.status}
        value={filters.status}
        onChange={(v) => onChange("status", v)}
      />
    </div>
  );
}
