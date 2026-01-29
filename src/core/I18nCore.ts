import type {
  I18nConfig,
  Listener,
  Locale,
  Namespace,
  Translation,
  Unsubscribe,
} from "./types.js";
import { startVersionCheck } from "./version-checker.js";
import { loadFromPublic } from "../utils/dynamic-import.js";
import { interpolate } from "../utils/interpolation.js";
import { getFromStorage, setToStorage } from "../utils/storage.js";

declare global {
  interface Window {
    __EDGE_I18N__?: {
      locale: string;
      namespaces: Record<string, Translation>;
    };
  }
}

const DEFAULT_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days
const DEFAULT_VERSION = "1.0.0";
const LOCALE_COOKIE = "locale";
const COOKIE_EXPIRATION_DAYS = 7;

export class I18nCore {
  private static instance: I18nCore | null = null;

  static getInstance(): I18nCore {
    if (!I18nCore.instance) {
      throw new Error(
        "I18nCore has not been initialized. Create an instance before calling getInstance().",
      );
    }
    return I18nCore.instance;
  }

  private config: I18nConfig;
  private locale: Locale;
  private memoryCache = new Map<string, Translation>();
  private loadedNamespaces = new Set<string>();
  private listeners = new Set<Listener>();
  private loadingPromises = new Map<string, Promise<void>>();
  private suspensePromises = new Map<string, Promise<void>>();
  private failedNamespaces = new Set<string>();
  private version = DEFAULT_VERSION;

  constructor(config: I18nConfig) {
    if (I18nCore.instance) {
      throw new Error(
        "I18nCore instance already exists. Only one instance is allowed.",
      );
    }
    I18nCore.instance = this;
    this.config = {
      enableBackgroundUpdates: true,
      cacheTTL: DEFAULT_TTL,
      versionCheckDelay: 5000,
      ...config,
    };

    // Hydrate from server injection
    if (typeof window !== "undefined" && window.__EDGE_I18N__) {
      const injected = window.__EDGE_I18N__;
      for (const [key, data] of Object.entries(injected.namespaces)) {
        this.memoryCache.set(key, data);
        const parts = key.split(":");
        if (parts[1]) this.loadedNamespaces.add(parts[1]);
      }
    }

    this.locale = this.detectLocale();
    this.initBackgroundUpdates();
  }

  private detectLocale(): Locale {
    if (typeof window !== "undefined" && window.__EDGE_I18N__?.locale) {
      return window.__EDGE_I18N__.locale;
    }

    const cookieLocale = this.getCookie(LOCALE_COOKIE);
    if (cookieLocale) return cookieLocale;

    // navigator.language
    if (typeof navigator !== "undefined") {
      const lang = navigator.language.split("-")[0];
      if (lang && this.isSupported(lang)) return lang;
    }

    return this.config.defaultLocale;
  }

  private isSupported(locale: string): boolean {
    return this.config.supportedLocales.includes(locale);
  }

