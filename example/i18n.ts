import { I18nCore } from "edge-i18n";

export const i18n = new I18nCore({
  cdnEndpoint: "https://pub-e642442aec3c48aea7d9ed477c28dd8c.r2.dev/locales",
  defaultLocale: "en",
  supportedLocales: ["en", "cs"],
  debug: true,
});

// Preload common namespace
i18n.loadNamespace("common");

// ---------------------------------------------------------------------------
// Usage Examples (commented out)
// ---------------------------------------------------------------------------

// --- 1. Custom config options ---
//
// import { I18nCore } from "edge-i18n";
//
// const i18nWithOptions = new I18nCore({
//   cdnEndpoint: "https://cdn.example.com",
//   defaultLocale: "en",
//   supportedLocales: ["en", "cs", "de"],
//   localeCookieName: "my_locale",     // default: "locale"
//   cookieMaxAgeDays: 30,              // default: 7
//   storagePrefix: "myapp-i18n:",      // default: "edge-i18n:"
//   localeBasePath: "/i18n",           // default: "/locales"
//   defaultNamespace: "translations",  // default: "common"
// });

// --- 2. Custom locale detector ---
//
// import { I18nCore } from "edge-i18n";
// import type { LocaleDetector } from "edge-i18n";
//
// const queryParamDetector: LocaleDetector = {
//   name: "query-param",
//   detect() {
//     const params = new URLSearchParams(window.location.search);
//     return params.get("lang");
//   },
// };
//
// const i18nWithDetector = new I18nCore({
//   cdnEndpoint: "https://cdn.example.com",
//   defaultLocale: "en",
//   supportedLocales: ["en", "cs"],
//   localeDetectors: [queryParamDetector],
// });

// --- 3. Composing built-in detectors with custom ones ---
//
// import { I18nCore, createBuiltInDetectors } from "edge-i18n";
// import type { LocaleDetector } from "edge-i18n";
//
// const headerDetector: LocaleDetector = {
//   name: "accept-language-header",
//   detect() {
//     // Example: parse navigator.languages for the first supported match
//     return navigator.languages?.[0]?.split("-")[0] ?? null;
//   },
// };
//
// const builtIn = createBuiltInDetectors("locale", ["en", "cs"]);
//
// const i18nComposed = new I18nCore({
//   cdnEndpoint: "https://cdn.example.com",
//   defaultLocale: "en",
//   supportedLocales: ["en", "cs"],
//   // Custom detector runs first, then the built-in cookie/path detectors
//   localeDetectors: [headerDetector, ...builtIn],
// });
