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
        const source = new Image();
        source.src = await capture(section);
        await source.decode();
        // Keep full-width text readable: overflow continues onto another A4 page.
        const ratio = source.width / section.getBoundingClientRect().width;
        const maxHeight = Math.floor(source.width * 785.89 / 539.28);
        const sectionTop = section.getBoundingClientRect().top;
        const blocks = Array.from(section.querySelectorAll<HTMLElement>("[data-report-block]"));
        let offset = 0;
        while (offset < source.height) {
          let end = Math.min(source.height, offset + maxHeight);
          if (end < source.height) {
            const crossing = blocks.find(block => {
              const rect = block.getBoundingClientRect();
              return (rect.top - sectionTop) * ratio < end && (rect.bottom - sectionTop) * ratio > end;
            });
            if (crossing) {
              const start = Math.floor((crossing.getBoundingClientRect().top - sectionTop) * ratio);
              if (start > offset + maxHeight * 0.35) end = start;
            }
          }
          const canvas = document.createElement("canvas");
          canvas.width = source.width;
          canvas.height = end - offset;
          const context = canvas.getContext("2d");
          if (!context) throw new Error("No se pudo crear el PDF");
          context.drawImage(source, 0, offset, source.width, canvas.height, 0, 0, source.width, canvas.height);
          const image = await pdf.embedPng(canvas.toDataURL("image/png"));
          const page = pdf.addPage([595.28, 841.89]);
          const scale = 539.28 / source.width;
          page.drawImage(image, { x: 28, y: 813.89 - image.height * scale, width: 539.28, height: image.height * scale });
          offset = end;
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