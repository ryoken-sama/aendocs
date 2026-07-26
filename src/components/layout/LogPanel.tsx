import { useEffect, useRef } from "react";
import type { ProgressEvent, ProgressLevel } from "../../types";

const LEVEL_COLOR: Record<ProgressLevel, string> = {
  info: "text-slate-600 dark:text-slate-300",
  success: "text-green-600",
  warn: "text-amber-600",
  error: "text-red-600",
};

export function LogPanel({ lines }: { lines: ProgressEvent[] }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [lines.length]);

  if (lines.length === 0) return null;

  return (
    <div className="mt-3 max-h-56 overflow-y-auto rounded-md border border-slate-200 bg-slate-50 p-3 font-mono text-xs dark:border-slate-800 dark:bg-slate-950">
      {lines.map((line, i) => (
        <div key={i} className={LEVEL_COLOR[line.level]}>
          {line.message}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}
