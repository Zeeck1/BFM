// src/lib/linkSlip.ts

/** Capture a DOM element and trigger a PNG download. */
export async function downloadElementAsPng(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const { default: html2canvas } = await import("html2canvas");

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function linkSlipFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `bfm-link-slip-${date}.png`;
}
