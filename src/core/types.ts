export type Locale = string;
export type Namespace = string;

export interface Translation {
  [key: string]: string | Translation;
}

export interface I18nConfig {
  cdnEndpoint: string;
  defaultLocale: Locale;
  supportedLocales: Locale[];
  fallbackLocale?: Locale;
  cacheTTL?: number;
  versionCheckDelay?: number;
  enableBackgroundUpdates?: boolean;
}

export interface CacheEntry {
  data: Translation;
  timestamp: number;
  version: string;
  source: "bundled" | "cdn";
}

export interface VersionInfo {
  version: string;
  timestamp: number;
  updatedNamespaces: string[];
}

export type Listener = () => void;
export type Unsubscribe = () => void;
