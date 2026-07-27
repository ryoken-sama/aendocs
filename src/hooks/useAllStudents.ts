import { useEffect, useState } from "react";
import { searchStudents } from "../lib/tauri";
import type { StudentSummary } from "../types";

const INITIAL_LENGTH = 20;
const BACKGROUND_PAGE_LENGTH = 50;
const CONCURRENCY = 5;

/**
 * Progressively loads every student record into a local store:
 * 1. Fetches a small first page immediately so the UI has something to show.
 * 2. Fetches the rest in the background, in concurrent batches of 5
 *    requests of 50 records each, appending as each batch resolves.
 *
 * Once this completes, the caller has the full dataset in memory and can
 * search/filter/paginate it purely client-side — no further server
 * roundtrips are needed.
 */
export function useAllStudents() {
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [backgroundLoading, setBackgroundLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setError(null);
      try {
        const first = await searchStudents("", 0, INITIAL_LENGTH);
        if (cancelled) return;
        setStudents(first.students);
        setTotalCount(first.records_total);
        setLoadedCount(first.students.length);

        const total = first.records_total;
        if (first.students.length >= total) {
          return;
        }

        setBackgroundLoading(true);
        const offsets: number[] = [];
        for (let start = INITIAL_LENGTH; start < total; start += BACKGROUND_PAGE_LENGTH) {
          offsets.push(start);
        }

        for (let i = 0; i < offsets.length; i += CONCURRENCY) {
          if (cancelled) return;
          const batch = offsets.slice(i, i + CONCURRENCY);
          const results = await Promise.all(
            batch.map((start) =>
              searchStudents("", start, Math.min(BACKGROUND_PAGE_LENGTH, total - start)),
            ),
          );
          if (cancelled) return;

          setStudents((prev) => prev.concat(...results.map((r) => r.students)));
          setLoadedCount((prev) => prev + results.reduce((sum, r) => sum + r.students.length, 0));
        }
      } catch (e) {
        if (!cancelled) setError(String(e));
      } finally {
        if (!cancelled) setBackgroundLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  return { students, loadedCount, totalCount, backgroundLoading, error };
}
