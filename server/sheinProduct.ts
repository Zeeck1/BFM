import { env } from "./config/env.js";

export interface SheinSearchResult {
  source_id?: string;
  url: string;
  title?: string;
  image_url?: string;
  price_thb?: number;
  sold_count?: number;
  shop_name?: string;
  review_count?: number;
  average_score?: number;
  site_name: "SHEIN";
}

export interface SheinSearchResponse {
  results: SheinSearchResult[];
  has_more: boolean;
  blocked?: boolean;
}

const SEARCH_CACHE_TTL_MS = 15 * 60_000;
const SHEIN_TIMEOUT_MS = 60_000;
/** Used only when RapidAPI returns USD prices (US market fallback). */
const USD_TO_THB = 35;
const searchCache = new Map<string, { expiresAt: number; value: SheinSearchResponse }>();

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
    if (typeof value === "string" && value.trim()) {
      const number = Number(value.replace(/,/g, ""));
      if (Number.isFinite(number) && number > 0) return number;
    }
  }
  return undefined;
}

function pickSoldCount(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) return Math.floor(value);
    if (typeof value === "string" && value.trim()) {
      const cleaned = value.trim().toLowerCase().replace(/,/g, "");
      const match = cleaned.match(/^([\d.]+)\s*([kmb])?\+?$/i);
      if (!match) {
        const asNumber = Number(cleaned.replace(/[^\d.]/g, ""));
        if (Number.isFinite(asNumber) && asNumber >= 0) return Math.floor(asNumber);
        continue;
      }
      const base = Number(match[1]);
      if (!Number.isFinite(base)) continue;
      const suffix = match[2]?.toLowerCase();
      const multiplier = suffix === "k" ? 1_000 : suffix === "m" ? 1_000_000 : suffix === "b" ? 1_000_000_000 : 1;
      return Math.floor(base * multiplier);
    }
  }
  return undefined;
}

function absoluteImage(raw: unknown): string | undefined {
  const value = pickString(raw);
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("//")) return `https:${value}`;
  return `https://img.ltwebstatic.com/${value.replace(/^\/+/, "")}`;
}

function buildSheinProductUrl(goodsId: string, goodsUrlName?: string): string {
  const slug = (goodsUrlName || "product")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `https://th.shein.com/${slug || "product"}-p-${goodsId}.html`;
}

function extractProducts(payload: unknown): unknown[] {
  const root = asRecord(payload);
  if (!root) return [];

  const data = asRecord(root.data);
  const info = asRecord(data?.info);
  const candidates = [
    info?.products,
    data?.products,
    root.products,
    asRecord(root.info)?.products,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) return candidate;
  }
  return [];
}

function normalizeSheinItem(item: unknown, currency: string): SheinSearchResult | null {
  const record = asRecord(item);
  if (!record) return null;

  const goodsId =
    pickString(record.goods_id) ||
    (typeof record.goods_id === "number" ? String(record.goods_id) : undefined) ||
    pickString(record.goodsId);
  if (!goodsId) return null;

  const title =
    pickString(record.goods_name) ||
    pickString(record.goodsName) ||
    pickString(record.goods_url_name) ||
    pickString(record.title);
  if (!title) return null;

  const goodsUrlName = pickString(record.goods_url_name) || pickString(record.goodsUrlName);
  const salePrice = asRecord(record.salePrice);
  const retailPrice = asRecord(record.retailPrice);
  const amount =
    pickNumber(salePrice?.amount) ||
    pickNumber(retailPrice?.amount) ||
    pickNumber(record.sale_price) ||
    pickNumber(record.price);
  const symbol =
    pickString(salePrice?.amountWithSymbol) ||
    pickString(retailPrice?.amountWithSymbol) ||
    "";
  const looksUsd =
    currency.toUpperCase() === "USD" ||
    symbol.includes("$") ||
    /^usd$/i.test(currency);
  const price_thb =
    amount == null
      ? undefined
      : looksUsd
        ? Math.round(amount * USD_TO_THB * 100) / 100
        : amount;

  const image_url =
    absoluteImage(record.goods_img) ||
    absoluteImage(record.goodsColorImage) ||
    absoluteImage(Array.isArray(record.detail_image) ? record.detail_image[0] : undefined);

  const review_count =
    pickSoldCount(record.comment_num) ||
    pickSoldCount(record.comment_num_show) ||
    pickSoldCount(record.review_count);
  const average_score = pickNumber(record.comment_rank_average) || pickNumber(record.average_score);
  const sold_count =
    pickSoldCount(record.sales) ||
    pickSoldCount(record.unit_sales) ||
    pickSoldCount(record.sold_count);

  return {
    source_id: goodsId,
    url: buildSheinProductUrl(goodsId, goodsUrlName),
    title,
    image_url,
    price_thb,
    sold_count,
    shop_name: pickString(record.brand) || pickString(record.store_name) || "SHEIN",
    review_count,
    average_score,
    site_name: "SHEIN",
  };
}

function getCachedSearch(cacheKey: string): SheinSearchResponse | null {
  const cached = searchCache.get(cacheKey);
  if (!cached) return null;
  if (Date.now() > cached.expiresAt) {
    searchCache.delete(cacheKey);
    return null;
  }
  return cached.value;
}

