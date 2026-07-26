import { useEffect, useState } from "react";
import { listenToDownloadProgress } from "../lib/events";
import type { ProgressEvent } from "../types";

/** Subscribes to progress events for a single student, filtering out any
 * cross-talk from other/stale download jobs. Resets when `studentId` changes. */
export function useProgressLog(studentId: string) {
  const [lines, setLines] = useState<ProgressEvent[]>([]);

  useEffect(() => {
    setLines([]);
    let unlisten: (() => void) | undefined;
    listenToDownloadProgress((event) => {
      if (event.student_id !== studentId) return;
      setLines((prev) => [...prev, event]);
    }).then((fn) => {
      unlisten = fn;
    });
    return () => {
      unlisten?.();
    };
  }, [studentId]);

  return { lines, setLines };
}
