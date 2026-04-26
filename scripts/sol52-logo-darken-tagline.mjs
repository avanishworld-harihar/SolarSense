/**
 * Darken neutral (gray) pixels in the lower band of `public/sol52-logo.png` — targets tagline text.
 * Run: node scripts/sol52-logo-darken-tagline.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const pngPath = path.join(root, "public", "sol52-logo.png");

/** Only rows from this fraction of height downward (tagline under wordmark; keep above this). */
const BAND_START_Y = 0.62;
/** Neutral-ish: low chroma so we do not touch navy / teal / gold. */
const MAX_CHROMA = 42;
/** Tagline grays sit ~65–120 before passes; keep above true black / shadows. */
const MIN_AVG = 48;
const MAX_AVG = 235;
/** Multiply gray RGB toward darker (“thoda aur”). */
const DARKEN = 0.82;

function clampByte(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

async function main() {
  if (!fs.existsSync(pngPath)) {
    console.error("Missing", pngPath);
    process.exit(1);
  }

  const { data, info } = await sharp(pngPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  if (channels !== 4) throw new Error(`Expected RGBA, got ${channels} channels`);

  const yMin = Math.floor(height * BAND_START_Y);
  let n = 0;

  for (let y = yMin; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      const i = row + x * 4;
      const a = data[i + 3];
      if (a < 8) continue;

      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const hi = Math.max(r, g, b);
      const lo = Math.min(r, g, b);
      const chroma = hi - lo;
      const avg = (r + g + b) / 3;

      if (chroma > MAX_CHROMA || avg < MIN_AVG || avg > MAX_AVG) continue;

      data[i] = clampByte(r * DARKEN);
      data[i + 1] = clampByte(g * DARKEN);
      data[i + 2] = clampByte(b * DARKEN);
      n++;
    }
  }

  await sharp(data, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9 }).toFile(pngPath + ".tmp");
  fs.renameSync(pngPath + ".tmp", pngPath);
  console.log("Updated", pngPath, `— darkened ${n} pixels in tagline band`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
