type JsPdfCtor = typeof import("jspdf").jsPDF;
type Html2CanvasFn = typeof import("html2canvas")["default"];

async function waitForImages(root: Document): Promise<void> {
  const images = Array.from(root.images);
  if (images.length === 0) return;
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) return resolve();
          img.addEventListener("load", () => resolve(), { once: true });
          img.addEventListener("error", () => resolve(), { once: true });
        })
    )
  );
}

function safeFileName(input: string): string {
  return input.replace(/[<>:"/\\|?*\u0000-\u001F]/g, "").trim() || "solar-proposal";
}

export async function downloadProposalPdfFromHtml(rawHtml: string, customerName?: string): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    throw new Error("PDF download is supported only in browser.");
  }

  const [{ jsPDF }, { default: html2canvas }] = (await Promise.all([
    import("jspdf"),
    import("html2canvas")
  ])) as [{ jsPDF: JsPdfCtor }, { default: Html2CanvasFn }];

  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "1024px";
  iframe.style.height = "768px";
  iframe.style.opacity = "0";
  iframe.style.pointerEvents = "none";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  try {
    const html = rawHtml.replace(
      "</head>",
      '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@500;600;700;800;900&display=swap" rel="stylesheet"></head>'
    );
    iframe.srcdoc = html;

    await new Promise<void>((resolve, reject) => {
      iframe.onload = () => resolve();
      iframe.onerror = () => reject(new Error("Could not render proposal frame."));
      window.setTimeout(() => resolve(), 10000);
    });

    const doc = iframe.contentDocument;
    if (!doc) throw new Error("PDF frame unavailable.");

    await waitForImages(doc);
    await new Promise((resolve) => window.setTimeout(resolve, 1200));

    const slideNodes = Array.from(doc.querySelectorAll<HTMLElement>(".slide"));
    if (slideNodes.length === 0) throw new Error("No slides found to export.");

    const pdf = new jsPDF({ orientation: "landscape", unit: "px", format: "a4", compress: true });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < slideNodes.length; i += 1) {
      const slide = slideNodes[i];
      const canvas = await html2canvas(slide, {
        scale: 2,
        backgroundColor: "#ffffff",
        useCORS: true,
        imageTimeout: 15000,
        logging: false
      });
      const image = canvas.toDataURL("image/jpeg", 0.95);
      if (i > 0) pdf.addPage("a4", "landscape");
      pdf.addImage(image, "JPEG", 0, 0, pageWidth, pageHeight, undefined, "FAST");
    }

    const fileName = `${safeFileName(customerName ?? "solar-proposal")}-proposal.pdf`;
    pdf.save(fileName);
  } finally {
    iframe.remove();
  }
}
