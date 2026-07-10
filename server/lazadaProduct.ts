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

export interface LazadaSearchResult extends LazadaPreviewResult {
  source_id?: string;
}

export interface LazadaSearchResponse {
  results: LazadaSearchResult[];
  has_more: boolean;
  /** True when Lazada served a bot-check page instead of product data. */
  blocked?: boolean;
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

function pickString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

function pickNumber(value: unknown): number | undefined {
  if (typeof value === "number") return parsePriceThb(value);
  if (typeof value === "string") return parsePriceThb(value);
  return undefined;
}

function absoluteLazadaUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  try {
    return new URL(value, "https://www.lazada.co.th").toString();
  } catch {
    return undefined;
  }
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

/** Wrap a target URL with the configured scraping proxy, if any. */
function proxiedUrl(targetUrl: string): string | null {
  if (!env.lazadaProxyUrl) return null;
  if (env.lazadaProxyUrl.includes("{url}")) {
    return env.lazadaProxyUrl.replace("{url}", encodeURIComponent(targetUrl));
  }
  // No placeholder — assume the proxy accepts ?url= appended
  const sep = env.lazadaProxyUrl.includes("?") ? "&" : "?";
  return `${env.lazadaProxyUrl}${sep}url=${encodeURIComponent(targetUrl)}`;
}

/** True when the payload contains Lazada bot-check / captcha markers. */
function looksBlocked(payload: string): boolean {
  if (!payload) return true;
  return /punish|captcha|baxia|slide to verify|unusual traffic/i.test(payload);
}

const SEARCH_CACHE_TTL_MS = 15 * 60_000;
const searchCache = new Map<string, { expiresAt: number; value: LazadaSearchResponse }>();

function getCachedSearch(key: string): LazadaSearchResponse | null {
  const hit = searchCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    searchCache.delete(key);
    return null;
  }
  return hit.value;
}

function setCachedSearch(key: string, value: LazadaSearchResponse) {
  searchCache.set(key, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, value });
  // Keep cache bounded
  if (searchCache.size > 200) {
    const oldest = searchCache.keys().next().value;
    if (oldest) searchCache.delete(oldest);
  }
}

async function fetchViaProxy(targetUrl: string, accept: string, maxBytes: number): Promise<string> {
  const proxy = proxiedUrl(targetUrl);
  if (!proxy) throw new Error("No Lazada proxy configured");

  const PROXY_TIMEOUT_MS = 55_000;
  let lastError: unknown;

  // One retry helps with intermittent ScraperAPI failures
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const viaProxy = await fetch(proxy, {
        headers: { Accept: accept },
        redirect: "follow",
        signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
      });
      if (!viaProxy.ok) {
        lastError = new Error(`Proxy HTTP ${viaProxy.status}`);
        continue;
      }
      return await readResponseText(viaProxy, maxBytes);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Lazada proxy fetch failed");
}

/**
 * Fetch Lazada content.
 * - If a proxy is configured, go straight to it (direct Lazada is almost always blocked).
 * - Otherwise try a short direct request.
 */
