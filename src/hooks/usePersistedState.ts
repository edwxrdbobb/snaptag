import { useEffect, useState } from "react";

// A useState that caches its value in localStorage, so UI preferences (like the
// chosen map style) survive navigation and full page reloads.
export function usePersistedState<T>(key: string, defaultValue: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw !== null ? (JSON.parse(raw) as T) : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Ignore write failures (e.g. private mode / storage full).
    }
  }, [key, value]);

  return [value, setValue] as const;
}
