export type Locale = string;
export type Namespace = string;

export interface Translation {
  [key: string]: string | Translation;
}

export interface I18nConfig {
  /** Remote CDN endpoint for fetching updated translations. If omitted, background version checks are disabled. */
  cdnEndpoint?: string;
  /** The default locale to use when no detector matches. */
  defaultLocale: Locale;
  /** List of all locale codes the application supports. */
  supportedLocales: Locale[];
  /** Locale to fall back to when a namespace is missing for the current locale. */
  fallbackLocale?: Locale;
  /** How long cached translations stay valid in localStorage, in milliseconds. @default 604800000 (7 days) */
  cacheTTL?: number;
  /** Delay in milliseconds before the background CDN version check fires. @default 5000 */
  versionCheckDelay?: number;
  /** Name of the cookie used to persist the user's selected locale. @default "locale" */
  localeCookieName?: string;
  /** How many days the locale cookie stays valid. @default 7 */
  cookieMaxAgeDays?: number;
  /** Key prefix used for localStorage entries. @default "edge-i18n:" */
  storagePrefix?: string;
  /** Base path for fetching bundled locale JSON files. @default "/locales" */
  localeBasePath?: string;
  /** Namespace used by `t()` when none is specified. @default "common" */
  defaultNamespace?: string;
  /** Custom locale detectors. If omitted, built-in detectors (cookie, navigator) are used. */
  localeDetectors?: LocaleDetector[];
  /** Enable debug logging to the console. @default false */
  debug?: boolean;
}

export interface CacheEntry {
  data: Translation;
  timestamp: number;
}

export interface VersionInfo {
  version: string;
  timestamp: number;
  locales?: string[];
  namespaces?: string[];
  updatedNamespaces: string[];
}

export type Listener = () => void;
export type Unsubscribe = () => void;

export interface LocaleDetector {
  name: string;
  detect(): Locale | null;
}


declare global {
  interface Window {
    __EDGE_I18N__?: {
      locale: string;
      namespaces: Record<string, Translation>;
    };
  }
}

export interface I18nResolvedConfig {
  cdnEndpoint?: string;
  defaultLocale: Locale;
  supportedLocales: Locale[];
  fallbackLocale?: Locale;
  cacheTTL: number;
  versionCheckDelay: number;
  localeCookieName: string;
  cookieMaxAgeDays: number;
  storagePrefix: string;
  localeBasePath: string;
  defaultNamespace: string;
  debug: boolean;
}