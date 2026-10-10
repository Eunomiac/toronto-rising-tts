import { useState } from "react";

/**
 * A small UI preference kept in this browser's local storage (which roster tab is open, and so on), so it
 * survives a reload. Not for chronicle data: that lives in the dashboard's data files.
 */
export const usePersistentState = <T extends string | boolean>(key: string, initial: T, allowed?: readonly T[]): [T, (next: T) => void] => {
  const [value, setValue] = useState<T>(() => {
    const stored = window.localStorage.getItem(key);
    if (stored === null) {
      return initial;
    }
    const parsed = JSON.parse(stored) as unknown;
    return typeof parsed === typeof initial && (!allowed || allowed.includes(parsed as T)) ? (parsed as T) : initial;
  });
  const set = (next: T): void => {
    window.localStorage.setItem(key, JSON.stringify(next));
    setValue(next);
  };
  return [value, set];
};
