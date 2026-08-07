// server/lazadaAffiliate.ts
// Lazada Affiliate Open API — product feed (HMAC-SHA256 signed).

import { createHmac } from "node:crypto";
import { env } from "./config/env.js";
import type { LazadaSearchResult, LazadaSearchResponse } from "./lazadaProduct.js";

const FEED_PATH = "/marketing/product/feed";
const DEFAULT_LIMIT = 30;

export function isLazadaAffiliateConfigured(): boolean {
  return Boolean(
    env.lazadaAffiliateAppKey &&
      env.lazadaAffiliateAppSecret &&
      env.lazadaAffiliateUserToken,
  );
}

function signLazadaRequest(
  apiPath: string,
  params: Record<string, string>,
  secret: string,
): string {
  const keys = Object.keys(params).sort();
  let payload = apiPath;
  for (const key of keys) {
    payload += `${key}${params[key]}`;
  }
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex").toUpperCase();
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
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

/**
 * Lazada selling price vs original (strike) price.
 * Prefer current/discount/sale fields — those are the live storefront price.
 */
export function extractLazadaOfferPrices(raw: unknown): {
  price_thb?: number;
  original_price_thb?: number;
} {
  const row = asRecord(raw);
  if (!row) return {};

  const nested =
    asRecord(row.price_info) ??
    asRecord(row.priceInfo) ??
    asRecord(row.priceDto) ??
    asRecord(row.sku) ??
    null;

  const selling =
    parsePriceThb(row.current_price) ??
    parsePriceThb(row.currentPrice) ??
    parsePriceThb(row.discountPrice) ??
    parsePriceThb(row.discount_price) ??
    parsePriceThb(row.salePrice) ??
    parsePriceThb(row.sale_price) ??
    parsePriceThb(row.offerPrice) ??
    parsePriceThb(row.special_price) ??
    parsePriceThb(row.specialPrice) ??
    parsePriceThb(row.promotionalPrice) ??
    parsePriceThb(nested?.sale_price) ??
    parsePriceThb(nested?.salePrice) ??
    parsePriceThb(nested?.current_price) ??
    parsePriceThb(nested?.discountPrice) ??
    parsePriceThb(row.price) ??
    parsePriceThb(nested?.price) ??
    parsePriceThb(row.productPrice) ??
    parsePriceThb(row.product_price);

  // List / pre-discount price (strike-through). Prefer explicit original fields,
  // then productPrice / price when those are higher than the selling price.
  const original =
    parsePriceThb(row.originalPrice) ??
    parsePriceThb(row.original_price) ??
    parsePriceThb(row.listPrice) ??
    parsePriceThb(row.list_price) ??
    parsePriceThb(nested?.original_price) ??
    parsePriceThb(row.productPrice) ??
    parsePriceThb(row.product_price) ??
    parsePriceThb(row.price) ??
    parsePriceThb(nested?.price);

  if (selling == null && original == null) return {};
  if (selling == null) return { price_thb: original };
  if (original == null || original <= selling) return { price_thb: selling };
  return { price_thb: selling, original_price_thb: original };
}

function pickImage(value: unknown): string | undefined {
  if (!value) return undefined;
  if (typeof value === "string" && value.trim()) return value.trim();
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === "string" && item.trim()) return item.trim();
      const row = asRecord(item);
      if (row) {
        const nested = pickString(row.url, row.src, row.image, row.picture);
        if (nested) return nested;
      }
    }
  }
  const row = asRecord(value);
  if (row) {
    const nested = pickString(row.url, row.src, row.image, row.picture);
    if (nested) return nested;
  }
  return undefined;
}

function productUrl(productId: string, _feedUrl?: string): string {
  // Always build a normal Lazada PDP from product ID (not affiliate tracking links).
  const id = productId.replace(/^pdp-?/i, "").replace(/^i/i, "").trim();
  return `https://www.lazada.co.th/products/pdp-i${id}.html`;
}

/** Public helper: product ID → Lazada Thailand product page. */
export function lazadaProductPageUrl(productId: string): string {
  return productUrl(productId);
}

