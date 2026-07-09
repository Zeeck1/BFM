// src/lib/messenger.ts

import { formatMMK } from "./utils";
import type { SavedLink } from "../types";

/** Your Messenger page — e.g. https://m.me/yourpage */
function messengerPageUrl(): string {
  const configured = (import.meta.env.VITE_MESSENGER_PAGE_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/$/, "");

  console.warn(
    "[BFM] VITE_MESSENGER_PAGE_URL is not set. Add your m.me link to .env",
  );
  return "https://m.me/";
}

function normalizeMessengerUrl(base: string): string {
  // facebook.com/PageName → m.me/PageName
  const pageMatch = base.match(/facebook\.com\/([^/?#]+)/i);
  if (
    pageMatch &&
    pageMatch[1] !== "profile.php" &&
    pageMatch[1] !== "pages" &&
    !base.includes("m.me/")
  ) {
    return `https://m.me/${pageMatch[1]}`;
  }
  if (!base.includes("m.me/") && !base.includes("facebook.com")) {
    return `https://m.me/${base.replace(/^https?:\/\//, "")}`;
  }
  return base;
}

function buildBuyForMeMessage(items: SavedLink[], fromQrReferral = false): string {
  const header =
    items.length === 1
      ? "Hi BFM, I'd like to buy this item:"
      : `Hi BFM, I'd like to buy these ${items.length} items:`;

  const lines = items.map((item, index) => {
    const title = item.title ?? "Product link";
    const price =
      item.price_mmk != null ? ` (${formatMMK(item.price_mmk)})` : "";
    const site = item.site_name ? ` [${item.site_name}]` : "";
    const note = item.notes?.trim() ? `\nNote: ${item.notes.trim()}` : "";
    return `${index + 1}. ${title}${site}${price}\n${item.url}${note}`;
  });

  const qrNote = fromQrReferral ? "\n\nI came from refer QR Code" : "";
  return `${header}${qrNote}\n\n${lines.join("\n\n")}`;
}

function isMobileDevice(): boolean {
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/** Build a Messenger URL with a pre-filled order message. */
export function buildBuyForMeMessengerUrl(
  items: SavedLink[],
  options?: { fromQrReferral?: boolean },
): string {
  if (items.length === 0) return messengerPageUrl();

  const message = buildBuyForMeMessage(items, options?.fromQrReferral ?? false);
  const encoded = encodeURIComponent(message);
  const base = normalizeMessengerUrl(messengerPageUrl());

  return `${base}${base.includes("?") ? "&" : "?"}text=${encoded}`;
}

/** Open Messenger with the buy-for-me message for the given items. */
export function openBuyForMeOnMessenger(items: SavedLink[]): void {
  if (items.length === 0) return;

  const message = buildBuyForMeMessage(items);

  // Mobile Messenger commonly drops the ?text= value from m.me links.
  // Native share preserves the full product list when the user chooses Messenger.
  if (isMobileDevice() && navigator.share) {
    void navigator
      .share({
        title: "Buy For Me request",
        text: message,
      })
      .catch(() => {
        const url = buildBuyForMeMessengerUrl(items);
        window.open(url, "_blank", "noopener,noreferrer");
      });
    return;
  }

  const url = buildBuyForMeMessengerUrl(items);
  window.open(url, "_blank", "noopener,noreferrer");
}
