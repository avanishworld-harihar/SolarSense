/**
 * Premium Proposal PPT — mirrors `public/premium-proposal.html` (same data + copy).
 * Run: npm run ppt:premium
 */
const path = require("path");
const pptxgen = require("pptxgenjs");

const OUT = path.join(__dirname, "..", "public", "Sol.52-Premium-Proposal.pptx");

/** Same object as premium-proposal.html */
const data = {
  name: "Ravendr Singh",
  location: "Satna, MP",
  yearly_bill: 21014,
  after_solar: 900,
  saving: 20114,
  payback: 5.4,
  monthly_units: [179, 147, 144, 267, 389, 424, 371, 229, 353, 242, 123, 126]
};

const breakdown = [17086, 5192, 1783];
const paybackLine = [5000, 10000, 15000, 20000, 25000, 30000];

const C = {
  title: "0B1F3A",
  muted: "555555",
  green: "0A7F5A",
  red: "D32F2F",
  cardBg: "F9FAFB",
  cardLine: "E5E7EB",
  white: "FFFFFF",
  pageBg: "F2F4F7"
};

function cardBox(slide, pres, x, y, w, h) {
  slide.addShape(pres.ShapeType.rect, {
    x,
    y,
    w,
    h,
    fill: { color: C.cardBg },
    line: { color: C.cardLine, width: 0.5 }
  });
}