function extractFeedRows(payload: unknown): unknown[] {
  const root = asRecord(payload);
  if (!root) return [];

  // Observed shape: { code: "0", result: { success: true, data: [ ...products ] } }
  const resultObj = asRecord(root.result);
  if (resultObj) {
    const nestedData = asArray(resultObj.data);
    if (nestedData.length > 0) return nestedData;
    const nestedList = asArray(
      resultObj.result ?? resultObj.products ?? resultObj.productList ?? resultObj.items ?? resultObj.list,
    );
    if (nestedList.length > 0) return nestedList;
  }

  const data = asRecord(root.data) ?? root;
  const candidates = [
    data.result,
    data.products,
    data.productList,
    data.items,
    data.list,
    data.data,
    root.result,
    root.products,
    root.productList,
  ];

  for (const candidate of candidates) {
    const rows = asArray(candidate);
    if (rows.length > 0) return rows;
    const nested = asRecord(candidate);
    if (nested) {
      const inner = asArray(
        nested.data ?? nested.result ?? nested.products ?? nested.items ?? nested.list,
      );
      if (inner.length > 0) return inner;
    }
  }

  return [];
}

function normalizeFeedItem(raw: unknown): LazadaSearchResult | null {
  const catalog = normalizeCatalogRow(raw, 1);
  if (!catalog) return null;
  return catalogRowToSearchResult(catalog);
}

export interface LazadaCatalogRow {
  product_id: string;
  title: string;
  product_url: string;
  image_url: string | null;
  price_thb: number | null;
  /** Original / list price when higher than the live selling price. */
  original_price_thb?: number | null;
  shop_name: string | null;
  brand_name: string | null;
  category_l1: number | null;
  sold_count: number | null;
  stock: number | null;
  out_of_stock: boolean;
  offer_type: number;
  currency: string | null;
  raw: Record<string, unknown>;
  synced_at?: string;
}

export function catalogRowToSearchResult(row: LazadaCatalogRow): LazadaSearchResult {
  const id = String(row.product_id ?? "").trim();
  const fromRaw = extractLazadaOfferPrices(row.raw);
  const price_thb = fromRaw.price_thb ?? row.price_thb ?? undefined;
  const original_price_thb =
    fromRaw.original_price_thb ??
    (row.original_price_thb != null && price_thb != null && row.original_price_thb > price_thb
      ? row.original_price_thb
      : undefined);
  return {
    url: id ? productUrl(id) : row.product_url,
    title: row.title || undefined,
    image_url: row.image_url ?? undefined,
    site_name: "Lazada",
    price_thb,
    original_price_thb,
    shop_name: row.shop_name ?? row.brand_name ?? undefined,
    source_id: id || undefined,
    sold_count: row.sold_count ?? undefined,
  };
}

export function normalizeCatalogRow(
  raw: unknown,
  offerType = 1,
): LazadaCatalogRow | null {
  const row = asRecord(raw);
  if (!row) return null;

  const productId = pickString(
    row.productId,
    row.product_id,
    row.itemId,
    row.item_id,
    row.id,
  );
  const title = pickString(row.productName, row.product_name, row.name, row.title);
  if (!productId) return null;

  const feedUrl = pickString(
    row.productUrl,
    row.product_url,
    row.trackingLink,
    row.tracking_link,
    row.url,
    row.link,
  );
  const image =
    pickImage(row.pictures) ??
    pickImage(row.picture) ??
    pickImage(row.imageUrl) ??
    pickImage(row.image_url) ??
    pickImage(row.image);

  const offerPrices = extractLazadaOfferPrices(row);

  const soldRaw = row.sales7d ?? row.sales_7d ?? row.soldCount ?? row.sold_count;
  const sold =
    typeof soldRaw === "number" && Number.isFinite(soldRaw)
      ? soldRaw
      : Number.parseInt(String(soldRaw ?? ""), 10);
  const sold_count = Number.isFinite(sold) && sold >= 0 ? sold : null;

  const stockRaw = row.stock;
  const stockNum =
    typeof stockRaw === "number" && Number.isFinite(stockRaw)
      ? stockRaw
      : Number.parseInt(String(stockRaw ?? ""), 10);
  const stock = Number.isFinite(stockNum) ? stockNum : null;

  const categoryRaw = row.categoryL1 ?? row.category_l1;
  const categoryNum =
    typeof categoryRaw === "number" && Number.isFinite(categoryRaw)
      ? categoryRaw
      : Number.parseInt(String(categoryRaw ?? ""), 10);
  const category_l1 = Number.isFinite(categoryNum) ? categoryNum : null;

  const outOfStock = row.outOfStock === true || row.out_of_stock === true;

  return {
    product_id: productId,
    title: title || `Lazada product ${productId}`,
    product_url: productUrl(productId, feedUrl || undefined),
    image_url: image ?? null,
    price_thb: offerPrices.price_thb ?? null,
    original_price_thb: offerPrices.original_price_thb ?? null,
    shop_name:
      pickString(row.sellerName, row.seller_name, row.shopName, row.shop_name) || null,
    brand_name: pickString(row.brandName, row.brand_name) || null,
    category_l1,
    sold_count,
    stock,
    out_of_stock: outOfStock,
    offer_type: offerType,
    currency: pickString(row.currency) || "THB",
    raw: row,
  };
}

