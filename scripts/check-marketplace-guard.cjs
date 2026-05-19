#!/usr/bin/env node
/**
 * SOL.52 Marketplace Guard — Continuous P10.
 *
 * Enforces Law 8: Marketplace is Permanently Deferred.
 *
 * Scans all SQL migration files and TypeScript/JS source for forbidden
 * marketplace/seller/commission patterns. Exits with code 1 if any are found,
 * causing CI to fail.
 *
 * Run:
 *   node scripts/check-marketplace-guard.cjs
 *
 * Added to `lint` and `typecheck` pipeline via package.json.
 *
 * Forbidden patterns (per the Deferred Plan do-NOT list):
 *   SQL:
 *     - CREATE TABLE seller_*
 *     - CREATE TABLE marketplace_*
 *     - CREATE TABLE commission_*
 *     - ADD COLUMN.*seller_
 *     - ADD COLUMN.*marketplace_
 *     - ADD COLUMN.*commission_
 *     - pricing_line_items.*marketplace
 *   TypeScript/JS:
 *     - seller_ (field or table name as identifier start)
 *     - marketplace_ (field or table name, NOT inside a UI comment or string literal)
 *     - commission_ (field or table name)
 *   Exceptions (allowed):
 *     - Comments and UI labels (e.g., "Marketplace — coming soon")
 *     - lib/brand-metadata.ts (local-only, no marketplace coupling — explicitly allowed)
 *     - This file itself
 *     - docs/* files (documentation may reference the word)
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// ─── Configuration ────────────────────────────────────────────────────────────

const ROOT = path.resolve(__dirname, "..");

/** SQL-specific forbidden patterns (checked only in .sql files) */
const SQL_FORBIDDEN = [
  /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.seller_/i,
  /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?seller_/i,
  /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.marketplace_/i,
  /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?marketplace_/i,
  /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?public\.commission_/i,
  /CREATE\s+TABLE\s+(IF\s+NOT\s+EXISTS\s+)?commission_/i,
  /ADD\s+COLUMN\s+.*seller_/i,
  /ADD\s+COLUMN\s+.*marketplace_/i,
  /ADD\s+COLUMN\s+.*commission_/i,
  /pricing_line_items.*marketplace/i,
];

/** TypeScript/JS forbidden patterns — structural identifiers, not comments/strings */
const TS_FORBIDDEN = [
  // Table references in from() calls (supabase)
  /\.from\s*\(\s*["']seller_/,
  /\.from\s*\(\s*["']marketplace_/,
  /\.from\s*\(\s*["']commission_/,
  // Type/interface names
  /type\s+Seller[A-Z]/,
  /interface\s+Seller[A-Z]/,
  /type\s+Marketplace[A-Z]/,
  /interface\s+Marketplace[A-Z]/,
  /type\s+Commission[A-Z]/,
  /interface\s+Commission[A-Z]/,
  // Field names in object literals/types (strictly structural)
  /seller_id\s*[?:]?\s*[:=]/,
  /seller_name\s*[?:]?\s*[:=]/,
  /commission_rate\s*[?:]?\s*[:=]/,
  /commission_amount\s*[?:]?\s*[:=]/,
  /marketplace_listing_id\s*[?:]?\s*[:=]/,
  /marketplace_price\s*[?:]?\s*[:=]/,
];

/** Paths explicitly excluded from scanning (lib/brand-metadata.ts uses "marketplace" in comments only) */
const EXCLUDE_PATHS = [
  "scripts/check-marketplace-guard.cjs",
  "docs/",
  "node_modules/",
  ".next/",
  ".git/",
];

// ─── Scanner ──────────────────────────────────────────────────────────────────

function isExcluded(filePath) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  return EXCLUDE_PATHS.some((ex) => rel.startsWith(ex));
}

function scanFile(filePath, patterns) {
  const rel = path.relative(ROOT, filePath).replace(/\\/g, "/");
  if (isExcluded(filePath)) return [];

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const hits = [];

  for (const pattern of patterns) {
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      // Skip comment lines (SQL: --, TypeScript: //, /* )
      const trimmed = line.trim();
      if (
        trimmed.startsWith("--") ||
        trimmed.startsWith("//") ||
        trimmed.startsWith("*") ||
        trimmed.startsWith("/*")
      ) {
        continue;
      }
      if (pattern.test(line)) {
        hits.push({ file: rel, line: i + 1, text: trimmed.slice(0, 120), pattern: pattern.source });
      }
    }
  }
  return hits;
}

function walkDir(dir, exts, callback) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full).replace(/\\/g, "/");
    if (EXCLUDE_PATHS.some((ex) => rel.startsWith(ex))) continue;
    if (entry.isDirectory()) {
      walkDir(full, exts, callback);
    } else if (exts.some((ext) => entry.name.endsWith(ext))) {
      callback(full);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

let violations = [];

// Scan SQL migrations
walkDir(path.join(ROOT, "supabase/migrations"), [".sql"], (f) => {
  violations = violations.concat(scanFile(f, SQL_FORBIDDEN));
});

// Scan TypeScript/JavaScript source
walkDir(path.join(ROOT, "lib"), [".ts", ".tsx"], (f) => {
  violations = violations.concat(scanFile(f, TS_FORBIDDEN));
});
walkDir(path.join(ROOT, "app"), [".ts", ".tsx"], (f) => {
  violations = violations.concat(scanFile(f, TS_FORBIDDEN));
});
walkDir(path.join(ROOT, "components"), [".ts", ".tsx"], (f) => {
  violations = violations.concat(scanFile(f, TS_FORBIDDEN));
});

// ─── Report ───────────────────────────────────────────────────────────────────

if (violations.length === 0) {
  console.log("✓ Marketplace guard passed — no forbidden marketplace/seller/commission patterns found.");
  process.exit(0);
} else {
  console.error("\n✗ MARKETPLACE GUARD FAILED\n");
  console.error("Law 8 violation: Marketplace is Permanently Deferred.");
  console.error("The following forbidden patterns were found:\n");
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    Pattern: ${v.pattern}`);
    console.error(`    Line:    ${v.text}`);
    console.error("");
  }
  console.error(`${violations.length} violation(s) found. Remove these patterns to pass CI.`);
  console.error("See docs/SIMPLICITY_LAWS.md Law 8 and the Deferred Plan do-NOT list.");
  process.exit(1);
}
