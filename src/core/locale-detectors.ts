import type { Locale, LocaleDetector } from "./types";

export function createServerInjectedDetector(): LocaleDetector {
  return {
    name: "server-injected",
    detect(): Locale | null {
      if (typeof window !== "undefined" && window.__EDGE_I18N__?.locale) {
        return window.__EDGE_I18N__.locale;
      }
      return null;
    },
  };
}

export function createCookieDetector(cookieName: string): LocaleDetector {
  return {
    name: "cookie",
    detect(): Locale | null {
      if (typeof document === "undefined") return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${cookieName}=`);
      if (parts.length === 2) {
        const segment = parts.pop();
        if (segment) {
          const cookie = segment.split(";")[0];
          if (cookie) return cookie;
        }
      }
      return null;
    },
  };
}

export function createNavigatorDetector(supportedLocales: Locale[]): LocaleDetector {
  return {
    name: "navigator",
    detect(): Locale | null {
      if (typeof navigator === "undefined") return null;
      const lang = navigator.language.split("-")[0];
      if (lang && supportedLocales.includes(lang)) return lang;
      return null;
    },
  };
}

export function createBuiltInDetectors(
  cookieName: string,
  supportedLocales: Locale[],
): LocaleDetector[] {
  return [
    createServerInjectedDetector(),
    createCookieDetector(cookieName),
    createNavigatorDetector(supportedLocales),
  ];
}