export interface LazadaFeedOptions {
  page?: number;
  limit?: number;
  offerType?: number;
  categoryL1?: number;
  /** Required for offerType=2 (MM offer). */
  mmCampaignId?: number;
  /** Required for offerType=3 (DM offer). */
  dmInviteId?: number;
  /** Optional client-side keyword filter (feed API has no server-side search). */
  query?: string;
}

export interface LazadaFeedCatalogPage {
  rows: LazadaCatalogRow[];
  has_more: boolean;
  blocked?: boolean;
}

function rowMatchesQuery(row: LazadaCatalogRow, query: string): boolean {
  const cleaned = query.trim().toLowerCase();
  if (!cleaned) return true;

  // Docs response fields used for matching: productName, brandName, sellerName, productId
  const raw = row.raw ?? {};
  const hay = [
    pickString(raw.productName, row.title),
    pickString(raw.brandName, row.brand_name),
    pickString(raw.sellerName, row.shop_name),
    pickString(raw.productId, row.product_id),
  ]
    .join(" ")
    .toLowerCase();

  if (hay.includes(cleaned)) return true;
  const tokens = cleaned.split(/\s+/).filter(Boolean);
  return tokens.length > 1 && tokens.every((t) => hay.includes(t));
}

/** In-memory Open API feed JSON (offerType=1, all pages) for keyword filtering. */
const FEED_CACHE_TTL_MS = 20 * 60 * 1000;
const QUERY_CACHE_TTL_MS = 10 * 60 * 1000;
let feedCache: {
  key: string;
  fetchedAt: number;
  rows: LazadaCatalogRow[];
  blocked: boolean;
} | null = null;
const queryMatchCache = new Map<
  string,
  { expiresAt: number; matches: LazadaSearchResult[]; feedTotal: number; sampleBrands: string[] }
>();

function feedCacheKey(): string {
  return [
    "regular",
    env.lazadaFeedExpandCategories ? "cats" : "nocats",
    env.lazadaFeedMaxCategories,
    env.lazadaAffiliateMmCampaignIds.join("|"),
    env.lazadaAffiliateDmInviteIds.join("|"),
  ].join(":");
}

/** Load (or reuse) the full Open API feed JSON used for search / catalog page. */
export async function getCachedFullFeedCatalog(
  offerType = 1,
): Promise<{ rows: LazadaCatalogRow[]; blocked?: boolean; cached: boolean; fetchedAt: number | null }> {
  const now = Date.now();
  const key = feedCacheKey();
  if (feedCache && feedCache.key === key && now - feedCache.fetchedAt < FEED_CACHE_TTL_MS) {
    return {
      rows: feedCache.rows,
      blocked: feedCache.blocked,
      cached: true,
      fetchedAt: feedCache.fetchedAt,
    };
  }

  const all = env.lazadaFeedExpandCategories
    ? await fetchExpandedLazadaProductFeedCatalog()
    : await fetchAllLazadaProductFeedCatalogParallel({ offerType });

  feedCache = {
    key,
    fetchedAt: now,
    rows: all.rows,
    blocked: Boolean(all.blocked),
  };
  return {
    rows: all.rows,
    blocked: all.blocked,
    cached: false,
    fetchedAt: now,
  };
}

