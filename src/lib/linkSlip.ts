// src/lib/linkSlip.ts

import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { LinkSlipCaptureHost } from "../components/LinkSlipCard";
import type { SavedLink } from "../types";

/** Capture a DOM element and trigger a PNG download. */
export async function downloadElementAsPng(
  element: HTMLElement,
  filename: string,
): Promise<void> {
  const canvas = await elementToCanvas(element);
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export function linkSlipFilename(): string {
  const date = new Date().toISOString().slice(0, 10);
  return `bfm-link-slip-${date}.png`;
}

async function elementToCanvas(element: HTMLElement): Promise<HTMLCanvasElement> {
  const { default: html2canvas } = await import("html2canvas");
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
    logging: false,
  });
}

export async function elementToPngBlob(element: HTMLElement): Promise<Blob> {
  const canvas = await elementToCanvas(element);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not create PNG blob"));
    }, "image/png");
  });
}

/**
 * Off-screen render the Link Slip for the given items and return a PNG blob.
 */
export async function renderLinkSlipPngBlob(items: SavedLink[]): Promise<Blob> {
  if (items.length === 0) throw new Error("No items for Link Slip");

  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:400px;z-index:-1;pointer-events:none;";
  document.body.appendChild(host);

  const root = createRoot(host);
  try {
    const cardEl = await new Promise<HTMLElement>((resolve, reject) => {
      const timer = window.setTimeout(() => reject(new Error("Link Slip render timed out")), 12_000);
      root.render(
        createElement(LinkSlipCaptureHost, {
          items,
          onReady: (element) => {
            window.clearTimeout(timer);
            resolve(element);
          },
        }),
      );
    });

    return await elementToPngBlob(cardEl);
  } finally {
    root.unmount();
    host.remove();
  }
}

/** Copy a PNG blob to the clipboard so paste shows the image. */
export async function copyPngBlobToClipboard(blob: Blob): Promise<boolean> {
  if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
    return false;
  }
  try {
    await navigator.clipboard.write([
      new ClipboardItem({
        "image/png": blob,
      }),
    ]);
    return true;
  } catch {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "image/png": Promise.resolve(blob),
        }),
      ]);
      return true;
    } catch {
      return false;
    }
  }
}

export async function copyLinkSlipImage(items: SavedLink[]): Promise<boolean> {
  const blob = await renderLinkSlipPngBlob(items);
  return copyPngBlobToClipboard(blob);
}