  private cacheKey(locale: Locale, namespace: Namespace): string {
    return `${locale}:${namespace}`;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private initBackgroundUpdates(): void {
    startVersionCheck(
      this.config,
      this.locale,
      this.loadedNamespaces,
      (_ns, _data) => {
        // CDN updates are stored in localStorage, available on next session.
        // We don't re-render current session to avoid unexpected text changes.
      },
    );
  }

  subscribe = (listener: Listener): Unsubscribe => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getLocale = (): Locale => {
    return this.locale;
  };

  setLocale = (locale: Locale): void => {
    if (!this.isSupported(locale)) return;
    if (locale === this.locale) return;
    this.locale = locale;
    this.setCookie(LOCALE_COOKIE, locale, COOKIE_EXPIRATION_DAYS);
    this.suspensePromises.clear();
    this.failedNamespaces.clear();

    // Reload all previously loaded namespaces for the new locale
    for (const ns of this.loadedNamespaces) {
      this.loadNamespace(ns);
    }

    this.notify();
  };

  loadNamespace = (namespace: Namespace): Promise<void> => {
    const key = this.cacheKey(this.locale, namespace);

    // Already in memory
    if (this.memoryCache.has(key)) {
      this.loadedNamespaces.add(namespace);
      return Promise.resolve();
    }

    // Already loading
    const existing = this.loadingPromises.get(key);
    if (existing) return existing;

    const promise = this.resolveNamespace(this.locale, namespace, key);
    this.loadingPromises.set(key, promise);
    return promise;
  };

  loadNamespaces = (namespaces: Namespace[]): Promise<void[]> => {
    return Promise.all(namespaces.map((ns) => this.loadNamespace(ns)));
  };

  private async resolveNamespace(
    locale: Locale,
    namespace: Namespace,
    key: string,
  ): Promise<void> {
    try {
      // Tier 2: localStorage
      const ttl = this.config.cacheTTL ?? DEFAULT_TTL;
      const cached = getFromStorage(locale, namespace, ttl);
      if (cached) {
        this.memoryCache.set(key, cached);
        this.loadedNamespaces.add(namespace);
        this.notify();
        return;
      }

      // Tier 3: Dynamic import from /public
      const bundled = await loadFromPublic(locale, namespace);
      if (bundled) {
        this.memoryCache.set(key, bundled);
        this.loadedNamespaces.add(namespace);
        setToStorage(locale, namespace, bundled, this.version, "bundled");
        this.notify();
        return;
      }

      // Tier: Fallback locale
      if (this.config.fallbackLocale && locale !== this.config.fallbackLocale) {
        const fallbackKey = this.cacheKey(
          this.config.fallbackLocale,
          namespace,
        );
        if (!this.memoryCache.has(fallbackKey)) {
          const fallback = await loadFromPublic(
            this.config.fallbackLocale,
            namespace,
          );
          if (fallback) {
            this.memoryCache.set(fallbackKey, fallback);
            // Also set as current locale cache so t() finds it
            this.memoryCache.set(key, fallback);
            this.loadedNamespaces.add(namespace);
            this.notify();
            return;
          }
        } else {
          this.memoryCache.set(key, this.memoryCache.get(fallbackKey)!);
          this.loadedNamespaces.add(namespace);
          this.notify();
          return;
        }
      }
    } catch {
      // All loading failed, t() will return the key
      this.failedNamespaces.add(key);
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  t = (
    key: string,
    namespace: Namespace = "common",
    params?: Record<string, unknown>,
  ): string => {
    const cacheKey = this.cacheKey(this.locale, namespace);
    const translations = this.memoryCache.get(cacheKey);
    if (!translations) return key;

    // Support nested keys: "nav.home"
    const parts = key.split(".");
    let result: string | Translation = translations;
    for (const part of parts) {
      if (typeof result !== "object" || result === null) return key;
      result = result[part] as string | Translation;
      if (result === undefined) return key;
    }

    if (typeof result !== "string") return key;
    return interpolate(result, params);
  };

  getTranslation = (namespace: Namespace): Translation | undefined => {
    return this.memoryCache.get(this.cacheKey(this.locale, namespace));
  };

  isNamespaceLoaded = (namespace: Namespace): boolean => {
    return this.memoryCache.has(this.cacheKey(this.locale, namespace));
  };

  getSuspensePromise = (namespace: Namespace): Promise<void> | undefined => {
    const key = this.cacheKey(this.locale, namespace);

    if (this.memoryCache.has(key)) return undefined;
    if (this.failedNamespaces.has(key)) return undefined;

    const existing = this.suspensePromises.get(key);
    if (existing) return existing;

    const promise = this.loadNamespace(namespace).then(
      () => {
        this.suspensePromises.delete(key);
      },
      () => {
        this.suspensePromises.delete(key);
        this.failedNamespaces.add(key);
      },
    );

    this.suspensePromises.set(key, promise);
    return promise;
  };

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop()!.split(";").shift()!;

    return null;
  }

  private setCookie(name: string, value: string, days: number) {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
  }
}