export interface LazadaFeedSearchResponse extends LazadaSearchResponse {
  /** True when results were filtered by productName/brandName; false = full feed page. */
  matched?: boolean;
  match_count?: number;
  /** Total products loaded from Open API feed for this search. */
  feed_total?: number;
  /** Sample brand names present in the feed (helps empty-state UX). */
  sample_brands?: string[];
}

function sampleBrandsFromRows(rows: LazadaCatalogRow[], limit = 8): string[] {
  const brands: string[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const brand = (row.brand_name || "").trim();
    if (!brand || /^no brand$/i.test(brand)) continue;
    const key = brand.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    brands.push(brand);
    if (brands.length >= limit) break;
  }
  return brands;
}

/**
 * Lazada Affiliate `/marketing/product/feed` search.
 * 1) Fetch full feed JSON from API (parallel pages, cached)
 * 2) Filter EVERY matching product by productName / brandName / sellerName
 * 3) Paginate the complete match list so users can browse all hits
 */
export async function searchLazadaAffiliateFeed(
  query: string,
  page = 1,
  pageSize = DEFAULT_LIMIT,
  offerType = 1,
): Promise<LazadaFeedSearchResponse> {
  if (!isLazadaAffiliateConfigured()) {
    return { results: [], has_more: false, blocked: true, matched: false, match_count: 0 };
  }

  const cleaned = query.trim();
  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize)
    ? Math.min(Math.max(Math.floor(pageSize), 1), 40)
    : DEFAULT_LIMIT;

  // No keyword → paginated feed (docs: page + limit).
  if (!cleaned) {
    const feed = await fetchLazadaProductFeed({ page: safePage, limit: safeSize, offerType });
    return { ...feed, matched: false, match_count: feed.results.length };
  }

  const qKey = `${offerType}::${cleaned.toLowerCase()}`;
  const cachedQuery = queryMatchCache.get(qKey);
  if (cachedQuery && cachedQuery.expiresAt > Date.now()) {
    const start = (safePage - 1) * safeSize;
    const slice = cachedQuery.matches.slice(start, start + safeSize);
    return {
      results: slice,
      has_more: cachedQuery.matches.length > start + safeSize,
      matched: cachedQuery.matches.length > 0,
      match_count: cachedQuery.matches.length,
      feed_total: cachedQuery.feedTotal,
      sample_brands: cachedQuery.sampleBrands,
    };
  }

  // Load complete Open API JSON (or reuse warm cache), then filter all matches.
  const catalog = await getCachedFullFeedCatalog(offerType);
  if (catalog.blocked && catalog.rows.length === 0) {
    return { results: [], has_more: false, blocked: true, matched: false, match_count: 0 };
  }

  const seen = new Set<string>();
  const matches: LazadaSearchResult[] = [];
  for (const row of catalog.rows) {
    if (!rowMatchesQuery(row, cleaned)) continue;
    const id = row.product_id || row.product_url;
    if (id && seen.has(id)) continue;
    if (id) seen.add(id);
    matches.push(catalogRowToSearchResult(row));
  }

  const sample_brands = sampleBrandsFromRows(catalog.rows);
  queryMatchCache.set(qKey, {
    expiresAt: Date.now() + QUERY_CACHE_TTL_MS,
    matches,
    feedTotal: catalog.rows.length,
    sampleBrands: sample_brands,
  });

  const start = (safePage - 1) * safeSize;
  const slice = matches.slice(start, start + safeSize);
  return {
    results: slice,
    has_more: matches.length > start + safeSize,
    matched: matches.length > 0,
    match_count: matches.length,
    feed_total: catalog.rows.length,
    sample_brands,
  };
}

/** Drop in-memory feed after DB sync to free RAM. */
export function clearLazadaAffiliateFeedCache(): void {
  feedCache = null;
  queryMatchCache.clear();
}

