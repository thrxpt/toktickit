import { useRef } from "react";

// Keep the key across recoverable failures; reset after an acknowledged success
// so intentionally posting identical text again creates a new record.
export function useSubmissionKey() {
  const pending = useRef<{ body: string; key: string } | null>(null);
  return {
    forBody(body: string): string {
      if (!pending.current || pending.current.body !== body) {
        pending.current = { body, key: crypto.randomUUID() };
      }
      return pending.current.key;
    },
    reset() { pending.current = null; },
  };
}

const fileKeys = new WeakMap<File, string>();
export function fileSubmissionKey(file: File): string {
  let key = fileKeys.get(file);
  if (!key) {
    key = crypto.randomUUID();
    fileKeys.set(file, key);
  }
  return key;
}