async function fetchLazadaText(
  targetUrl: string,
  accept: string,
  _timeoutMs: number,
  maxBytes: number,
  isValid: (payload: string) => boolean,
): Promise<string> {
  // Prefer proxy when configured — avoids wasting ~8s on a blocked direct request.
  if (env.lazadaProxyUrl) {
    const text = await fetchViaProxy(targetUrl, accept, maxBytes);
    if (!isValid(text)) {
      throw new Error("Lazada proxy returned blocked or empty content");
    }
    return text;
  }

  const DIRECT_TIMEOUT_MS = 8_000;
  const direct = await fetch(targetUrl, {
    signal: AbortSignal.timeout(DIRECT_TIMEOUT_MS),
    headers: { ...buildHeaders(), Accept: accept },
    redirect: "follow",
  });
  const directText = await readResponseText(direct, maxBytes);
  if (!isValid(directText)) {
    throw new Error("Lazada direct fetch blocked");
  }
  return directText;
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

function findMatchingBracket(source: string, startIndex: number): number {
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;

  for (let i = startIndex; i < source.length; i += 1) {
    const char = source[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === quote) {
        inString = false;
      }
      continue;
    }

    if (char === "\"" || char === "'") {
      inString = true;
      quote = char;
      continue;
    }

    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function readSearchListItems(payload: string): unknown[] {
  try {
    const parsed = JSON.parse(payload) as {
      mods?: { listItems?: unknown[] };
      mainInfo?: { totalResults?: number };
    };
    if (Array.isArray(parsed?.mods?.listItems)) {
      return parsed.mods.listItems;
    }
  } catch {
    /* ignore and fallback to bracket parsing */
  }

  const keyIndex = payload.indexOf('"listItems"');
  if (keyIndex === -1) return [];

  const arrayStart = payload.indexOf("[", keyIndex);
  if (arrayStart === -1) return [];

  const arrayEnd = findMatchingBracket(payload, arrayStart);
  if (arrayEnd === -1) return [];

  try {
    const parsed = JSON.parse(payload.slice(arrayStart, arrayEnd + 1));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function normalizeSearchItem(item: unknown): LazadaSearchResult | null {
  if (!item || typeof item !== "object") return null;

  const record = item as Record<string, unknown>;
  const rawUrl =
    pickString(record.itemUrl) ||
    pickString(record.productUrl) ||
    pickString(record.url);
  const url = absoluteLazadaUrl(rawUrl);
  if (!url) return null;

  const title =
    pickString(record.name) ||
    pickString(record.title) ||
    pickString(record.productName);
  if (!title) return null;

  const image_url = absoluteLazadaUrl(
    pickImage(record.image) ||
      pickImage(record.imageUrl) ||
      pickImage(record.img) ||
      pickImage(record.productImage),
  );

  const price_thb =
    pickNumber(record.price) ||
    pickNumber(record.priceShow) ||
    pickNumber(record.salePrice) ||
    pickNumber(record.discountPrice);

  return {
    source_id: pickString(record.nid) || pickString(record.itemId) || pickString(record.skuId),
    url,
    title: decodeHtml(title),
    image_url,
    price_thb,
    site_name: "Lazada",
  };
}

function uniqueSearchResults(results: LazadaSearchResult[]): LazadaSearchResult[] {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = result.source_id || result.url;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function extractRapidApiItems(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  if (!root) return [];

  const candidates = [
    root.items,
    root.data,
    root.result,
    root.products,
    asRecord(root.data)?.items,
    asRecord(root.data)?.list,
    asRecord(root.data)?.products,
    asRecord(root.result)?.items,
    asRecord(root.result)?.list,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function normalizeRapidApiItem(item: unknown): LazadaSearchResult | null {
  if (!item || typeof item !== "object") return null;
  const record = item as Record<string, unknown>;

  const rawUrl =
    pickString(record.item_url) ||
    pickString(record.product_url) ||
    pickString(record.itemUrl) ||
    pickString(record.productUrl) ||
    pickString(record.url) ||
    pickString(record.link);
  const sourceId =
    pickString(record.item_id) ||
    pickString(record.itemId) ||
    pickString(record.product_id) ||
    pickString(record.productId) ||
    pickString(record.nid) ||
    (typeof record.item_id === "number" ? String(record.item_id) : undefined) ||
    (typeof record.itemId === "number" ? String(record.itemId) : undefined);

  const url =
    absoluteLazadaUrl(rawUrl) ||
    (sourceId ? `https://www.lazada.co.th/products/pdp-i${sourceId}.html` : undefined);
  if (!url) return null;

  const title =
    pickString(record.title) ||
    pickString(record.name) ||
    pickString(record.product_title) ||
    pickString(record.productName);
  if (!title) return null;

  const image_url = absoluteLazadaUrl(
    pickImage(record.image) ||
      pickImage(record.img) ||
      pickImage(record.thumbnail) ||
      pickImage(record.main_image) ||
      pickImage(record.productImage) ||
      pickImage(record.pic_url),
  );

  const price_thb =
    pickNumber(record.price) ||
    pickNumber(record.sale_price) ||
    pickNumber(record.salePrice) ||
    pickNumber(record.sku_price) ||
    pickNumber(record.price_info) ||
    pickNumber(asRecord(record.price_info)?.sale_price) ||
    pickNumber(asRecord(record.price_info)?.price);

  return {
    source_id: sourceId,
    url,
    title: decodeHtml(title),
    image_url,
    price_thb,
    site_name: "Lazada",
  };
}

/** Fast Lazada search via RapidAPI (TMAPI Lazada API). */
async function searchViaRapidApi(
  query: string,
  page: number,
  pageSize: number,
): Promise<LazadaSearchResponse | null> {
  if (!env.rapidApiKey) return null;

  const url = new URL(`https://${env.rapidApiLazadaHost}/lazada/search/items`);
  url.searchParams.set("keywords", query);
  url.searchParams.set("site", "th");
  url.searchParams.set("page", String(page));
  url.searchParams.set("sort", "pop");

  const res = await fetch(url.toString(), {
    headers: {
      "x-rapidapi-key": env.rapidApiKey,
      "x-rapidapi-host": env.rapidApiLazadaHost,
    },
    signal: AbortSignal.timeout(20_000),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`RapidAPI Lazada ${res.status}: ${text.slice(0, 180)}`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("RapidAPI Lazada returned invalid JSON");
  }

  const items = extractRapidApiItems(payload);
  const results = uniqueSearchResults(
    items
      .map(normalizeRapidApiItem)
      .filter((item): item is LazadaSearchResult => item !== null),
  ).slice(0, pageSize);

  if (results.length === 0) return { results: [], has_more: false };
  return { results, has_more: results.length >= pageSize };
}

export async function searchLazadaProducts(
  query: string,
  page = 1,
  pageSize = 14,
): Promise<LazadaSearchResponse> {
  const cleaned = query.trim();
  if (!cleaned) return { results: [], has_more: false };
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize = Number.isFinite(pageSize) ? Math.min(Math.max(Math.floor(pageSize), 1), 40) : 14;

  const cacheKey = `${cleaned.toLowerCase()}::${safePage}::${safePageSize}`;
  const cached = getCachedSearch(cacheKey);
  if (cached) return cached;

  if (!env.rapidApiKey) {
    console.warn("[BFM] RAPIDAPI_KEY is not set — Lazada search disabled");
    return { results: [], has_more: false, blocked: true };
  }

  try {
    const rapid = await searchViaRapidApi(cleaned, safePage, safePageSize);
    if (rapid && rapid.results.length > 0) {
      setCachedSearch(cacheKey, rapid);
      return rapid;
    }
    return rapid ?? { results: [], has_more: false };
  } catch (err) {
    console.warn("[BFM] RapidAPI Lazada search failed:", err);
    return { results: [], has_more: false, blocked: true };
  }
}

export async function fetchLazadaProductPreview(rawUrl: string): Promise<LazadaPreviewResult> {
  const url = new URL(rawUrl.trim());
  url.hash = "";
  const normalized = url.toString();

  try {
    const html = await fetchLazadaText(
      normalized,
      "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      25_000,
      900_000,
      (payload) => !looksBlocked(payload) && /og:title|application\/ld\+json/i.test(payload),
    );
    const finalUrl = normalized;

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
  }
}