/** Warm offerType=1 feed JSON in the background (does not block search). */
export async function preloadLazadaAffiliateFeed(offerType = 1): Promise<void> {
  if (!isLazadaAffiliateConfigured()) return;
  try {
    await getCachedFullFeedCatalog(offerType);
    console.warn(
      `[BFM] Open API feed preload ready: ${feedCache?.rows.length ?? 0} products`,
    );
  } catch (err) {
    console.warn(
      "[BFM] Open API feed preload failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Fetch all pages of one feed source in parallel chunks (faster than sequential). */
export async function fetchAllLazadaProductFeedCatalogParallel(
  options: {
    offerType?: number;
    maxPages?: number;
    pageSize?: number;
    categoryL1?: number;
    mmCampaignId?: number;
    dmInviteId?: number;
  } = {},
): Promise<LazadaFeedCatalogPage & { pages_fetched: number }> {
  if (!isLazadaAffiliateConfigured()) {
    return { rows: [], has_more: false, blocked: true, pages_fetched: 0 };
  }

  const offerType = options.offerType ?? 1;
  const pageSize = Math.min(Math.max(options.pageSize ?? 40, 1), 40);
  const maxPages = Math.min(Math.max(options.maxPages ?? env.lazadaFeedSyncMaxPages, 1), 500);
  const chunkSize = 5;
  const byId = new Map<string, LazadaCatalogRow>();
  let pagesFetched = 0;
  let blocked = false;
  let emptyNewChunks = 0;

  for (let startPage = 1; startPage <= maxPages; startPage += chunkSize) {
    const pages = Array.from({ length: chunkSize }, (_, i) => startPage + i).filter(
      (p) => p <= maxPages,
    );
    const batches = await Promise.all(
      pages.map((page) =>
        fetchLazadaProductFeedCatalog({
          page,
          limit: pageSize,
          offerType,
          categoryL1: options.categoryL1,
          mmCampaignId: options.mmCampaignId,
          dmInviteId: options.dmInviteId,
        }),
      ),
    );

    if (
      startPage === 1 &&
      batches.every((batch) => batch.blocked && batch.rows.length === 0)
    ) {
      blocked = true;
      break;
    }

    let anyRows = false;
    let added = 0;
    for (const batch of batches) {
      if (batch.rows.length === 0) continue;
      anyRows = true;
      pagesFetched += 1;
      for (const row of batch.rows) {
        if (row.product_id && !byId.has(row.product_id)) {
          byId.set(row.product_id, row);
          added += 1;
        }
      }
    }

    // Empty API pages = end of feed. Duplicate-only chunks often appear mid-feed —
    // allow one more chunk before stopping so we don't miss later unique SKUs.
    if (!anyRows) break;
    if (added === 0) {
      emptyNewChunks += 1;
      if (emptyNewChunks >= 2) break;
    } else {
      emptyNewChunks = 0;
    }
  }

  console.warn(
    `[BFM] Lazada Open API feed loaded (parallel): ${byId.size} products (${pagesFetched} page-slots, offerType=${offerType})`,
  );

  return {
    rows: [...byId.values()],
    has_more: false,
    blocked,
    pages_fetched: pagesFetched,
  };
}

export async function fetchLazadaProductFeedCatalog(
  options: LazadaFeedOptions = {},
): Promise<LazadaFeedCatalogPage> {
  if (!isLazadaAffiliateConfigured()) {
    return { rows: [], has_more: false, blocked: true };
  }

  const page = Number.isFinite(options.page) && (options.page as number) > 0
    ? Math.floor(options.page as number)
    : 1;
  const limit = Number.isFinite(options.limit)
    ? Math.min(Math.max(Math.floor(options.limit as number), 1), 40)
    : DEFAULT_LIMIT;
  const offerType = Number.isFinite(options.offerType)
    ? Math.floor(options.offerType as number)
    : 1;

  const params: Record<string, string> = {
    app_key: env.lazadaAffiliateAppKey,
    timestamp: String(Date.now()),
    sign_method: "sha256",
    userToken: env.lazadaAffiliateUserToken,
    offerType: String(offerType),
    page: String(page),
    limit: String(limit),
  };

  if (
    options.categoryL1 != null &&
    Number.isFinite(options.categoryL1) &&
    options.categoryL1 > 0
  ) {
    params.categoryL1 = String(Math.floor(options.categoryL1));
  }
  if (
    options.mmCampaignId != null &&
    Number.isFinite(options.mmCampaignId) &&
    options.mmCampaignId > 0
  ) {
    params.mmCampaignId = String(Math.floor(options.mmCampaignId));
  }
  if (
    options.dmInviteId != null &&
    Number.isFinite(options.dmInviteId) &&
    options.dmInviteId > 0
  ) {
    params.dmInviteId = String(Math.floor(options.dmInviteId));
  }

  const sign = signLazadaRequest(FEED_PATH, params, env.lazadaAffiliateAppSecret);
  const url = new URL(`${env.lazadaAffiliateBaseUrl.replace(/\/$/, "")}${FEED_PATH}`);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("sign", sign);

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(25_000),
    });
  } catch (err) {
    console.warn("[BFM] Lazada affiliate feed request failed:", err);
    return { rows: [], has_more: false, blocked: true };
  }

  const text = await res.text();
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    console.warn("[BFM] Lazada affiliate feed returned invalid JSON:", text.slice(0, 200));
    return { rows: [], has_more: false, blocked: true };
  }

  const root = asRecord(payload);
  const code = pickString(root?.code, root?.error_code, asRecord(root?.error)?.code);
  if (!res.ok || (code && code !== "0" && code.toLowerCase() !== "success")) {
    console.warn(
      "[BFM] Lazada affiliate feed error:",
      code || res.status,
      pickString(root?.message, root?.msg, asRecord(root?.error)?.message).slice(0, 180),
    );
    return { rows: [], has_more: false, blocked: true };
  }

  const rows = extractFeedRows(payload)
    .map((item) => normalizeCatalogRow(item, offerType))
    .filter((item): item is LazadaCatalogRow => item !== null)
    .slice(0, limit);

  // Lazada often returns well under `limit` (e.g. 20–38 of 40) even when more
  // pages exist. Only an empty page means "stop" — never use a near-full threshold.
  const has_more = rows.length > 0;

  return {
    rows,
    has_more,
  };
}

