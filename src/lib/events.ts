import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import type { ProgressEvent } from "../types";

export function listenToDownloadProgress(
  callback: (event: ProgressEvent) => void,
): Promise<UnlistenFn> {
  return listen<ProgressEvent>("download-progress", (e) => callback(e.payload));
}
