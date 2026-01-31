import type { CacheEntry, Translation } from "../core/types.js";

function isStorageAvailable(): boolean {
  try {
    const key = "__edge_i18n_test__";
    localStorage.setItem(key, "1");
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

const storageAvailable = typeof window !== "undefined" && isStorageAvailable();

export function getFromStorage(
  prefix: string,
  locale: string,
  namespace: string,
  ttl: number,
): Translation | null {
  if (!storageAvailable) return null;
  try {
    const raw = localStorage.getItem(`${prefix}${locale}:${namespace}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttl) {
      localStorage.removeItem(`${prefix}${locale}:${namespace}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setToStorage(
  prefix: string,
  locale: string,
  namespace: string,
  data: Translation,
): void {
  if (!storageAvailable) return;
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(
      `${prefix}${locale}:${namespace}`,
      JSON.stringify(entry),
    );
  } catch {
    // Quota exceeded or other error - silently skip
  }
}
