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
  clone.style.position = "absolute";
  clone.style.left = "-10000px";
  clone.style.top = "0";
  document.body.appendChild(clone);
  try {
    const fontEmbedCSS = await embeddedFonts();
    const capture = (element: HTMLElement) => toPng(element, {
      pixelRatio: 2,
      backgroundColor: getComputedStyle(element).backgroundColor,
      fontEmbedCSS,
    });
    let blob: Blob;
    if (format === "png") {
      blob = await fetch(await capture(clone)).then((response) => response.blob());
    } else {
      const { PDFDocument } = await import("pdf-lib");
      const pdf = await PDFDocument.create();
      const sections = Array.from(clone.querySelectorAll<HTMLElement>("[data-report-page]"));
      for (const section of sections.length ? sections : [clone]) {
        const image = await pdf.embedPng(await capture(section));
        const page = pdf.addPage([595.28, 841.89]);
        const scale = Math.min(539.28 / image.width, 785.89 / image.height);
        const width = image.width * scale;
        const height = image.height * scale;
        page.drawImage(image, { x: (595.28 - width) / 2, y: 813.89 - height, width, height });
      }
      const bytes = await pdf.save();
      blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.${format}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } finally {
    clone.remove();
  }
}