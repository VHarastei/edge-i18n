import { I18nCore } from "edge-i18n";

export const i18n = new I18nCore({
  cdnEndpoint: "https://cdn.example.com",
  defaultLocale: "en",
  supportedLocales: ["en", "cs"],
  enableBackgroundUpdates: false, // Disabled for example (no real CDN)
});

// Preload common namespace
i18n.loadNamespace("common");
