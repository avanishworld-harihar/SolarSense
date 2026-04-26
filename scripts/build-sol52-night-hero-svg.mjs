/**
 * Builds `public/sol52-night-hero.svg` — Sol.52 on deep navy, night-marketing look.
 * Run: node scripts/build-sol52-night-hero-svg.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const src = path.join(root, "public", "new_sol52-logo.svg");
const out = path.join(root, "public", "sol52-night-hero.svg");

const xml = fs.readFileSync(src, "utf8");
const m = xml.match(/<g>\s*<g>([\s\S]*?)<\/g>\s*<g>/);
if (!m) throw new Error("Could not extract main mark group from new_sol52-logo.svg");
const inner = m[1].trim();

const pathRe = /<path\b[^>]*\/>/gs;
const chunks = inner.match(pathRe) || [];
const sol = [];
const c52 = [];
let dot = "";
for (const p of chunks) {
  if (p.includes('class="sol"')) sol.push(p);
  else if (p.includes('class="c52"')) c52.push(p);
  else if (p.includes('class="dot"')) dot = p;
}
if (!dot) throw new Error("Dot path not found");

/** L stem + first digit sit closest to the dot — soft warm duplicate for luminous bleed */
const lPath = sol.find((p) => p.includes("M724.37"));
const fivePath = c52[0];
const bleedMarkup = [lPath, fivePath]
  .filter(Boolean)
  .map((p) =>
    p
      .replace(/\sclass="(sol|c52)"/g, "")
      .replace("<path", '<path fill="#FEF9C3" opacity="0.2" filter="url(#sol52-bleed-blur)"')
  )
  .join("\n\t\t");

const solMarkup = sol
  .map((p) =>
    p
      .replace(/\sclass="sol"/g, "")
      .replace("<path", '<path fill="#FFFFFF"')
  )
  .join("\n\t\t");

const c52Markup = c52
  .map((p) =>
    p
      .replace(/\sclass="c52"/g, "")
      .replace("<path", '<path fill="url(#sol52-52-grad)"')
  )
  .join("\n\t\t");

const dotMarkup = dot
  .replace(/\sclass="dot"/g, "")
  .replace("<path", '<path fill="#FDE047" filter="url(#sol52-dot-filter)"');

const W = 1500;
const H = 540;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" fill="none">
  <defs>
    <linearGradient id="sol52-52-grad" x1="920" y1="200" x2="1260" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#BEF264"/>
      <stop offset="55%" stop-color="#14B8A6"/>
      <stop offset="100%" stop-color="#0F766E"/>
    </linearGradient>
    <radialGradient id="sol52-bridge-grad" cx="806" cy="312" r="1" gradientUnits="userSpaceOnUse"
        gradientTransform="translate(806 312) scale(340 48) translate(-806 -312)">
      <stop offset="0%" stop-color="#FDE047" stop-opacity="0.42"/>
      <stop offset="35%" stop-color="#FBBF24" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#F59E0B" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sol52-vignette" cx="50%" cy="35%" r="75%">
      <stop offset="0%" stop-color="#0B1E36" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#030712" stop-opacity="0"/>
    </radialGradient>
    <filter id="sol52-bridge-blur" x="-30%" y="-40%" width="160%" height="180%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="18 9" result="b"/>
    </filter>
    <filter id="sol52-bleed-blur" x="-15%" y="-15%" width="130%" height="130%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="b"/>
    </filter>
    <filter id="sol52-dot-filter" x="-80%" y="-80%" width="260%" height="260%" color-interpolation-filters="sRGB">
      <feGaussianBlur in="SourceAlpha" stdDeviation="10 5" result="blur"/>
      <feFlood flood-color="#FBBF24" flood-opacity="0.55" result="flood"/>
      <feComposite in="flood" in2="blur" operator="in" result="glow1"/>
      <feGaussianBlur in="SourceAlpha" stdDeviation="22 10" result="blur2"/>
      <feFlood flood-color="#F59E0B" flood-opacity="0.28" result="flood2"/>
      <feComposite in="flood2" in2="blur2" operator="in" result="glow2"/>
      <feMerge>
        <feMergeNode in="glow2"/>
        <feMergeNode in="glow1"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#050F1E"/>
  <rect width="${W}" height="${H}" fill="url(#sol52-vignette)"/>
  <ellipse cx="806" cy="312" rx="360" ry="52" fill="url(#sol52-bridge-grad)" filter="url(#sol52-bridge-blur)" opacity="0.95"/>
  <g>
${bleedMarkup}
  </g>
  <g>
${solMarkup}
${c52Markup}
  </g>
${dotMarkup}
  <text
    x="${W / 2}"
    y="498"
    text-anchor="middle"
    font-family="Montserrat, ui-sans-serif, system-ui, sans-serif"
    font-size="26"
    font-weight="500"
    letter-spacing="0.12em"
    fill="#0D9488"
  >smart solar audits</text>
</svg>
`;

fs.writeFileSync(out, svg, "utf8");
console.log("Wrote", out);
