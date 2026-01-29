import type { I18nConfig, Translation, VersionInfo } from "./types.js";
import { setToStorage } from "../utils/storage.js";
import { loadVersionFromPublic } from "../utils/dynamic-import.js";
import { getSessionFlag, setSessionFlag } from "../utils/storage.js";

const SESSION_KEY = "version-checked";

export function startVersionCheck(
  config: I18nConfig,
  locale: string,
  loadedNamespaces: Set<string>,
  onUpdate: (ns: string, data: Translation) => void,
): void {
  if (!config.enableBackgroundUpdates) return;
  if (typeof window === "undefined") return;
  if (getSessionFlag(SESSION_KEY)) return;

  const delay = config.versionCheckDelay ?? 5000;

  setTimeout(async () => {
    setSessionFlag(SESSION_KEY);
    try {
      const bundledVersion = await loadVersionFromPublic();

      const cdnRes = await fetch(
        `${config.cdnEndpoint}/version.json`,
      );
      if (!cdnRes.ok) return;
      const cdnInfo: VersionInfo = await cdnRes.json();

      if (!bundledVersion || cdnInfo.version > bundledVersion) {
        // Fetch updated namespaces in background
        for (const ns of cdnInfo.updatedNamespaces) {
          if (!loadedNamespaces.has(ns)) continue;
          try {
            const nsRes = await fetch(
              `${config.cdnEndpoint}/${locale}/${ns}.json`,
            );
            if (!nsRes.ok) continue;
            const data: Translation = await nsRes.json();
            setToStorage(locale, ns, data, cdnInfo.version, "cdn");
            onUpdate(ns, data);
          } catch {
            // Skip this namespace, use bundled
          }
        }
      }
    } catch {
      // CDN unreachable, use bundled translations
    }
  }, delay);
}
