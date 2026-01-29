import type { CacheEntry, Translation } from "../core/types.js";

const PREFIX = "edge-i18n:";

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
  locale: string,
  namespace: string,
  ttl: number,
): Translation | null {
  if (!storageAvailable) return null;
  try {
    const raw = localStorage.getItem(`${PREFIX}${locale}:${namespace}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttl) {
      localStorage.removeItem(`${PREFIX}${locale}:${namespace}`);
      return null;
    }
    return entry.data;
  } catch {
    return null;
  }
}

export function setToStorage(
  locale: string,
  namespace: string,
  data: Translation,
  version: string,
  source: "bundled" | "cdn",
): void {
  if (!storageAvailable) return;
  try {
    const entry: CacheEntry = {
      data,
      timestamp: Date.now(),
      version,
      source,
    };
    localStorage.setItem(
      `${PREFIX}${locale}:${namespace}`,
      JSON.stringify(entry),
    );
  } catch {
    // Quota exceeded or other error - silently skip
  }
}

export function getSessionFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(`${PREFIX}${key}`) === "1";
  } catch {
    return false;
  }
}

export function setSessionFlag(key: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${PREFIX}${key}`, "1");
  } catch {
    // silently skip
  }
}
