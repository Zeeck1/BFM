// server/lazadaSiteSearch.ts
// Keyword search via Lazada Thailand public catalog AJAX (no RapidAPI).

import { env } from "./config/env.js";
import type { LazadaSearchResult, LazadaSearchResponse } from "./lazadaProduct.js";

const PAGE_SIZE = 15;

function proxyUrl(targetUrl: string): string | null {
  if (!env.lazadaProxyUrl) return null;
  if (env.lazadaProxyUrl.includes("{url}")) {
    return env.lazadaProxyUrl.replace("{url}", encodeURIComponent(targetUrl));
  }
  const sep = env.lazadaProxyUrl.includes("?") ? "&" : "?";
  return `${env.lazadaProxyUrl}${sep}url=${encodeURIComponent(targetUrl)}`;
}

function siteSearchHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    Accept: "application/json,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9,th;q=0.8",
    Referer: "https://www.lazada.co.th/",
    "sec-fetch-dest": "empty",
    "sec-fetch-mode": "cors",
    "sec-fetch-site": "same-origin",
  };
  if (env.lazadaCookie) {
    headers.Cookie = env.lazadaCookie;
  }
  return headers;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }
  return "";
}

function parsePriceThb(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "number" && Number.isFinite(raw) && raw > 0) return raw;
  const value = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(value) || value <= 0 || value > 50_000_000) return undefined;
  return value;
}

function parseSoldCount(raw: unknown): number | undefined {
  if (raw == null) return undefined;
  if (typeof raw === "number" && Number.isFinite(raw) && raw >= 0) return raw;
  const text = String(raw).toLowerCase().replace(/,/g, "").trim();
  const match = text.match(/([\d.]+)\s*([kmb])?/i);
  if (!match) return undefined;
  let n = Number.parseFloat(match[1]);
  if (!Number.isFinite(n)) return undefined;
  const unit = (match[2] || "").toLowerCase();
  if (unit === "k") n *= 1_000;
  if (unit === "m") n *= 1_000_000;
  if (unit === "b") n *= 1_000_000_000;
  return Math.round(n);
}

function absoluteLazadaUrl(raw: string, productId: string): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith("//")) return `https:${raw}`;
  if (raw.startsWith("/")) return `https://www.lazada.co.th${raw}`;
  if (productId) return `https://www.lazada.co.th/products/pdp-i${productId}.html`;
  return "";
}

function normalizeSiteItem(raw: unknown): LazadaSearchResult | null {
  const row = asRecord(raw);
  if (!row) return null;

  const productId = pickString(row.itemId, row.nid, row.item_id, row.productId);
  const title = pickString(row.name, row.title, row.productName);
  if (!productId && !title) return null;

  const itemUrl = pickString(row.itemUrl, row.productUrl, row.url);
  const url = absoluteLazadaUrl(itemUrl, productId);
  if (!url) return null;

  const image = pickString(row.image, row.img, row.imageUrl);
  const price =
    parsePriceThb(row.price) ??
    parsePriceThb(row.priceShow) ??
    parsePriceThb(row.originalPrice);

  return {
    url,
    title: title || undefined,
    image_url: image || undefined,
    site_name: "Lazada",
    price_thb: price,
    shop_name: pickString(row.sellerName, row.shopName, row.brandName) || undefined,
    source_id: productId || undefined,
    sold_count: parseSoldCount(row.itemSoldCntShow ?? row.sold ?? row.volume),
  };
}

export async function searchLazadaSite(
  query: string,
  page = 1,
  pageSize = PAGE_SIZE,
): Promise<LazadaSearchResponse> {
  const cleaned = query.trim();
  if (!cleaned) return { results: [], has_more: false };

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize)
    ? Math.min(Math.max(Math.floor(pageSize), 1), 40)
    : PAGE_SIZE;

  const target = new URL("https://www.lazada.co.th/catalog/");
  target.searchParams.set("_keyori", "ss");
  target.searchParams.set("ajax", "true");
  target.searchParams.set("q", cleaned);
  target.searchParams.set("page", String(safePage));

  const fetchUrl = proxyUrl(target.toString()) ?? target.toString();

  let res: Response;
  try {
    res = await fetch(fetchUrl, {
      headers: siteSearchHeaders(),
      signal: AbortSignal.timeout(20_000),
    });
  } catch (err) {
    console.warn("[BFM] Lazada site search request failed:", err);
    return { results: [], has_more: false, blocked: true };
  }

  const text = await res.text();
  if (!res.ok) {
    console.warn("[BFM] Lazada site search HTTP", res.status, text.slice(0, 160));
    return { results: [], has_more: false, blocked: true };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    const botBlocked = /_____tmd_____|punish|x5secdata|captcha|Access Denied/i.test(text);
    console.warn(
      "[BFM] Lazada site search returned non-JSON",
      botBlocked ? "(bot check)" : "",
      text.slice(0, 120).replace(/\s+/g, " "),
    );
    return { results: [], has_more: false, blocked: true };
  }

  const mods = asRecord(asRecord(payload)?.mods);
  const listItems = mods?.listItems;
  const items = Array.isArray(listItems) ? listItems : [];

  const results = items
    .map(normalizeSiteItem)
    .filter((item): item is LazadaSearchResult => item !== null)
    .slice(0, safeSize);

  return {
    results,
    has_more: items.length >= safeSize,
  };
}
