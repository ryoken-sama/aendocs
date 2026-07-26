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
        className="flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
      />
      <button
        type="button"
        onClick={pick}
        className="rounded-md bg-slate-200 px-3 py-2 text-sm font-medium hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600"
      >
        Browse…
      </button>
    </div>
  );
}
