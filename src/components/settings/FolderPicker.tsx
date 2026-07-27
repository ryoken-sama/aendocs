import { open } from "@tauri-apps/plugin-dialog";

interface FolderPickerProps {
  value: string;
  onChange: (path: string) => void;
}

export function FolderPicker({ value, onChange }: FolderPickerProps) {
  async function pick() {
    const selected = await open({ directory: true, multiple: false });
    if (typeof selected === "string") {
      onChange(selected);
    }
  }

  return (
    <div className="flex gap-2">
      <input
        type="text"
        readOnly
        value={value}
        placeholder="Choose an output folder..."
        className="flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-primary"
      />
      <button
        type="button"
        onClick={pick}
        className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-ink hover:bg-white/5"
      >
        Browse…
      </button>
    </div>
  );
}
