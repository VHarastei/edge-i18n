import { setToStorage, getSessionFlag, setSessionFlag } from "../utils/storage";
const VERSION_FILE_NAME = "version.json";
const SESSION_KEY = "edge-i18n:version-checked";
import type { Translation, VersionInfo } from "./types";

async function loadVersion(basePath: string): Promise<string | null> {
  try {
    const res = await fetch(`${basePath}/${VERSION_FILE_NAME}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { version: string };
    return data.version;
  } catch {
    return null;
  }
}

export interface VersionCheckDeps {
  config: {
    cdnEndpoint?: string;
  };
  locale: string;
  loadedNamespaces: Set<string>;
  storagePrefix: string;
  localeBasePath: string;
  debug?: boolean;
  onUpdate: (ns: string, data: Translation) => void;
}

function debugLog(enabled: boolean, msg: string, ...args: unknown[]): void {
  if (enabled) console.debug("[edge-i18n]", msg, ...args);
}

export async function startVersionCheck(deps: VersionCheckDeps): Promise<void> {
  const {
    config,
    locale,
    loadedNamespaces,
    storagePrefix,
    localeBasePath,
    debug = false,
    onUpdate,
  } = deps;

  if (!config.cdnEndpoint) return;
  if (typeof window === "undefined") return;

  if (getSessionFlag(SESSION_KEY)) {
    debugLog(debug, "version check skipped (already checked this session)");
    return;
  }

  debugLog(debug, "version check started");
  setSessionFlag(SESSION_KEY);

  try {
    const bundledVersion = await loadVersion(localeBasePath);

    const cdnRes = await fetch(`${config.cdnEndpoint}/${VERSION_FILE_NAME}`);
    if (!cdnRes.ok) return;
    const cdnInfo: VersionInfo = await cdnRes.json();

    if (!bundledVersion || cdnInfo.version > bundledVersion) {
      debugLog(debug, "cdn version newer", {
        bundled: bundledVersion,
        cdn: cdnInfo.version,
      });

      for (const ns of cdnInfo.updatedNamespaces) {
        if (!loadedNamespaces.has(ns)) continue;
        try {
          const nsRes = await fetch(
            `${config.cdnEndpoint}/${locale}/${ns}.json`,
          );
          if (!nsRes.ok) continue;
          const data: Translation = await nsRes.json();
          setToStorage(storagePrefix, locale, ns, data);
          debugLog(debug, "cdn namespace updated", ns);
          onUpdate(ns, data);
        } catch {
          // Skip this namespace, use bundled
        }
      }
    }
  } catch (err) {
    debugLog(debug, "version check failed", err);
  }
}
