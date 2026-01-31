#!/usr/bin/env node

/**
 * Fetch latest translations from CDN during build.
 *
 * The script discovers available locales and namespaces from the CDN's
 * version.json manifest — no hardcoded values needed.
 *
 * Usage:
 *   EDGE_I18N_CDN_ENDPOINT=https://cdn.example.com node scripts/fetch-translations.js
 *
 * Env vars:
 *   EDGE_I18N_CDN_ENDPOINT  (required) — Base URL of the translation CDN.
 *   EDGE_I18N_OUTPUT_DIR    (optional) — Where to write files. Default: "public/locales".
 *
 * If EDGE_I18N_CDN_ENDPOINT is not set or fetch fails, bundled translations are kept as-is.
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const EDGE_I18N_CDN_ENDPOINT = process.env.EDGE_I18N_CDN_ENDPOINT;
const EDGE_I18N_OUTPUT_DIR = resolve(process.env.EDGE_I18N_OUTPUT_DIR ?? "public/locales");

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

function ensureDir(filePath) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

async function main() {
  if (!EDGE_I18N_CDN_ENDPOINT) {
    console.log(
      "[edge-i18n] EDGE_I18N_CDN_ENDPOINT not set, skipping translation fetch. Using bundled translations.",
    );
    return;
  }

  console.log(`[edge-i18n] Fetching translations from ${EDGE_I18N_CDN_ENDPOINT}`);

  // 1. Fetch version manifest
  let version;
  try {
    version = await fetchJSON(`${EDGE_I18N_CDN_ENDPOINT}/version.json`);
  } catch (err) {
    console.warn(`[edge-i18n] Failed to fetch version.json: ${err.message}`);
    return;
  }

  // 2. Validate manifest contains locales & namespaces
  const { locales, namespaces } = version;

  if (!Array.isArray(locales) || locales.length === 0) {
    console.error(
      '[edge-i18n] version.json is missing a non-empty "locales" array. Aborting.',
    );
    process.exit(1);
  }

  if (!Array.isArray(namespaces) || namespaces.length === 0) {
    console.error(
      '[edge-i18n] version.json is missing a non-empty "namespaces" array. Aborting.',
    );
    process.exit(1);
  }

  console.log(`[edge-i18n] Discovered locales: ${locales.join(", ")}`);
  console.log(`[edge-i18n] Discovered namespaces: ${namespaces.join(", ")}`);

  // 3. Write version.json to output dir
  const versionPath = resolve(EDGE_I18N_OUTPUT_DIR, "version.json");
  ensureDir(versionPath);
  writeFileSync(versionPath, JSON.stringify(version, null, 2));
  console.log(`[edge-i18n] Updated version.json (v${version.version})`);

  // 4. Fetch all locale/namespace combinations
  for (const locale of locales) {
    for (const ns of namespaces) {
      try {
        const url = `${EDGE_I18N_CDN_ENDPOINT}/${locale}/${ns}.json`;
        const data = await fetchJSON(url);
        const filePath = resolve(EDGE_I18N_OUTPUT_DIR, locale, `${ns}.json`);
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

main().catch((err) => {
  console.error("[edge-i18n] Translation fetch failed:", err.message);
  // Don't exit with error — build should still succeed with bundled translations
});
