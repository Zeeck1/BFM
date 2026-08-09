// src/lib/messenger.ts

import { copyPngBlobToClipboard, renderLinkSlipPngBlob } from "./linkSlip";
import type { SavedLink } from "../types";

/** Official BFM Facebook / Messenger page ID (works in production even if VITE_* env is missing). */
const BFM_FACEBOOK_PAGE_ID = "1208338659022658";
const DEFAULT_MESSENGER_URL = `https://m.me/${BFM_FACEBOOK_PAGE_ID}`;

function messengerPageUrl(): string {
  const configured = (import.meta.env.VITE_MESSENGER_PAGE_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return DEFAULT_MESSENGER_URL;
}

function normalizeMessengerUrl(base: string): string {
  const trimmed = base.trim();
  if (/^\d+$/.test(trimmed)) {
    return `https://m.me/${trimmed}`;
  }

  const pageMatch = trimmed.match(/facebook\.com\/([^/?#]+)/i);
  if (
    pageMatch &&
    pageMatch[1] !== "profile.php" &&
    pageMatch[1] !== "pages" &&
    !trimmed.includes("m.me/")
  ) {
    return `https://m.me/${pageMatch[1]}`;
  }
  if (!trimmed.includes("m.me/") && !trimmed.includes("facebook.com")) {
    return `https://m.me/${trimmed.replace(/^https?:\/\//, "")}`;
  }
  return trimmed;
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

/** Messenger chat URL — always resolves to BFM page ID unless env overrides. */
export function buyNowMessengerUrl(): string {
  const target = normalizeMessengerUrl(messengerPageUrl());
  if (hasConfiguredMessengerTarget(target)) return target;
  return DEFAULT_MESSENGER_URL;
}

/** @deprecated use buyNowMessengerUrl */
export function buyNowFacebookPageUrl(): string {
  return buyNowMessengerUrl();
}

const OVERLAY_ID = "bfm-link-slip-preparing";
const TOAST_ID = "bfm-clipboard-toast";

function showPreparingOverlay() {
  hidePreparingOverlay();
  const overlay = document.createElement("div");
  overlay.id = OVERLAY_ID;
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "100000",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(4px)",
    padding: "24px",
  });
  overlay.innerHTML = `
    <div style="
      width:100%;max-width:320px;border-radius:16px;background:#fff;
      box-shadow:0 20px 40px rgba(15,23,42,0.25);padding:28px 24px;text-align:center;
      font-family:system-ui,-apple-system,sans-serif;
    ">
      <div style="
        width:40px;height:40px;margin:0 auto 14px;border-radius:999px;
        border:3px solid #e2e8f0;border-top-color:#4f46e5;
        animation:bfm-spin 0.8s linear infinite;
      "></div>
      <p style="margin:0;font-size:15px;font-weight:700;color:#0f172a">Preparing Link Slip…</p>
      <p style="margin:8px 0 0;font-size:13px;line-height:1.4;color:#64748b">
        Generating your product image. Messenger opens when it is ready to paste.
      </p>
    </div>
    <style>
      @keyframes bfm-spin { to { transform: rotate(360deg); } }
    </style>
  `;
  document.body.appendChild(overlay);
}

function hidePreparingOverlay() {
  document.getElementById(OVERLAY_ID)?.remove();
}

function showShareToast(message: string, options?: { messengerUrl?: string }) {
  document.getElementById(TOAST_ID)?.remove();

  const toast = document.createElement("div");
  toast.id = TOAST_ID;
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

  if (options?.messengerUrl) {
    toast.innerHTML = "";
    const text = document.createElement("p");
    text.style.margin = "0 0 10px";
    text.textContent = message;
    toast.appendChild(text);
    const link = document.createElement("a");
    link.href = options.messengerUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Open Messenger";
    Object.assign(link.style, {
      display: "inline-block",
      background: "#0084FF",
      color: "#fff",
      textDecoration: "none",
      borderRadius: "8px",
      padding: "8px 14px",
      fontSize: "13px",
      fontWeight: "700",
    });
    toast.appendChild(link);
  } else {
    toast.textContent = message;
  }

  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), options?.messengerUrl ? 12_000 : 5500);
}

/**
 * Prepare Link Slip on the current page, then open Messenger once ready to paste.
 */
async function openMessengerWithLinkSlip(items: SavedLink[]): Promise<void> {
  const destination = buyNowMessengerUrl();
  showPreparingOverlay();

  let imageCopied = false;
  try {
    const blob = await renderLinkSlipPngBlob(items);
    imageCopied = await copyPngBlobToClipboard(blob);
  } catch (err) {
    console.warn("[BFM] Link Slip image failed:", err);
  } finally {
    hidePreparingOverlay();
  }

  const opened = window.open(destination, "_blank", "noopener,noreferrer");
  if (!opened) {
    showShareToast(
      imageCopied
        ? "Link Slip ready. Tap below to open Messenger and paste."
        : "Could not open Messenger automatically.",
      { messengerUrl: destination },
    );
    return;
  }

  showShareToast(
    imageCopied
      ? "Link Slip ready — paste it in the Messenger chat."
      : "Opened Messenger. Download a Link Slip from your wishlist if paste is unavailable.",
  );
}

/** Build a Messenger URL for `<a href>` usage (privacy/terms, etc). */
export function buildBuyForMeMessengerUrl(
  _items: SavedLink[],
  _options?: { fromQrReferral?: boolean },
): string {
  return buyNowMessengerUrl();
}

/** Wishlist / item menu — prepare Link Slip on this page, then open Messenger. */
export function openBuyForMeOnMessenger(items: SavedLink[]): void {
  if (items.length === 0) return;
  void openMessengerWithLinkSlip(items);
}

/** Shared QR page Buy Now — prepare Link Slip on this page, then open Messenger. */
export function buyNowFromSharedList(items: SavedLink[]): void {
  if (items.length === 0) return;
  void openMessengerWithLinkSlip(items);
}
