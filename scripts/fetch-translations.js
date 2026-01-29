#!/usr/bin/env node

/**
 * Fetch latest translations from CDN during build.
 *
 * Usage:
 *   CDN_ENDPOINT=https://cdn.example.com node scripts/fetch-translations.js
 *
 * If CDN_ENDPOINT is not set or fetch fails, bundled translations are kept as-is.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const CDN_ENDPOINT = process.env.CDN_ENDPOINT;
const OUTPUT_DIR = join(process.cwd(), "public", "locales");

const LOCALES = process.env.LOCALES?.split(",") ?? ["en", "cs"];
const NAMESPACES = process.env.NAMESPACES?.split(",") ?? [
  "common",
  "profile",
];

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

async function main() {
  if (!CDN_ENDPOINT) {
    console.log(
      "[edge-i18n] CDN_ENDPOINT not set, skipping translation fetch. Using bundled translations.",
    );
    return;
  }

  console.log(`[edge-i18n] Fetching translations from ${CDN_ENDPOINT}`);

  // Fetch version info
  try {
    const version = await fetchJSON(`${CDN_ENDPOINT}/version.json`);
    const versionPath = join(OUTPUT_DIR, "version.json");
    ensureDir(versionPath);
    writeFileSync(versionPath, JSON.stringify(version, null, 2));
    console.log(`[edge-i18n] Updated version.json (v${version.version})`);
  } catch (err) {
    console.warn(`[edge-i18n] Failed to fetch version.json: ${err.message}`);
    return;
  }

  // Fetch namespace files
  for (const locale of LOCALES) {
    for (const ns of NAMESPACES) {
      try {
        const url = `${CDN_ENDPOINT}/${locale}/${ns}.json`;
        const data = await fetchJSON(url);
        const filePath = join(OUTPUT_DIR, locale, `${ns}.json`);
        ensureDir(filePath);
        writeFileSync(filePath, JSON.stringify(data, null, 2));
        console.log(`[edge-i18n] Updated ${locale}/${ns}.json`);
      } catch (err) {
        console.warn(
          `[edge-i18n] Failed to fetch ${locale}/${ns}.json: ${err.message}`,
        );
      }
    }
  }

  console.log("[edge-i18n] Translation fetch complete.");
}

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

main().catch((err) => {
  console.error("[edge-i18n] Translation fetch failed:", err.message);
  // Don't exit with error — build should still succeed with bundled translations
});