export async function fetchLazadaProductFeed(
  options: LazadaFeedOptions = {},
): Promise<LazadaSearchResponse> {
  const page = await fetchLazadaProductFeedCatalog(options);
  return {
    results: page.rows.map(catalogRowToSearchResult),
    has_more: page.has_more,
    blocked: page.blocked,
  };
}

/** Walk every feed page for one source and return products (deduped by product_id). */
export async function fetchAllLazadaProductFeedCatalog(
  options: {
    offerType?: number;
    maxPages?: number;
    pageSize?: number;
    categoryL1?: number;
    mmCampaignId?: number;
    dmInviteId?: number;
  } = {},
): Promise<LazadaFeedCatalogPage & { pages_fetched: number }> {
  if (!isLazadaAffiliateConfigured()) {
    return { rows: [], has_more: false, blocked: true, pages_fetched: 0 };
  }

  const offerType = options.offerType ?? 1;
  const pageSize = Math.min(Math.max(options.pageSize ?? 40, 1), 40);
  const maxPages = Math.min(Math.max(options.maxPages ?? env.lazadaFeedSyncMaxPages, 1), 500);

  const byId = new Map<string, LazadaCatalogRow>();
  let page = 1;
  let blocked = false;

  // Keep requesting the next page until Lazada returns nothing new.
  while (page <= maxPages) {
    const batch = await fetchLazadaProductFeedCatalog({
      page,
      limit: pageSize,
      offerType,
      categoryL1: options.categoryL1,
      mmCampaignId: options.mmCampaignId,
      dmInviteId: options.dmInviteId,
    });
    if (batch.blocked && batch.rows.length === 0) {
      blocked = page === 1;
      break;
    }
    if (batch.rows.length === 0) break;

    let added = 0;
    for (const row of batch.rows) {
      if (row.product_id && !byId.has(row.product_id)) {
        byId.set(row.product_id, row);
        added += 1;
      }
    }
    if (added === 0) break;
    page += 1;
  }

  const label = [
    `offerType=${offerType}`,
    options.categoryL1 != null ? `categoryL1=${options.categoryL1}` : null,
    options.mmCampaignId != null ? `mmCampaignId=${options.mmCampaignId}` : null,
    options.dmInviteId != null ? `dmInviteId=${options.dmInviteId}` : null,
  ]
    .filter(Boolean)
    .join(" ");

  console.warn(
    `[BFM] Lazada Open API feed loaded: ${byId.size} products across ${Math.max(0, page - 1)} page(s) (${label})`,
  );

  return {
    rows: [...byId.values()],
    has_more: false,
    blocked,
    pages_fetched: Math.max(0, page - 1),
  };
}

