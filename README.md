# edge-i18n

Lightning-fast edge-first i18n for React. ~2KB gzipped.

## Installation

```bash
npm install edge-i18n
```

## Quick Start

```typescript
import { I18nCore } from 'edge-i18n';
import { useI18n } from 'edge-i18n/react';

const i18n = new I18nCore({
  cdnEndpoint: 'https://cdn.example.com',
  defaultLocale: 'en',
  supportedLocales: ['en', 'cs'],
});

function App() {
  const { t, setLocale } = useI18n(i18n);
  return <h1>{t('welcome', { appName: 'My App' })}</h1>;
}
```

## Architecture

edge-i18n uses a 5-tier loading strategy that ensures translations are always available, starting from the fastest source:

```
1. Memory cache     (0ms)      - In-memory Map, instant
2. localStorage     (1-5ms)    - Persistent, survives refresh
3. Dynamic import   (5-20ms)   - Bundled in /public, works offline
4. Background CDN   (after 5s) - Check if bundled translations are outdated
5. Server injection (optional) - SSR can inject into HTML for 0ms
```

Translations are **never blocking**. The app renders immediately with whatever is available. Background updates are stored in localStorage for the next session, never causing mid-session text changes.

## Bundle Size

| Library | Size (gzipped) |
|---------|----------------|
| **edge-i18n** | **~2KB** |
| react-i18next | ~26KB |
| react-intl | ~18KB |

## Tree-Shaking

edge-i18n is fully tree-shakeable with separate entry points:

```typescript
// Core only (~2KB)
import { I18nCore } from 'edge-i18n';

// React hook (+~1KB)
import { useI18n } from 'edge-i18n/react';

// Trans component for JSX in translations
import { Trans } from 'edge-i18n/react';
```

## API Reference

### `I18nCore`

Main class that manages translations, caching, and locale state.

```typescript
const i18n = new I18nCore({
  cdnEndpoint: string;           // CDN URL for translations
  defaultLocale: string;         // Fallback locale
  supportedLocales: string[];    // List of supported locales
  fallbackLocale?: string;       // Locale to use if key missing
  cacheTTL?: number;             // localStorage TTL in ms (default: 7 days)
  versionCheckDelay?: number;    // Delay before CDN check (default: 5000ms)
  enableBackgroundUpdates?: boolean; // Enable CDN checks (default: true)
});
```

#### Methods

| Method | Description |
|--------|-------------|
| `t(key, namespace?, params?)` | Translate a key with optional interpolation |
| `setLocale(locale)` | Change the active locale |
| `getLocale()` | Get the current locale |
| `loadNamespace(ns)` | Load a translation namespace |
| `loadNamespaces(ns[])` | Load multiple namespaces |
| `isNamespaceLoaded(ns)` | Check if a namespace is loaded |
| `subscribe(listener)` | Subscribe to locale changes, returns unsubscribe |

### `useI18n(i18n, namespace?)`

React hook for accessing translations. Uses `useSyncExternalStore` for optimal performance.

```typescript
function MyComponent() {
  const { t, locale, setLocale } = useI18n(i18n, 'common');

  return (
    <div>
      <p>{t('greeting', { name: 'World' })}</p>
      <button onClick={() => setLocale('cs')}>Switch to Czech</button>
    </div>
  );
}
```

### `Trans`

Component for translations containing JSX elements.

```typescript
// Translation: "Read the <link>documentation</link> for more"
<Trans
  i18n={i18n}
  i18nKey="readMore"
  namespace="common"
  components={{ link: <a href="/docs" /> }}
/>
```

### `TranslationBoundary`

Suspense wrapper that ensures a namespace is loaded before rendering children.

```typescript
<TranslationBoundary i18n={i18n} namespace="profile" fallback={<Skeleton />}>
  <ProfilePage />
</TranslationBoundary>
```

## Translation File Format

### Namespace file (`public/locales/en/common.json`)

```json
{
  "welcome": "Welcome to {{appName}}!",
  "greeting": "Hello {{name}}",
  "terms": "I agree to the <link>Terms of Service</link>",
  "nav": {
    "home": "Home",
    "profile": "Profile"
  }
}
```

Features:
- **Interpolation**: `{{variable}}` syntax
- **JSX markers**: `<tag>content</tag>` for use with `Trans` component
- **Nesting**: Dot notation access (`t('nav.home')`)

### Version file (`public/locales/version.json`)

```json
{
  "version": "1.0.0",
  "timestamp": 1706123456789,
  "locales": ["en", "cs"],
  "namespaces": ["common", "profile"],
  "updatedNamespaces": ["common", "profile"]
}
```

The `locales` and `namespaces` arrays are used by the build-time fetch script to discover which files to download from the CDN. `updatedNamespaces` is used at runtime for background update checks.

## Locale Detection

Locale is detected in this order:
1. `edge-i18n-locale` cookie
2. `localStorage` stored preference
3. `navigator.language`
4. `defaultLocale` from config

## Server Injection (SSR)

For zero-latency first render, inject translations into the HTML:

```html
<script>
  window.__EDGE_I18N__ = {
    locale: 'en',
    namespaces: {
      'en:common': { "welcome": "Welcome!", ... }
    }
  };
</script>
```

`I18nCore` automatically hydrates from `window.__EDGE_I18N__` on construction.

## Build-Time Translation Fetch

Fetch latest translations from CDN during build. The script reads the CDN's `version.json` manifest to discover available locales and namespaces automatically — no hardcoded values needed.

| Env var | Required | Default | Description |
|---------|----------|---------|-------------|
| `EDGE_I18N_CDN_ENDPOINT` | Yes | — | Base URL of the translation CDN |
| `EDGE_I18N_OUTPUT_DIR` | No | `public/locales` | Directory to write fetched files into |

```bash
npx edge-i18n-fetch
```

Add to your build pipeline:

```json
{
  "scripts": {
    "prebuild": "edge-i18n-fetch"
  }
}
```

If `EDGE_I18N_CDN_ENDPOINT` is not set, the script exits silently and bundled translations are used as-is.

## Preloading

Preload namespaces on hover for instant page transitions:

```typescript
<button
  onClick={() => navigate('/profile')}
  onMouseEnter={() => i18n.loadNamespace('profile')}
>
  Profile
</button>
```

## Migration from react-i18next

| react-i18next | edge-i18n |
|---------------|-----------|
| `useTranslation('ns')` | `useI18n(i18n, 'ns')` |
| `t('key', { val })` | `t('key', { val })` |
| `<Trans i18nKey="k" components={...} />` | `<Trans i18n={i18n} i18nKey="k" components={...} />` |
| `i18n.changeLanguage('en')` | `i18n.setLocale('en')` |
| `i18n.language` | `i18n.getLocale()` |
| Requires `i18next`, `react-i18next`, backend plugin | Just `edge-i18n` |

## License

MIT
