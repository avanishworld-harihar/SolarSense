/**
 * Generates two-slide PPT from Sol.52 "Investment Clarity" + "Payback" cards.
 * Run from repo root: node scripts/generate-investment-ppt.cjs
 * Requires: npm install pptxgenjs (dev or one-off)
 */
const path = require("path");
const pptxgen = require("pptxgenjs");

const OUT = path.join(__dirname, "..", "public", "Sol.52-Investment-Payback.pptx");

async function main() {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Sol.52";
  pptx.title = "Investment clarity & Payback";

  const bg = "0F172A";
  const accent = "3B82F6";
  const muted = "94A3B8";
  const gold = "FBBF24";
  const white = "FFFFFF";

  // --- Slide 1: Investment Clarity ---
  const s1 = pptx.addSlide();
  s1.background = { color: bg };
  s1.addText("Investment Clarity", {
    x: 0.5,
    y: 0.45,
    w: 9,
    h: 0.65,
    fontSize: 32,
    bold: true,
    color: white,
    fontFace: "Calibri"
  });

  const cols = [
    { step: "1", label: "Total Cost", value: "₹1,10,000", x: 0.85 },
    { step: "2", label: "Subsidy", value: "₹40,000", x: 3.45 },
    { step: "3", label: "Net Cost", value: "₹70,000", x: 6.05 }
  ];
  const colW = 2.5;

  cols.forEach((c) => {
    s1.addText(c.step, {
      x: c.x + colW / 2 - 0.28,
      y: 1.35,
      w: 0.56,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: white,
      align: "center",
      valign: "middle",
      fill: { color: accent },
      shape: pptx.ShapeType.roundRect,
      rectRadius: 0.08
    });
    s1.addText(c.label, {
      x: c.x,
      y: 2.05,
      w: colW,
      h: 0.4,
      fontSize: 16,
      color: muted,
      align: "center",
      fontFace: "Calibri"
    });
    s1.addText(c.value, {
      x: c.x,
      y: 2.55,
      w: colW,
      h: 0.65,
      fontSize: 28,
      bold: true,
      color: gold,
      align: "center",
      fontFace: "Calibri"
    });
  });

  // --- Slide 2: Payback timeline ---
  const s2 = pptx.addSlide();
  s2.background = { color: bg };
  s2.addText("Payback: 5.4 Years", {
    x: 0.5,
    y: 0.45,
    w: 9,
    h: 0.65,
    fontSize: 32,
    bold: true,
    color: white,
    fontFace: "Calibri"
  });

  const lineY = 3.1;
  s2.addShape(pptx.ShapeType.line, {
    x: 0.9,
    y: lineY,
    w: 8.2,
    h: 0,
    line: { color: accent, width: 3 }
  });

  const markers = [1.15, 3.35, 5.55, 7.75];
  markers.forEach((x, i) => {
    s2.addShape(pptx.ShapeType.rect, {
      x: x - 0.12,
      y: lineY - 0.12,
      w: 0.24,
      h: 0.24,
      fill: { color: accent },
      line: { color: accent }
    });
    s2.addText(String(i + 1), {
      x: x - 0.15,
      y: lineY - 0.42,
      w: 0.3,
      h: 0.25,
      fontSize: 11,
      bold: true,
      color: white,
      align: "center"
    });
  });

  s2.addText("Year 0", { x: 0.5, y: 1.35, w: 2.2, h: 0.35, fontSize: 15, bold: true, color: white });
  s2.addText("Investment: ₹70,000", {
    x: 0.5,
    y: 1.72,
    w: 2.8,
    h: 0.45,
    fontSize: 17,
    color: gold,
    bold: true
  });

  s2.addText("Year 3", { x: 2.9, y: 3.55, w: 2, h: 0.35, fontSize: 15, bold: true, color: white });
  s2.addText("Saved: ₹60,342", {
    x: 2.9,
    y: 3.92,
    w: 2.8,
    h: 0.45,
    fontSize: 17,
    color: gold,
    bold: true
  });

  s2.addText("Year 5", { x: 5.4, y: 1.35, w: 2, h: 0.35, fontSize: 15, bold: true, color: white });
  s2.addText("Saved: ₹1,00,570", {
    x: 5.4,
    y: 1.72,
    w: 3.2,
    h: 0.45,
    fontSize: 17,
    color: gold,
    bold: true
  });

  s2.addText("Year 6+", { x: 7.2, y: 3.55, w: 2.2, h: 0.35, fontSize: 15, bold: true, color: white });
  s2.addText("Iske baad bijli FREE", {
    x: 6.8,
    y: 3.92,
    w: 3,
    h: 0.55,
    fontSize: 16,
    color: "34D399",
    bold: true,
    fontFace: "Calibri"
  });

  await pptx.writeFile({ fileName: OUT });
  // eslint-disable-next-line no-console
  console.log("Wrote:", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