/**
 * Expand Open API coverage:
 * 1) offerType=1 (regular)
 * 2) each unique categoryL1 from those products (more SKUs)
 * 3) offerType=2 for configured mmCampaignId list
 * 4) offerType=3 for configured dmInviteId list
 */
export async function fetchExpandedLazadaProductFeedCatalog(
  options: { maxPages?: number; pageSize?: number } = {},
): Promise<LazadaFeedCatalogPage & { pages_fetched: number; sources: number }> {
  if (!isLazadaAffiliateConfigured()) {
    return { rows: [], has_more: false, blocked: true, pages_fetched: 0, sources: 0 };
  }

  const byId = new Map<string, LazadaCatalogRow>();
  let pagesFetched = 0;
  let sources = 0;
  let blocked = false;

  const merge = (part: LazadaFeedCatalogPage & { pages_fetched: number }) => {
    pagesFetched += part.pages_fetched;
    sources += 1;
    if (part.blocked && part.rows.length === 0 && byId.size === 0) blocked = true;
    for (const row of part.rows) {
      if (row.product_id && !byId.has(row.product_id)) {
        byId.set(row.product_id, row);
      }
    }
  };

  // 1) Regular offers (parallel pages)
  merge(await fetchAllLazadaProductFeedCatalogParallel({ offerType: 1, ...options }));

  // 2) Expand by categoryL1 — two discovery rounds pull categories found in newly added SKUs
  if (env.lazadaFeedExpandCategories && env.lazadaFeedMaxCategories > 0) {
    const fetchedCategories = new Set<number>();
    const maxRounds = 2;

    for (let round = 1; round <= maxRounds; round += 1) {
      const discovered = [
        ...new Set(
          [...byId.values()]
            .map((row) => row.category_l1)
            .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0),
        ),
      ].filter((id) => !fetchedCategories.has(id));

      const remainingSlots = env.lazadaFeedMaxCategories - fetchedCategories.size;
      if (remainingSlots <= 0 || discovered.length === 0) break;

      const categories = discovered.slice(0, remainingSlots);
      console.warn(
        `[BFM] Expanding Open API feed round ${round}: ${categories.length} new categoryL1 value(s)…`,
      );

      const catChunk = 4;
      for (let i = 0; i < categories.length; i += catChunk) {
        const slice = categories.slice(i, i + catChunk);
        for (const id of slice) fetchedCategories.add(id);
        const parts = await Promise.all(
          slice.map((categoryL1) =>
            fetchAllLazadaProductFeedCatalogParallel({
              offerType: 1,
              categoryL1,
              ...options,
            }),
          ),
        );
        for (const part of parts) merge(part);
        console.warn(
          `[BFM] Expanded feed progress: ${byId.size} unique products (${fetchedCategories.size}/${env.lazadaFeedMaxCategories} categories, round ${round})`,
        );
      }
    }
  }

  // 3) MM offers (offerType=2) — needs mmCampaignId
  for (const mmCampaignId of env.lazadaAffiliateMmCampaignIds) {
    merge(
      await fetchAllLazadaProductFeedCatalogParallel({
        offerType: 2,
        mmCampaignId,
        ...options,
      }),
    );
  }

  // 4) DM offers (offerType=3) — needs dmInviteId
  for (const dmInviteId of env.lazadaAffiliateDmInviteIds) {
    merge(
      await fetchAllLazadaProductFeedCatalogParallel({
        offerType: 3,
        dmInviteId,
        ...options,
      }),
    );
  }

  console.warn(
    `[BFM] Lazada Open API expanded feed: ${byId.size} unique products from ${sources} source(s), ${pagesFetched} page(s)`,
  );

  return {
    rows: [...byId.values()],
    has_more: false,
    blocked: blocked && byId.size === 0,
    pages_fetched: pagesFetched,
    sources,
  };
}
