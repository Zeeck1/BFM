// src/lib/messenger.ts

import { copyPngBlobToClipboard, renderLinkSlipPngBlob } from "./linkSlip";
import type { SavedLink } from "../types";

function messengerPageUrl(): string {
  const configured = (import.meta.env.VITE_MESSENGER_PAGE_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "";
}

function facebookPageUrl(): string {
  const configured = (import.meta.env.VITE_FACEBOOK_PAGE_URL as string | undefined)?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return "https://www.facebook.com/";
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

/** Messenger chat URL (m.me), falling back to Facebook page if unset. */
export function buyNowMessengerUrl(): string {
  const raw = messengerPageUrl();
  const target = raw ? normalizeMessengerUrl(raw) : "";
  if (hasConfiguredMessengerTarget(target)) return target;
  return facebookPageUrl();
}

/** @deprecated use buyNowMessengerUrl */
export function buyNowFacebookPageUrl(): string {
  return buyNowMessengerUrl();
}

function showShareToast(message: string) {
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
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 5500);
}

/**
 * Open Messenger immediately (click gesture → avoids popup blockers),
 * then copy the Link Slip image so the user can paste it in the chat.
 */
async function openMessengerWithLinkSlip(items: SavedLink[]): Promise<void> {
  const destination = buyNowMessengerUrl();
  // Must open during the click gesture — before any await.
  window.open(destination, "_blank", "noopener,noreferrer");
  showShareToast("Preparing Link Slip…");

  try {
    const blob = await renderLinkSlipPngBlob(items);
    const imageCopied = await copyPngBlobToClipboard(blob);
    showShareToast(
      imageCopied
        ? "Link Slip image copied! Paste it in the Messenger chat."
        : "Opened Messenger. Download a Link Slip from your wishlist if paste is unavailable.",
    );
  } catch (err) {
    console.warn("[BFM] Link Slip image failed:", err);
    showShareToast("Opened Messenger. Link Slip image could not be copied — try again.");
  }
}

/** Build a Messenger URL for `<a href>` usage (privacy/terms, etc). */
export function buildBuyForMeMessengerUrl(
  _items: SavedLink[],
  _options?: { fromQrReferral?: boolean },
): string {
  return buyNowMessengerUrl();
}

/** Wishlist / item menu — open Messenger + copy Link Slip image. */
export function openBuyForMeOnMessenger(items: SavedLink[]): void {
  if (items.length === 0) return;
  void openMessengerWithLinkSlip(items);
}

/** Shared QR page Buy Now — open Messenger + copy Link Slip image. */
export function buyNowFromSharedList(items: SavedLink[]): void {
  if (items.length === 0) return;
  void openMessengerWithLinkSlip(items);
}
