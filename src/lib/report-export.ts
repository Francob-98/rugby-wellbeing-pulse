import { toPng } from "html-to-image";

async function embeddedFonts() {
  const sheet = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')).find((link) => link.href.includes("fonts.googleapis.com"));
  if (!sheet) return "";
  const css = await fetch(sheet.href).then((response) => response.text());
  const urls = [...new Set(Array.from(css.matchAll(/url\((https:[^)]+)\)/g), (match) => match[1]).filter((url): url is string => Boolean(url)))];
  let result = css;
  for (const url of urls) {
    const blob = await fetch(url).then((response) => response.blob());
    const data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    result = result.replaceAll(url, data);
  }
  return result;
}

export async function exportReport(node: HTMLElement, format: "png" | "pdf", filename: string) {
  await document.fonts.ready;
  const clone = node.cloneNode(true) as HTMLElement;
  clone.style.width = "920px";
  clone.style.maxWidth = "none";
  clone.querySelectorAll("[data-export-hide]").forEach((el) => el.remove());
  clone.querySelectorAll<HTMLElement>("[data-export-show]").forEach((el) => el.classList.remove("hidden"));
  // Keep offscreen positioning on a parent that is never captured. Computed
  // logical inset properties otherwise survive the clone and hide its content.
  const staging = document.createElement("div");
  Object.assign(staging.style, { position: "absolute", left: "-10000px", top: "0", width: "920px" });
  staging.appendChild(clone);
  document.body.appendChild(staging);
  try {
    const fontEmbedCSS = await embeddedFonts();
    const capture = (element: HTMLElement) => toPng(element, {
      pixelRatio: 2,
      backgroundColor: getComputedStyle(element).backgroundColor,
      fontEmbedCSS,
      style: { position: "static", inset: "auto", insetInline: "auto", insetBlock: "auto", margin: "0", marginBlock: "0", marginInline: "0" },
    });
    let blob: Blob;
    if (format === "png") {
      const sections = Array.from(clone.querySelectorAll<HTMLElement>("[data-report-page]"));
      const images: HTMLImageElement[] = [];
      for (const section of sections.length ? sections : [clone]) {
        const image = new Image();
        image.src = await capture(section);
        await image.decode();
        images.push(image);
      }
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(...images.map((image) => image.width));
      canvas.height = images.reduce((height, image) => height + image.height, 0);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("No se pudo crear la imagen");
      let offset = 0;
      for (const image of images) {
        context.drawImage(image, 0, offset);
        offset += image.height;
      }
      blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((result) => result ? resolve(result) : reject(new Error("PNG vacío")), "image/png"));
    } else {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      const sections = Array.from(clone.querySelectorAll<HTMLElement>("[data-report-page]"));
      const pageWidth = 595.28;
      const pageHeight = 841.89;
      const margin = 28;
      const contentWidth = pageWidth - margin * 2;
      const contentHeight = pageHeight - margin * 2;
      let page = pdf.addPage([pageWidth, pageHeight]);
      let usedHeight = 0;
      for (const section of sections.length ? sections : [clone]) {
        const source = new Image();
        source.src = await capture(section);
        await source.decode();
        // Sections share the current page instead of forcing a fresh A4 page.
        const ratio = source.width / section.getBoundingClientRect().width;
        const scale = contentWidth / source.width;
        const maxHeight = Math.floor(contentHeight / scale);
        const sectionTop = section.getBoundingClientRect().top;
        const protectedRanges: { start: number; end: number }[] = [];
        const protect = (rect: DOMRect) => {
          const start = Math.floor((rect.top - sectionTop) * ratio);
          const end = Math.ceil((rect.bottom - sectionTop) * ratio);
          if (end > start && end - start < maxHeight) protectedRanges.push({ start, end });
        };
        // Keep player rows, charts and headings together when they fit a page.
        section.querySelectorAll("[data-report-block], svg, header, h2, h3, li").forEach(element => protect(element.getBoundingClientRect()));
        // Oversized blocks may continue, but never cut through a line of text.
        const walker = document.createTreeWalker(section, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          if (!walker.currentNode.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(walker.currentNode);
          Array.from(range.getClientRects()).forEach(protect);
        }
        let offset = 0;
        while (offset < source.height) {
          const available = Math.floor((contentHeight - usedHeight) / scale);
          if (available < 1) {
            page = pdf.addPage([pageWidth, pageHeight]);
            usedHeight = 0;
            continue;
          }
          let end = Math.min(source.height, offset + available);
          if (end < source.height) {
            // Back up to a safe boundary, including overlapping nested blocks.
            let previousEnd: number;
            do {
              previousEnd = end;
              for (const block of protectedRanges) {
                if (block.start < end && block.end > end && block.start >= offset) end = block.start;
              }
            } while (end < previousEnd && end > offset);
            if (end <= offset) {
              page = pdf.addPage([pageWidth, pageHeight]);
              usedHeight = 0;
              continue;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = source.width;
          canvas.height = end - offset;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("No se pudo crear el PDF");
          context.drawImage(source, 0, offset, source.width, canvas.height, 0, 0, source.width, canvas.height);
          const image = await pdf.embedPng(canvas.toDataURL("image/png"));
          const height = image.height * scale;
          page.drawImage(image, { x: margin, y: pageHeight - margin - usedHeight - height, width: contentWidth, height });
          usedHeight += height;
          offset = end;
          if (offset < source.height) {
            page = pdf.addPage([pageWidth, pageHeight]);
            usedHeight = 0;
          }
        }
      }
      const bytes = await pdf.save();
      blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.${format}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  } finally {
    staging.remove();
  }
}