// src/lib/messenger.ts

import { formatMMK } from "./utils";
import type { SavedLink } from "../types";

function messengerPageUrl(): string {
  const configured = (import.meta.env.VITE_MESSENGER_PAGE_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "";
}

function facebookPageUrl(): string {
  const configured = (import.meta.env.VITE_FACEBOOK_PAGE_URL as string | undefined)?.trim();
  if (!configured) return "https://www.facebook.com/";
  return configured.replace(/\/$/, "");
}

function normalizeMessengerUrl(base: string): string {
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

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      return true;
    } catch {
      return false;
    }
  }
}

function showCopiedToast() {
  const existing = document.getElementById("bfm-clipboard-toast");
  if (existing) existing.remove();

  const toast = document.createElement("div");
  toast.id = "bfm-clipboard-toast";
  Object.assign(toast.style, {
    position: "fixed",
    bottom: "24px",
    left: "50%",
    transform: "translateX(-50%)",
    background: "#1e293b",
    color: "#fff",
    padding: "12px 20px",
    borderRadius: "12px",
    fontSize: "14px",
    fontWeight: "600",
    zIndex: "99999",
    boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
    textAlign: "center",
    maxWidth: "340px",
    lineHeight: "1.4",
  });
  toast.textContent = "Message copied! Paste it in the Messenger chat.";
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5000);
}

function getMessengerTarget(): string {
  const raw = messengerPageUrl();
  if (!raw) return "";
  return normalizeMessengerUrl(raw);
}

/** Build a Messenger URL for `<a href>` usage (shared list page, etc). */
export function buildBuyForMeMessengerUrl(
  _items: SavedLink[],
  _options?: { fromQrReferral?: boolean },
): string {
  const target = getMessengerTarget();
  const hasTarget = hasConfiguredMessengerTarget(target);
  return hasTarget ? target : facebookPageUrl();
}

/** Open Messenger with the buy-for-me message for the given items. */
export function openBuyForMeOnMessenger(items: SavedLink[]): void {
  if (items.length === 0) return;

  const message = buildBuyForMeMessage(items);
  const target = getMessengerTarget();
  const hasTarget = hasConfiguredMessengerTarget(target);
  const destination = hasTarget ? target : facebookPageUrl();

  if (isMobileDevice() && navigator.share) {
    void navigator
      .share({
        title: "Buy For Me request",
        text: message,
      })
      .catch(() => {
        void copyToClipboard(message).then((ok) => {
          if (ok) showCopiedToast();
          window.open(destination, "_blank", "noopener,noreferrer");
        });
      });
    return;
  }

  void copyToClipboard(message).then((ok) => {
    if (ok) showCopiedToast();
    window.open(destination, "_blank", "noopener,noreferrer");
  });
}

/**
 * For SharedListPage `<a>` links — copies message on click, returns href.
 * Attach this as an onClick handler on the anchor element.
 */
export function copyMessengerMessageOnClick(
  items: SavedLink[],
  options?: { fromQrReferral?: boolean },
): () => void {
  return () => {
    if (items.length === 0) return;
    const message = buildBuyForMeMessage(items, options?.fromQrReferral ?? false);
    void copyToClipboard(message).then((ok) => {
      if (ok) showCopiedToast();
    });
  };
}
