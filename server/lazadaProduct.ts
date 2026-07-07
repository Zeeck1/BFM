// server/lazadaProduct.ts
// Lazada Thailand product page metadata + price extraction.

import { env } from "./config/env.js";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const LAZADA_HOSTS = new Set(["www.lazada.co.th", "lazada.co.th", "pages.lazada.co.th"]);

export interface LazadaPreviewResult {
  url: string;
  title?: string;
  description?: string;
  image_url?: string;
  site_name: string;
  price_thb?: number;
}

export function isLazadaProductUrl(raw: string): boolean {
  try {
    return LAZADA_HOSTS.has(new URL(raw.trim()).hostname.toLowerCase());
  } catch {
    return false;
  }
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function readMeta(html: string, key: string): string {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`property=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`content=["']([^"']*)["'][^>]+property=["']${escaped}["']`, "i"),
    new RegExp(`name=["']${escaped}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`content=["']([^"']*)["'][^>]+name=["']${escaped}["']`, "i"),
  ];
  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) return decodeHtml(match[1].trim());
  }
  return "";
}

function parsePriceThb(raw: string | number | undefined | null): number | undefined {
  if (raw == null) return undefined;
  const value = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(value) || value <= 0 || value > 50_000_000) return undefined;
  return value;
}

function pickImage(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return undefined;
}

function readJsonLdProduct(html: string): Record<string, unknown> | null {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );
  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (item && typeof item === "object" && item["@type"] === "Product") {
          return item as Record<string, unknown>;
        }
      }
    } catch {
      /* ignore */
    }
  }
  return null;
}

function priceFromJsonLd(html: string): number | undefined {
  const blocks = html.matchAll(
    /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
  );

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block[1]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        const graph = Array.isArray(item["@graph"]) ? item["@graph"] : [item];
        for (const node of graph) {
          if (node?.["@type"] !== "Product" && !node?.offers) continue;
          const offers = node.offers;
          const offerList = Array.isArray(offers) ? offers : offers ? [offers] : [];
          for (const offer of offerList) {
            const curr = offer?.priceCurrency;
            const price = offer?.price ?? offer?.lowPrice ?? offer?.highPrice;
            if (price && (!curr || String(curr).toUpperCase() === "THB")) {
              const n = parsePriceThb(price);
              if (n) return n;
            }
          }
        }
      }
    } catch {
      /* ignore invalid JSON-LD */
    }
  }
  return undefined;
}

/** Scan Lazada inline JSON / module data for common price fields. */
function priceFromInlineJson(html: string): number | undefined {
  const patterns = [
    /"salePrice"\s*:\s*\{[^}]*"value"\s*:\s*([\d.]+)/,
    /"salePrice"\s*:\s*\{[^}]*"price"\s*:\s*([\d.]+)/,
    /"currentPrice"\s*:\s*([\d.]+)/,
    /"pdp_price"\s*:\s*([\d.]+)/,
    /"final_price"\s*:\s*([\d.]+)/,
    /"originPrice"\s*:\s*([\d.]+)/,
    /"promotionPrice"\s*:\s*([\d.]+)/,
    /"price"\s*:\s*([\d]{1,7}(?:\.[\d]{1,2})?)/,
    /"price"\s*:\s*"([\d,]+\.?\d*)"/,
    /"priceText"\s*:\s*"[^0-9]*([\d,]+\.?\d*)/,
    /"priceShow"\s*:\s*"[^0-9]*([\d,]+\.?\d*)/,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (match?.[1]) {
      const n = parsePriceThb(match[1]);
      if (n) return n;
    }
  }

  return undefined;
}

function extractLazadaPriceThb(html: string): number | undefined {
  const metaPrice =
    readMeta(html, "product:price:amount") ||
    readMeta(html, "og:price:amount") ||
    readMeta(html, "product:price");

  const fromMeta = parsePriceThb(metaPrice);
  if (fromMeta) return fromMeta;

  const fromLd = priceFromJsonLd(html);
  if (fromLd) return fromLd;

  return priceFromInlineJson(html);
}

function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
    Referer: "https://www.lazada.co.th/",
  };
  if (env.lazadaCookie) {
    headers.Cookie = env.lazadaCookie;
  }
  return headers;
}

async function readResponseText(response: Response, maxBytes = 900_000): Promise<string> {
  const reader = response.body?.getReader();
  if (!reader) return response.text();

  let html = "";
  let bytes = 0;
  while (bytes < maxBytes) {
    const { done, value } = await reader.read();
    if (done || !value) break;
    html += new TextDecoder().decode(value);
    bytes += value.byteLength;
  }
  reader.cancel();
  return html;
}

export async function fetchLazadaProductPreview(rawUrl: string): Promise<LazadaPreviewResult> {
  const url = new URL(rawUrl.trim());
  url.hash = "";
  const normalized = url.toString();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    const response = await fetch(normalized, {
      signal: controller.signal,
      headers: buildHeaders(),
      redirect: "follow",
    });

    const html = await readResponseText(response);
    const finalUrl = response.url || normalized;

    const jsonLd = readJsonLdProduct(html);

    const title =
      decodeHtml(readMeta(html, "og:title") || readMeta(html, "twitter:title")) ||
      (typeof jsonLd?.name === "string" ? decodeHtml(jsonLd.name) : "") ||
      decodeHtml(html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? "") ||
      undefined;

    const cleanTitle = title?.replace(/\s*[|\-–—]\s*Lazada.*$/i, "").trim();

    const image_url =
      readMeta(html, "og:image") ||
      readMeta(html, "twitter:image") ||
      pickImage(jsonLd?.image) ||
      undefined;

    const description =
      decodeHtml(readMeta(html, "og:description") || readMeta(html, "description")) ||
      undefined;

    const price_thb = extractLazadaPriceThb(html);

    return {
      url: finalUrl,
      title: cleanTitle || undefined,
      description: description || undefined,
      image_url: image_url || undefined,
      site_name: "Lazada",
      price_thb,
    };
  } catch {
    return { url: normalized, site_name: "Lazada" };
  } finally {
    clearTimeout(timer);
  }
}
