import type { Translation } from "../core/types.js";

export async function loadFromPublic(
  locale: string,
  namespace: string,
): Promise<Translation | null> {
  try {
    const res = await fetch(`/locales/${locale}/${namespace}.json`);
    if (!res.ok) return null;
    return (await res.json()) as Translation;
  } catch {
    return null;
  }
}

export async function loadVersionFromPublic(): Promise<string | null> {
  try {
    const res = await fetch("/locales/version.json");
    if (!res.ok) return null;
    const data = (await res.json()) as { version: string };
    return data.version;
  } catch {
    return null;
  }
}
