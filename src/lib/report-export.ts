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
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  } finally {
    staging.remove();
  }
}