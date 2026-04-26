/**
 * One-off generator: reads public/new_sol52-logo.svg and writes components/sol52-wordmark.tsx
 * with Tailwind-friendly fill-current groups. Run: node scripts/generate-sol52-wordmark-tsx.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "public", "new_sol52-logo.svg");
const outPath = path.join(root, "components", "sol52-wordmark.tsx");

const xml = fs.readFileSync(svgPath, "utf8");
/** Match <path ... /> possibly multiline */
const pathRe = /<path\b([^>]*)\/>/gs;
const paths = [];
let m;
while ((m = pathRe.exec(xml)) !== null) {
  const attrs = m[1].replace(/\s+/g, " ").trim();
  const dM = attrs.match(/\bd="([^"]*)"/);
  if (!dM) continue;
  const d = dM[1];
  let cls = (attrs.match(/\bclass="([^"]*)"/) || [])[1] || "";
  const fillRule = /\bfill-rule="evenodd"/.test(attrs) ? ' fillRule="evenodd"' : "";
  const clipRule = /\bclip-rule="evenodd"/.test(attrs) ? ' clipRule="evenodd"' : "";
  paths.push({ cls: cls.trim(), d, fillRule, clipRule });
}

const solCls = 'className="fill-current text-[#072141] dark:text-white"';
const tealCls = 'fill={`url(#${dotGradId}-52-fill)`}';
const tagCls =
  'className="fill-current text-[#0f5c56] dark:text-[#14b8a6]"';

function pathFor({ cls, d, fillRule, clipRule }) {
  const c =
    cls === "st0" || cls === "st3" || cls === "st4" || cls === "st5" || cls === "sol"
      ? solCls
      : cls === "st1" || cls === "c52"
        ? tealCls
        : cls === "st2" || cls === "dot"
          ? "DOT"
          : cls === "st7" || cls === "tag"
            ? tagCls
            : solCls;
  if (c === "DOT") return { kind: "dot", d, fillRule, clipRule };
  return { kind: "path", line: `      <path ${c}${fillRule}${clipRule} d=${JSON.stringify(d)} />` };
}

const lines = [];
let dotSeen = false;
for (const p of paths) {
  const r = pathFor(p);
  if (r.kind === "dot" && !dotSeen) {
    dotSeen = true;
    lines.push(`      <g
        className="text-amber-400"
        style={{
          filter:
            "drop-shadow(0 0 3px #FBBF24) drop-shadow(0 0 8px #FBBF24) drop-shadow(0 0 14px rgba(251, 191, 36, 0.5))",
        }}
      >`);
    lines.push(
        `        <path fill="currentColor"${p.fillRule}${p.clipRule} d=${JSON.stringify(p.d)} />`
    );
    lines.push(`      </g>`);
  } else if (r.kind === "path") {
    lines.push(r.line);
  }
}

const tsx = `"use client";

import { cn } from "@/lib/utils";

export type Sol52WordmarkProps = {
  className?: string;
  /** Set true when parent link/button already names the destination (avoids redundant SR output). */
  decorative?: boolean;
};

/**
 * Inline Sol.52 wordmark: transparent background, theme-aware Sol + tagline, teal 52, amber dot with glow.
 */
export function Sol52Wordmark({ className, decorative }: Sol52WordmarkProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 1500 500"
      className={cn("block h-auto w-full max-w-none bg-transparent", className)}
      fill="none"
      role={decorative ? "presentation" : "img"}
      aria-hidden={decorative ? true : undefined}
      aria-label={decorative ? undefined : "Sol.52"}
    >
      <g>
${lines.join("\n")}
      </g>
    </svg>
  );
}
`;

fs.writeFileSync(outPath, tsx, "utf8");
console.log("Wrote", outPath, "paths:", paths.length);
