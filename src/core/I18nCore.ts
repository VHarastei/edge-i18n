import { interpolate } from "../utils/interpolation";
import { getFromStorage, setToStorage } from "../utils/storage";
import {
  COOKIE_MAX_AGE_DAYS,
  DEFAULT_CACHE_TTL,
  DEFAULT_LOCALE_BASE_PATH,
  DEFAULT_NAMESPACE,
  DEFAULT_VERSION_CHECK_DELAY,
  LOCALE_COOKIE_NAME,
  MS_PER_DAY,
  STORAGE_PREFIX,
} from "./constants";
import { createBuiltInDetectors } from "./locale-detectors";
import type {
  I18nConfig,
  I18nResolvedConfig,
  Listener,
  Locale,
  LocaleDetector,
  Namespace,
  Translation,
  Unsubscribe,
} from "./types";

function resolveConfig(config: I18nConfig): I18nResolvedConfig {
  return {
    cdnEndpoint: config.cdnEndpoint,
    defaultLocale: config.defaultLocale,
    supportedLocales: config.supportedLocales,
    fallbackLocale: config.fallbackLocale,
    cacheTTL: config.cacheTTL ?? DEFAULT_CACHE_TTL,
    versionCheckDelay: config.versionCheckDelay ?? DEFAULT_VERSION_CHECK_DELAY,
    localeCookieName: config.localeCookieName ?? LOCALE_COOKIE_NAME,
    cookieMaxAgeDays: config.cookieMaxAgeDays ?? COOKIE_MAX_AGE_DAYS,
    storagePrefix: config.storagePrefix ?? STORAGE_PREFIX,
    localeBasePath: config.localeBasePath ?? DEFAULT_LOCALE_BASE_PATH,
    defaultNamespace: config.defaultNamespace ?? DEFAULT_NAMESPACE,
    debug: config.debug ?? false,
  };
}

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

  private resolved!: I18nResolvedConfig;
  private locale!: Locale;
  private memoryCache = new Map<string, Translation>();
  private loadedNamespaces = new Set<string>();
  private listeners = new Set<Listener>();
  private loadingPromises = new Map<string, Promise<void>>();
  private suspensePromises = new Map<string, Promise<void>>();
  private failedNamespaces = new Set<string>();

  private detectors!: LocaleDetector[];

  private isValidNamespace(ns: string): boolean {
    return /^[\w-]+$/.test(ns);
  }

  constructor(config: I18nConfig) {
    if (I18nCore.instance) {
      // biome-ignore lint/correctness/noConstructorReturn: Required for HMR singleton pattern
      return I18nCore.instance;
    }
    I18nCore.instance = this;

    this.resolved = resolveConfig(config);

    this.detectors =
      config.localeDetectors ??
      createBuiltInDetectors(
        this.resolved.localeCookieName,
        this.resolved.supportedLocales,
      );

    this.hydrateFromServer();
    this.locale = this.detectLocale();
    this.debugLog("initialized", { locale: this.locale });
    this.initBackgroundUpdates();
  }

  private debugLog(msg: string, ...args: unknown[]): void {
    if (this.resolved.debug) {
      console.debug("[edge-i18n]", msg, ...args);
    }
  }

  private hydrateFromServer(): void {
    if (typeof window !== "undefined" && window.__EDGE_I18N__) {
      const injected = window.__EDGE_I18N__;
      for (const [key, data] of Object.entries(injected.namespaces)) {
        this.memoryCache.set(key, data);
        const parts = key.split(":");
        if (parts[1]) this.loadedNamespaces.add(parts[1]);
      }
    }
  }

  private detectLocale(): Locale {
    for (const detector of this.detectors) {
      const result = detector.detect();
      if (result && this.isSupported(result)) return result;
    }
    return this.resolved.defaultLocale;
  }

  private isSupported(locale: string): boolean {
    return this.resolved.supportedLocales.includes(locale);
  }

  private cacheKey(locale: Locale, namespace: Namespace): string {
    return `${locale}:${namespace}`;
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  private persistLocaleCookie(locale: Locale): void {
    if (typeof document === "undefined") return;
    const expires = new Date(
      Date.now() + this.resolved.cookieMaxAgeDays * MS_PER_DAY,
    ).toUTCString();
    // biome-ignore lint/suspicious/noDocumentCookie: Cookie Store API has limited browser support
    document.cookie = `${this.resolved.localeCookieName}=${locale}; expires=${expires}; path=/; SameSite=Lax`;
  }

  private initBackgroundUpdates(): void {
    if (!this.resolved.cdnEndpoint) return;

    setTimeout(() => {
      import("./version-checker").then(({ startVersionCheck }) => {
        startVersionCheck({
          config: {
            cdnEndpoint: this.resolved.cdnEndpoint,
          },
          locale: this.locale,
          loadedNamespaces: this.loadedNamespaces,
          storagePrefix: this.resolved.storagePrefix,
          localeBasePath: this.resolved.localeBasePath,
          debug: this.resolved.debug,
          onUpdate: (_ns, _data) => {
            this.debugLog("cdn update stored", _ns);
          },
        });
      });
    }, this.resolved.versionCheckDelay);
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
    const oldLocale = this.locale;
    this.locale = locale;
    this.debugLog("locale changed", { from: oldLocale, to: locale });
    this.persistLocaleCookie(locale);
    this.suspensePromises.clear();
    this.failedNamespaces.clear();

    // Reload all previously loaded namespaces for the new locale
    for (const ns of this.loadedNamespaces) {
      this.loadNamespace(ns);
    }

    this.notify();
  };

  loadNamespace = (namespace: Namespace): Promise<void> => {
    if (!this.isValidNamespace(namespace)) {
      return Promise.reject(new Error(`Invalid namespace: ${namespace}`));
    }

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

  loadNamespaces = (namespaces: Namespace[]): Promise<Array<void>> => {
    return Promise.all(namespaces.map((ns) => this.loadNamespace(ns)));
  };

  private async fetchNamespace(
    locale: Locale,
    namespace: Namespace,
  ): Promise<Translation | null> {
    try {
      const res = await fetch(
        `${this.resolved.localeBasePath}/${locale}/${namespace}.json`,
      );
      if (!res.ok) return null;
      return (await res.json()) as Translation;
    } catch {
      return null;
    }
  }

  private async resolveNamespace(
    locale: Locale,
    namespace: Namespace,
    key: string,
  ): Promise<void> {
    try {
      // Tier 2: localStorage
      const cached = getFromStorage(
        this.resolved.storagePrefix,
        locale,
        namespace,
        this.resolved.cacheTTL,
      );
      if (cached) {
        this.memoryCache.set(key, cached);
        this.loadedNamespaces.add(namespace);
        this.debugLog("namespace loaded from cache", namespace);
        this.notify();
        return;
      }

      // Tier 3: fetch from /public
      const bundled = await this.fetchNamespace(locale, namespace);
      if (bundled) {
        this.memoryCache.set(key, bundled);
        this.loadedNamespaces.add(namespace);
        setToStorage(this.resolved.storagePrefix, locale, namespace, bundled);
        this.debugLog("namespace loaded from bundle", namespace);
        this.notify();
        return;
      }

      // Tier: Fallback locale
      if (
        this.resolved.fallbackLocale &&
        locale !== this.resolved.fallbackLocale
      ) {
        const fallbackKey = this.cacheKey(
          this.resolved.fallbackLocale,
          namespace,
        );
        if (!this.memoryCache.has(fallbackKey)) {
          const fallback = await this.fetchNamespace(
            this.resolved.fallbackLocale,
            namespace,
          );
          if (fallback) {
            this.memoryCache.set(fallbackKey, fallback);
            // Also set as current locale cache so t() finds it
            this.memoryCache.set(key, fallback);
            this.loadedNamespaces.add(namespace);
            this.debugLog("namespace loaded from fallback", namespace);
            this.notify();
            return;
          }
        } else {
          const fallbackData = this.memoryCache.get(fallbackKey);
          if (fallbackData) this.memoryCache.set(key, fallbackData);
          this.loadedNamespaces.add(namespace);
          this.debugLog("namespace loaded from fallback", namespace);
          this.notify();
          return;
        }
      }
    } catch (err) {
      this.debugLog("namespace load failed", namespace, err);
      this.failedNamespaces.add(key);
    } finally {
      this.loadingPromises.delete(key);
    }
  }

  t = (
    key: string,
    namespace: Namespace = this.resolved.defaultNamespace,
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
}