function setCachedSearch(cacheKey: string, value: SheinSearchResponse) {
  searchCache.set(cacheKey, { expiresAt: Date.now() + SEARCH_CACHE_TTL_MS, value });
  if (searchCache.size > 200) {
    const firstKey = searchCache.keys().next().value;
    if (firstKey) searchCache.delete(firstKey);
  }
}

export async function searchSheinProducts(
  query: string,
  page = 1,
  pageSize = 15,
): Promise<SheinSearchResponse> {
  const cleaned = query.trim();
  if (!cleaned) return { results: [], has_more: false };

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safePageSize = Number.isFinite(pageSize)
    ? Math.min(Math.max(Math.floor(pageSize), 1), 40)
    : 15;

  const cacheKey = `${cleaned.toLowerCase()}::${safePage}::${safePageSize}`;
  const cached = getCachedSearch(cacheKey);
  if (cached) return cached;

  if (!env.rapidApiKey) {
    console.warn("[BFM] RAPIDAPI_KEY is not set — SHEIN search disabled");
    return { results: [], has_more: false, blocked: true };
  }

  const preferredCountry = env.rapidApiSheinCountry || "TH";
  const preferredCurrency = env.rapidApiSheinCurrency || "THB";
  const markets = [
    { country: preferredCountry, currency: preferredCurrency },
    // RapidAPI playground default; TH often returns 403 / empty upstream blocks.
    { country: "US", currency: "USD" },
  ].filter(
    (market, index, all) =>
      all.findIndex(
        (item) =>
          item.country.toUpperCase() === market.country.toUpperCase() &&
          item.currency.toUpperCase() === market.currency.toUpperCase(),
      ) === index,
  );

  async function fetchMarket(country: string, currency: string): Promise<{
    ok: boolean;
    status: number;
    payload: unknown;
    text: string;
  }> {
    const url = new URL(`https://${env.rapidApiSheinHost}/products/search`);
    url.searchParams.set("query", cleaned);
    url.searchParams.set("page", String(safePage));
    url.searchParams.set("limit", String(safePageSize));
    url.searchParams.set("country", country);
    url.searchParams.set("language", env.rapidApiSheinLanguage || "en");
    url.searchParams.set("currency", currency);

    async function fetchOnce(): Promise<Response> {
      return fetch(url.toString(), {
        headers: {
          "x-rapidapi-key": env.rapidApiKey,
          "x-rapidapi-host": env.rapidApiSheinHost,
        },
        signal: AbortSignal.timeout(SHEIN_TIMEOUT_MS),
      });
    }

    let res: Response;
    try {
      res = await fetchOnce();
    } catch (firstErr) {
      const timedOut =
        firstErr instanceof Error &&
        (firstErr.name === "TimeoutError" || /aborted due to timeout/i.test(firstErr.message));
      if (!timedOut) throw firstErr;
      console.warn(`[BFM] RapidAPI SHEIN timed out (${country}) — retrying once…`);
      res = await fetchOnce();
    }

    const text = await res.text();
    let payload: unknown = null;
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
    return { ok: res.ok, status: res.status, payload, text };
  }

  try {
    for (const market of markets) {
      const { ok, status, payload, text } = await fetchMarket(market.country, market.currency);

      // 403 with empty upstream body is common when SHEIN blocks a market/region.
      if (!ok) {
        console.warn(
          `[BFM] RapidAPI SHEIN ${status} for ${market.country}/${market.currency}: ${text.slice(0, 160)}`,
        );
        continue;
      }

      if (!payload) {
        console.warn(`[BFM] RapidAPI SHEIN returned invalid JSON for ${market.country}`);
        continue;
      }

      const root = asRecord(payload);
      if (root?.status === false && !asRecord(root.data)?.info) {
        const errors = root.errors;
        const message =
          typeof errors === "string"
            ? errors
            : pickString(asRecord(errors)?.query, asRecord(errors)?.content) ||
              "SHEIN search failed";
        console.warn(`[BFM] RapidAPI SHEIN search error (${market.country}):`, message);
        continue;
      }

      const results = extractProducts(payload)
        .map((item) => normalizeSheinItem(item, market.currency))
        .filter((item): item is SheinSearchResult => item !== null)
        .slice(0, safePageSize);

      if (results.length === 0) {
        console.warn(`[BFM] RapidAPI SHEIN returned 0 products for ${market.country}`);
        continue;
      }

      const total = pickNumber(asRecord(asRecord(asRecord(payload)?.data)?.info)?.num);
      const has_more =
        results.length >= safePageSize &&
        (total == null || safePage * safePageSize < total);

      const response: SheinSearchResponse = { results, has_more };
      setCachedSearch(cacheKey, response);
      if (market.country.toUpperCase() !== preferredCountry.toUpperCase()) {
        console.warn(
          `[BFM] SHEIN search used fallback market ${market.country}/${market.currency}`,
        );
      }
      return response;
    }

    return { results: [], has_more: false, blocked: true };
  } catch (err) {
    console.warn("[BFM] RapidAPI SHEIN search failed:", err);
    return { results: [], has_more: false, blocked: true };
  }
}
