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
  return "";
}

function facebookPageUrl(): string {
  const configured = (import.meta.env.VITE_FACEBOOK_PAGE_URL as string | undefined)?.trim();
  if (!configured) return "https://www.facebook.com/";
  return configured.replace(/\/$/, "");
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

function hasConfiguredMessengerTarget(base: string): boolean {
  if (!base) return false;
  try {
    const url = new URL(base);
    const host = url.hostname.toLowerCase();
    if (host === "m.me" || host.endsWith(".m.me")) {
      return url.pathname.replace(/\//g, "").length > 0;
    }
    if (host.includes("facebook.com")) {
      return url.pathname.replace(/\//g, "").length > 0;
    }
    return false;
  } catch {
    return false;
  }
}

function firstShareableUrl(items: SavedLink[]): string {
  const firstValid = items.find((item) => /^https?:\/\//i.test(item.url));
  return firstValid?.url ?? facebookPageUrl();
}

function buildFacebookShareUrl(message: string, shareUrl: string): string {
  const params = new URLSearchParams({
    u: shareUrl,
    quote: message,
  });
  return `https://www.facebook.com/sharer/sharer.php?${params.toString()}`;
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
  const base = normalizeMessengerUrl(messengerPageUrl());
  const hasTarget = hasConfiguredMessengerTarget(base);

  if (items.length === 0) {
    return hasTarget ? base : facebookPageUrl();
  }

  const message = buildBuyForMeMessage(items, options?.fromQrReferral ?? false);
  if (!hasTarget) {
    return buildFacebookShareUrl(message, firstShareableUrl(items));
  }

  const encoded = encodeURIComponent(message);
  return `${base}${base.includes("?") ? "&" : "?"}text=${encoded}`;
}

/** Open Messenger with the buy-for-me message for the given items. */
export function openBuyForMeOnMessenger(items: SavedLink[]): void {
  if (items.length === 0) return;

  const message = buildBuyForMeMessage(items);
  const shareUrl = firstShareableUrl(items);
  const messengerUrl = buildBuyForMeMessengerUrl(items);
  const fallbackShareUrl = buildFacebookShareUrl(message, shareUrl);
  const hasMessengerTarget = hasConfiguredMessengerTarget(normalizeMessengerUrl(messengerPageUrl()));

  // If Messenger page is not configured, fallback to Facebook share flow.
  if (!hasMessengerTarget) {
    window.open(fallbackShareUrl, "_blank", "noopener,noreferrer");
    return;
  }

  // Mobile Messenger commonly drops the ?text= value from m.me links.
  // Native share keeps the link and message payload for user-selected apps.
  if (isMobileDevice() && navigator.share) {
    void navigator
      .share({
        title: "Buy For Me request",
        text: message,
        url: shareUrl,
      })
      .catch(() => {
        window.open(messengerUrl, "_blank", "noopener,noreferrer");
      });
    return;
  }

  window.open(messengerUrl, "_blank", "noopener,noreferrer");
}