async function main() {
  const pptx = new pptxgen();
  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Sol.52";
  pptx.title = "Sol.52 Premium Proposal";
  pptx.subject = "Premium Proposal";

  // --- Slide 1: Customer (page 1 HTML) ---
  const s1 = pptx.addSlide();
  s1.background = { color: C.pageBg };
  s1.addText("Personalized Solar Report", {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.55,
    fontSize: 34,
    color: C.title,
    fontFace: "Inter"
  });

  cardBox(s1, pptx, 0.55, 1.05, 8.9, 1.35);
  s1.addText(data.name, {
    x: 0.75,
    y: 1.2,
    w: 8.5,
    h: 0.35,
    fontSize: 20,
    color: C.muted,
    bold: true,
    fontFace: "Inter"
  });
  s1.addText(data.location, {
    x: 0.75,
    y: 1.55,
    w: 8.5,
    h: 0.28,
    fontSize: 14,
    color: C.muted,
    fontFace: "Inter"
  });
  s1.addText("System Size: 3 kW", {
    x: 0.75,
    y: 1.88,
    w: 8.5,
    h: 0.35,
    fontSize: 14,
    color: C.muted,
    fontFace: "Inter"
  });

  s1.addText(`₹${data.saving}/year saving`, {
    x: 0.5,
    y: 2.65,
    w: 9,
    h: 0.75,
    fontSize: 48,
    bold: true,
    color: C.green,
    fontFace: "Inter"
  });

  cardBox(s1, pptx, 0.55, 3.55, 4.25, 0.85);
  s1.addText("96% bill reduction", {
    x: 0.65,
    y: 3.72,
    w: 4.05,
    h: 0.55,
    fontSize: 14,
    color: C.muted,
    valign: "middle",
    fontFace: "Inter"
  });
  cardBox(s1, pptx, 5.2, 3.55, 4.25, 0.85);
  s1.addText(`${data.payback} yr payback`, {
    x: 5.3,
    y: 3.72,
    w: 4.05,
    h: 0.55,
    fontSize: 14,
    color: C.muted,
    valign: "middle",
    fontFace: "Inter"
  });

  // --- Slide 2: Usage bar chart ---
  const s2 = pptx.addSlide();
  s2.background = { color: C.pageBg };
  s2.addText("Aapka Electricity Usage", {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.55,
    fontSize: 34,
    color: C.title,
    fontFace: "Inter"
  });
  s2.addChart(
    pptx.ChartType.bar,
    [
      {
        name: "Units",
        labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
        values: data.monthly_units
      }
    ],
    {
      x: 0.45,
      y: 1.05,
      w: 9.1,
      h: 3.35,
      barDir: "col",
      chartColors: [C.green],
      showTitle: false,
      showLegend: false,
    }
  );
  cardBox(s2, pptx, 0.55, 4.55, 8.9, 0.75);
  s2.addText("59% bill sirf April–July me aata hai ⚠️", {
    x: 0.7,
    y: 4.68,
    w: 8.6,
    h: 0.5,
    fontSize: 14,
    color: C.red,
    valign: "middle",
    fontFace: "Inter"
  });

  // --- Slide 3: Pie breakdown ---
  const s3 = pptx.addSlide();
  s3.background = { color: C.pageBg };
  s3.addText("Bill Breakdown", {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.55,
    fontSize: 34,
    color: C.title,
    fontFace: "Inter"
  });
  s3.addChart(
    pptx.ChartType.pie,
    [
      {
        name: "Bill",
        labels: ["Energy", "Fixed", "Tax"],
        values: breakdown
      }
    ],
    {
      x: 1.5,
      y: 1.0,
      w: 7,
      h: 3.4,
      showLegend: true,
      legendPos: "b",
      chartColors: ["0A7F5A", "D32F2F", "1565C0"]
    }
  );
  cardBox(s3, pptx, 0.55, 4.45, 8.9, 0.55);
  s3.addText("₹5192 Fixed Charges", {
    x: 0.7,
    y: 4.55,
    w: 8.5,
    h: 0.4,
    fontSize: 14,
    color: C.red,
    fontFace: "Inter"
  });
  cardBox(s3, pptx, 0.55, 5.05, 8.9, 0.5);
  s3.addText("₹1783 Tax", {
    x: 0.7,
    y: 5.12,
    w: 8.5,
    h: 0.38,
    fontSize: 14,
    color: C.muted,
    fontFace: "Inter"
  });
  s3.addText("Aap bina use kiye bhi charge de rahe ho", {
    x: 0.55,
    y: 5.65,
    w: 8.9,
    h: 0.4,
    fontSize: 14,
    bold: true,
    color: C.muted,
    fontFace: "Inter"
  });

  // --- Slide 4: Before / After ---
  const s4 = pptx.addSlide();
  s4.background = { color: C.pageBg };
  s4.addText("Before vs After Solar", {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.55,
    fontSize: 34,
    color: C.title,
    fontFace: "Inter"
  });
  cardBox(s4, pptx, 0.55, 1.25, 4.25, 1.35);
  s4.addText("Before", { x: 0.7, y: 1.38, w: 4, h: 0.35, fontSize: 20, color: C.muted, fontFace: "Inter" });
  s4.addText(`₹${data.yearly_bill}`, {
    x: 0.7,
    y: 1.85,
    w: 4,
    h: 0.55,
    fontSize: 28,
    bold: true,
    color: C.red,
    fontFace: "Inter"
  });
  cardBox(s4, pptx, 5.2, 1.25, 4.25, 1.35);
  s4.addText("After", { x: 5.35, y: 1.38, w: 4, h: 0.35, fontSize: 20, color: C.muted, fontFace: "Inter" });
  s4.addText(`₹${data.after_solar}`, {
    x: 5.35,
    y: 1.85,
    w: 4,
    h: 0.55,
    fontSize: 28,
    bold: true,
    color: C.muted,
    fontFace: "Inter"
  });
  s4.addText("96% Reduction", {
    x: 0.5,
    y: 3.05,
    w: 9,
    h: 0.75,
    fontSize: 48,
    bold: true,
    color: C.green,
    fontFace: "Inter"
  });

  // --- Slide 5: Payback line chart ---
  const s5 = pptx.addSlide();
  s5.background = { color: C.pageBg };
  s5.addText("Investment Recovery", {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.55,
    fontSize: 34,
    color: C.title,
    fontFace: "Inter"
  });
  s5.addChart(
    pptx.ChartType.line,
    [
      {
        name: "Series",
        labels: ["1", "2", "3", "4", "5", "6"],
        values: paybackLine
      }
    ],
    {
      x: 0.45,
      y: 1.05,
      w: 9.1,
      h: 3.2,
      lineSize: 3,
      chartColors: [C.title],
      showLegend: false
    }
  );
  cardBox(s5, pptx, 0.55, 4.35, 8.9, 0.95);
  s5.addText(`${data.payback} saal me paisa recover`, {
    x: 0.7,
    y: 4.48,
    w: 8.5,
    h: 0.35,
    fontSize: 14,
    bold: true,
    color: C.muted,
    fontFace: "Inter"
  });
  s5.addText("Uske baad bijli FREE", {
    x: 0.7,
    y: 4.85,
    w: 8.5,
    h: 0.35,
    fontSize: 14,
    color: C.muted,
    fontFace: "Inter"
  });

  // --- Slide 6: Long term profit ---
  const s6 = pptx.addSlide();
  s6.background = { color: C.pageBg };
  s6.addText("Long Term Profit", {
    x: 0.5,
    y: 0.35,
    w: 9,
    h: 0.55,
    fontSize: 34,
    color: C.title,
    fontFace: "Inter"
  });
  s6.addText("₹3,93,650", {
    x: 0.5,
    y: 1.35,
    w: 9,
    h: 0.85,
    fontSize: 48,
    bold: true,
    color: C.green,
    fontFace: "Inter"
  });
  cardBox(s6, pptx, 0.55, 2.45, 8.9, 0.65);
  s6.addText("25 saal tak lagataar saving", {
    x: 0.7,
    y: 2.58,
    w: 8.5,
    h: 0.45,
    fontSize: 14,
    color: C.muted,
    valign: "middle",
    fontFace: "Inter"
  });
  cardBox(s6, pptx, 0.55, 3.25, 8.9, 0.65);
  s6.addText("Solar = Expense nahi, Asset hai", {
    x: 0.7,
    y: 3.38,
    w: 8.5,
    h: 0.45,
    fontSize: 14,
    color: C.muted,
    valign: "middle",
    fontFace: "Inter"
  });

  await pptx.writeFile({ fileName: OUT });
  // eslint-disable-next-line no-console
  console.log("Wrote:", OUT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
