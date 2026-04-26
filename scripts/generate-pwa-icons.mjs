/**
 * Build `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` from `public/sol52-logo.png`.
 * Uses light tile background so small sizes stay readable in tabs / home screen.
 * Run: node scripts/generate-pwa-icons.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const logo = path.join(root, "public", "sol52-logo.png");
/** Matches `app/manifest.ts` background_color feel. */
const BG = { r: 244, g: 247, b: 251, alpha: 1 };

async function writeIcon(size, filename) {
  await sharp(logo)
    .resize(size, size, { fit: "contain", background: BG, position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(path.join(root, "public", filename));
  console.log("Wrote", filename, `${size}×${size}`);
}

async function main() {
  if (!fs.existsSync(logo)) {
    console.error("Missing", logo);
    process.exit(1);
  }
  await writeIcon(192, "icon-192.png");
  await writeIcon(512, "icon-512.png");
  await writeIcon(180, "apple-touch-icon.png");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
