// server/routes/fetchPreview.ts
// Fetches Open-Graph / product metadata from an arbitrary URL.

import { Router } from "express";
import { BFM_ERRORS } from "../bfmMessages.js";
import { env } from "../config/env.js";
import {
  isLazadaAffiliateConfigured,
  searchLazadaAffiliateFeed,
  fetchAllLazadaProductFeedCatalog,
  fetchLazadaProductFeedCatalog,
  lazadaProductPageUrl,
} from "../lazadaAffiliate.js";
import {
  getLazadaCatalogStats,
  isRequestUserAdmin,
  listLazadaCatalogPage,
  searchLazadaCatalog,
  syncExpandedFeedToDatabase,
  syncLazadaProductCatalog,
} from "../lazadaCatalog.js";
import { splitProductCopy } from "../productCopy.js";
import { isSupabaseAdminConfigured } from "../supabaseAdmin.js";
import {
  fetchLazadaProductPreview,
  isLazadaProductUrl,
  searchLazadaProducts,
} from "../lazadaProduct.js";
import { getTrendingProducts } from "../trendingProducts.js";

export const fetchPreviewRouter = Router();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const TIMEOUT_MS = 14_000;

/** Return first regex capture group, or "". */
function matchFirst(html: string, ...patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

/** Extract an Open-Graph / meta tag value. */
function meta(html: string, ...keys: string[]): string {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const v = matchFirst(
      html,
      // property="key" content="val"
      new RegExp(
        `<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
      // content="val" property="key"
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`,
        "i",
      ),
      // name="key" content="val"
      new RegExp(
        `<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
      // content="val" name="key"
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["']`,
        "i",
      ),
    );
    if (v) return v;
  }
  return "";
}

function pageTitle(html: string): string {
  const og = meta(html, "og:title", "twitter:title");
  if (og) return og;
  return matchFirst(html, /<title[^>]*>([^<]+)<\/title>/i);
}

/** Absolutise possibly-relative image URLs. */
function absolutify(url: string, base: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return "https:" + url;
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

/** Decode common HTML entities. */
function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

/** Guess a friendly site name from the hostname. */
function siteLabel(url: URL): string {
  const h = url.hostname.replace(/^www\./, "");
  if (h.includes("lazada")) return "Lazada";
  if (h.includes("shopee")) return "Shopee";
  if (h.includes("amazon")) return "Amazon";
  if (h.includes("jd.co")) return "JD";
  if (h.includes("central.co.th")) return "Central";
  if (h.includes("robinson.co.th")) return "Robinson";
  const part = h.split(".")[0];
  return part.charAt(0).toUpperCase() + part.slice(1);
}

/** Basic SSRF guard — block private / loopback addresses. */
function isSafeUrl(url: URL): boolean {
  const h = url.hostname;
  return !(
    h === "localhost" ||
    h.startsWith("127.") ||
    h.startsWith("192.168.") ||
    h.startsWith("10.") ||
    h.startsWith("172.16.") ||
    h === "0.0.0.0" ||
    h === "::1"
  );
}

/** Try to extract a THB price from JSON-LD or OG product tags. */
function extractPrice(html: string): number | undefined {
  // OG product price
  const amount = meta(html, "product:price:amount");
  const currency = meta(html, "product:price:currency");
  if (amount && (!currency || currency.toUpperCase() === "THB")) {
    const n = parseFloat(amount);
    if (n > 0) return n;
  }

  // JSON-LD
  const ldMatch = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (ldMatch?.[1]) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      const offers = ld.offers ?? ld?.["@graph"]?.[0]?.offers;
      const price = offers?.price ?? offers?.lowPrice;
      const curr = offers?.priceCurrency;
      if (price && (!curr || curr.toUpperCase() === "THB")) {
        const n = parseFloat(String(price));
        if (n > 0) return n;
      }
    } catch {
      /* ignore */
    }
  }

  return undefined;
}

// ── Route ─────────────────────────────────────────────────────

fetchPreviewRouter.post("/fetch-preview", async (req, res) => {
  const raw: unknown = (req.body as Record<string, unknown>)?.url;
  const urlStr = typeof raw === "string" ? raw.trim() : "";

  if (!urlStr) {
    res.status(400).json({ error: BFM_ERRORS.previewUrlRequired });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    res.status(400).json({ error: BFM_ERRORS.previewUrlInvalid });
    return;
  }

  if (!isSafeUrl(parsed)) {
    res.status(400).json({ error: BFM_ERRORS.previewUrlNotAllowed });
    return;
  }

  // Lazada: dedicated parser for reliable price extraction
  if (isLazadaProductUrl(urlStr)) {
    const preview = await fetchLazadaProductPreview(urlStr);
    res.json(preview);
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
    });

    // Read only first 400 KB — enough for <head> meta tags
    const reader = response.body?.getReader();
    let html = "";
    if (reader) {
      let bytes = 0;
      while (bytes < 400_000) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        html += new TextDecoder().decode(value);
        bytes += value.byteLength;
      }
      reader.cancel();
    } else {
      html = await response.text();
    }

    const finalUrl = response.url || parsed.toString();
    const title = decodeHtml(pageTitle(html));
    const rawImage = meta(html, "og:image", "twitter:image", "og:image:url");
    const imageUrl = absolutify(rawImage, finalUrl);
    const descriptionRaw = decodeHtml(
      meta(html, "og:description", "twitter:description", "description"),
    );
    const siteName =
      decodeHtml(meta(html, "og:site_name")) || siteLabel(parsed);
    const price_thb = extractPrice(html);
    const split = splitProductCopy(descriptionRaw, title || undefined);

    res.json({
      url: finalUrl,
      title: title || undefined,
      description: split.description || descriptionRaw || undefined,
      highlights: split.highlights.length > 0 ? split.highlights : undefined,
      image_url: imageUrl || undefined,
      site_name: siteName || undefined,
      price_thb: price_thb ?? undefined,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      // Still return a partial success so the link can be saved
      res.json({ url: parsed.toString(), site_name: siteLabel(parsed) });
      return;
    }
    // Network error — return minimal result so the URL can still be saved
    res.json({ url: parsed.toString(), site_name: siteLabel(parsed) });
  } finally {
    clearTimeout(timer);
  }
});

fetchPreviewRouter.post("/lazada-search", async (req, res) => {
  if (!env.productSearchEnabled) {
    res.status(503).json({ error: BFM_ERRORS.searchDisabled });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const raw: unknown = body?.query;
  const query = typeof raw === "string" ? raw.trim() : "";
  const rawPage = body?.page;
  const page =
    typeof rawPage === "number"
      ? rawPage
      : typeof rawPage === "string"
        ? Number.parseInt(rawPage, 10)
        : 1;

  if (!query) {
    res.status(400).json({ error: BFM_ERRORS.searchQueryRequired });
    return;
  }

  if (query.length > 120) {
    res.status(400).json({ error: BFM_ERRORS.searchQueryTooLong });
    return;
  }

  if (!Number.isFinite(page) || page < 1 || page > 100) {
    res.status(400).json({ error: BFM_ERRORS.searchPageInvalid });
    return;
  }

  const { results, has_more, blocked, quota_exceeded, source } =
    await searchLazadaProducts(query, page, 15);

  if (results.length === 0 && blocked) {
    res.status(503).json({
      error: quota_exceeded
        ? BFM_ERRORS.searchQuotaExceeded
        : BFM_ERRORS.searchUnavailable,
      blocked: true,
    });
    return;
  }

  res.json({ results, page, has_more, source: source ?? "rapidapi" });
});

fetchPreviewRouter.get("/trending-products", async (req, res) => {
  const rawLimit = req.query.limit;
  const limit =
    typeof rawLimit === "string"
      ? Number.parseInt(rawLimit, 10)
      : typeof rawLimit === "number"
        ? rawLimit
        : 6;

  try {
    const results = await getTrendingProducts(Number.isFinite(limit) ? limit : 6);
    res.json({ results, limit: results.length });
  } catch (err) {
    console.warn("[BFM] trending-products failed:", err instanceof Error ? err.message : err);
    res.status(503).json({ error: BFM_ERRORS.feedUnavailable, results: [] });
  }
});

fetchPreviewRouter.post("/lazada-feed", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const rawQuery = body?.query;
  const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
  const rawPage = body?.page;
  const page =
    typeof rawPage === "number"
      ? rawPage
      : typeof rawPage === "string"
        ? Number.parseInt(rawPage, 10)
        : 1;
  const rawLimit = body?.limit ?? body?.pageSize;
  const limit =
    typeof rawLimit === "number"
      ? rawLimit
      : typeof rawLimit === "string"
        ? Number.parseInt(rawLimit, 10)
        : 30;

  if (query.length > 120) {
    res.status(400).json({ error: BFM_ERRORS.searchQueryTooLong });
    return;
  }

  if (!Number.isFinite(page) || page < 1 || page > 100) {
    res.status(400).json({ error: BFM_ERRORS.searchPageInvalid });
    return;
  }

  // Home search from Lazada Open API feed data.
  // Prefer synced catalog (every product already pulled from the API).
  // Fall back to live full-feed fetch + local productName/brandName filter.
  // Always search live Open API feed (fetch all pages → filter).
  // Catalog is optional acceleration only when it already has matches.
  if (!isLazadaAffiliateConfigured() && !isSupabaseAdminConfigured()) {
    res.status(503).json({
      error: query ? BFM_ERRORS.searchUnavailable : BFM_ERRORS.feedUnavailable,
      blocked: true,
    });
    return;
  }

  let response = isLazadaAffiliateConfigured()
    ? await searchLazadaAffiliateFeed(query, page, limit)
    : { results: [], has_more: false, matched: false, match_count: 0, feed_total: 0 };
  let source: "catalog" | "affiliate_feed" = "affiliate_feed";

  // If live feed has no keyword hits, try synced catalog as a second pass.
  if (
    query &&
    response.results.length === 0 &&
    !response.blocked &&
    isSupabaseAdminConfigured()
  ) {
    const catalog = await searchLazadaCatalog(query, page, limit);
    if (catalog.results.length > 0) {
      response = {
        ...response,
        results: catalog.results,
        has_more: catalog.has_more,
        matched: true,
        // Page size is not total matches; keep has_more so UI can paginate.
        match_count: catalog.has_more
          ? catalog.results.length + 1
          : catalog.results.length,
      };
      source = "catalog";
    }
  }

  if (response.results.length === 0 && response.blocked) {
    res.status(503).json({
      error: query ? BFM_ERRORS.searchUnavailable : BFM_ERRORS.feedUnavailable,
      blocked: true,
    });
    return;
  }

  res.json({
    results: response.results,
    page,
    has_more: response.has_more,
    query,
    source,
    matched: Boolean(response.matched),
    match_count: response.match_count ?? 0,
    feed_total: response.feed_total ?? 0,
    sample_brands: response.sample_brands ?? [],
  });
});

fetchPreviewRouter.post("/lazada-feed-sync", async (req, res) => {
  const auth = req.headers.authorization;
  const token =
    typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !(await isRequestUserAdmin(token))) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  if (!isLazadaAffiliateConfigured() || !isSupabaseAdminConfigured()) {
    res.status(503).json({ error: BFM_ERRORS.feedNotConfigured });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const rawOfferType = body?.offerType;
  const offerType =
    typeof rawOfferType === "number"
      ? rawOfferType
      : typeof rawOfferType === "string"
        ? Number.parseInt(rawOfferType, 10)
        : 1;
  const rawMax = body?.maxPages;
  const maxPages =
    typeof rawMax === "number"
      ? rawMax
      : typeof rawMax === "string"
        ? Number.parseInt(rawMax, 10)
        : undefined;

  const result = await syncLazadaProductCatalog({
    offerType: Number.isFinite(offerType) ? offerType : 1,
    maxPages:
      maxPages != null && Number.isFinite(maxPages) ? Math.floor(maxPages) : undefined,
  });

  if (!result.ok) {
    res.status(503).json({
      error: result.error_message || BFM_ERRORS.feedUnavailable,
      ...result,
    });
    return;
  }

  res.json(result);
});

fetchPreviewRouter.get("/lazada-catalog-stats", async (req, res) => {
  const auth = req.headers.authorization;
  const token =
    typeof auth === "string" && auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token || !(await isRequestUserAdmin(token))) {
    res.status(403).json({ error: "Admin access required." });
    return;
  }

  const stats = await getLazadaCatalogStats();
  res.json(stats);
});

/**
 * Paginated Feed catalog from Supabase (lean rows).
 * Query: ?q=&page=1&limit=24
 * Optional ?sync=1 to re-sync expanded feed into DB (admin/heavy).
 */
fetchPreviewRouter.get("/lazada-feed-catalog", async (req, res) => {
  const wantSync = req.query.sync === "1" || req.query.sync === "true";
  if (wantSync) {
    if (!isLazadaAffiliateConfigured() || !isSupabaseAdminConfigured()) {
      res.status(503).json({ error: BFM_ERRORS.feedNotConfigured, products: [], total: 0 });
      return;
    }
    const sync = await syncExpandedFeedToDatabase();
    if (!sync.ok) {
      res.status(503).json({
        error: sync.error_message || BFM_ERRORS.feedUnavailable,
        products: [],
        total: 0,
      });
      return;
    }
  }

  const rawQuery = req.query.q ?? req.query.query;
  const query = typeof rawQuery === "string" ? rawQuery.trim() : "";
  const rawPage = req.query.page;
  const page =
    typeof rawPage === "string"
      ? Number.parseInt(rawPage, 10)
      : typeof rawPage === "number"
        ? rawPage
        : 1;
  const rawLimit = req.query.limit;
  const limit =
    typeof rawLimit === "string"
      ? Number.parseInt(rawLimit, 10)
      : typeof rawLimit === "number"
        ? rawLimit
        : 24;

  if (query.length > 120) {
    res.status(400).json({ error: BFM_ERRORS.searchQueryTooLong, products: [], total: 0 });
    return;
  }
  if (!Number.isFinite(page) || page < 1 || page > 500) {
    res.status(400).json({ error: BFM_ERRORS.searchPageInvalid, products: [], total: 0 });
    return;
  }

  try {
    let list = await listLazadaCatalogPage(query, page, limit);
    let stats = await getLazadaCatalogStats();

    // Cold start only when the catalog table is empty — never when a keyword
    // simply has zero matches (that used to kick off a multi-minute sync and 503).
    if (
      stats.product_count === 0 &&
      list.total === 0 &&
      !list.blocked &&
      !wantSync &&
      isLazadaAffiliateConfigured() &&
      isSupabaseAdminConfigured()
    ) {
      const sync = await syncExpandedFeedToDatabase();
      if (sync.ok && sync.products_upserted > 0) {
        list = await listLazadaCatalogPage(query, page, limit);
        stats = await getLazadaCatalogStats();
      }
    }

    if (list.blocked && list.total === 0 && stats.product_count === 0) {
      res.status(503).json({
        error: BFM_ERRORS.feedUnavailable,
        products: [],
        total: 0,
      });
      return;
    }

    res.json({
      source: list.source,
      page: list.page,
      page_size: list.page_size,
      total: list.total,
      has_more: list.has_more,
      query,
      products: list.products,
      catalog_total: stats.product_count,
      last_sync: stats.last_sync,
      live_sync_minutes: env.lazadaFeedLiveSyncMinutes,
    });
  } catch (err) {
    console.warn("[BFM] lazada-feed-catalog failed:", err instanceof Error ? err.message : err);
    res.status(503).json({ error: BFM_ERRORS.feedUnavailable, products: [], total: 0 });
  }
});

fetchPreviewRouter.get("/lazada-feed-sample", async (req, res) => {
  if (!isLazadaAffiliateConfigured()) {
    res.status(503).json({ error: BFM_ERRORS.feedNotConfigured, products: [] });
    return;
  }

  const rawOffer = req.query.offerType;
  const offerType =
    typeof rawOffer === "string"
      ? Number.parseInt(rawOffer, 10)
      : typeof rawOffer === "number"
        ? rawOffer
        : 1;
  const wantAll =
    req.query.all === "1" ||
    req.query.all === "true" ||
    req.query.all === undefined; // sample page defaults to all

  const mapRow = (row: {
    product_id: string;
    title: string;
    image_url: string | null;
    price_thb: number | null;
    shop_name: string | null;
    brand_name: string | null;
    category_l1: number | null;
    sold_count: number | null;
    stock: number | null;
    out_of_stock: boolean;
    offer_type: number;
    currency: string | null;
    product_url: string;
    raw: Record<string, unknown>;
  }) => ({
    product_id: row.product_id,
    product_page_url: lazadaProductPageUrl(row.product_id),
    title: row.title,
    image_url: row.image_url,
    price_thb: row.price_thb,
    shop_name: row.shop_name,
    brand_name: row.brand_name,
    category_l1: row.category_l1,
    sold_count: row.sold_count,
    stock: row.stock,
    out_of_stock: row.out_of_stock,
    offer_type: row.offer_type,
    currency: row.currency,
    product_url: row.product_url,
    api_raw: row.raw,
  });

  if (wantAll) {
    const feed = await fetchAllLazadaProductFeedCatalog({
      offerType: Number.isFinite(offerType) ? offerType : 1,
      pageSize: 40,
    });

    if (feed.blocked && feed.rows.length === 0) {
      res.status(503).json({ error: BFM_ERRORS.feedUnavailable, products: [] });
      return;
    }

    res.json({
      all: true,
      offer_type: Number.isFinite(offerType) ? offerType : 1,
      pages_fetched: feed.pages_fetched,
      has_more: false,
      count: feed.rows.length,
      products: feed.rows.map(mapRow),
    });
    return;
  }

  const rawPage = req.query.page;
  const page =
    typeof rawPage === "string"
      ? Number.parseInt(rawPage, 10)
      : typeof rawPage === "number"
        ? rawPage
        : 1;
  const rawLimit = req.query.limit;
  const limit =
    typeof rawLimit === "string"
      ? Number.parseInt(rawLimit, 10)
      : typeof rawLimit === "number"
        ? rawLimit
        : 40;

  if (!Number.isFinite(page) || page < 1 || page > 100) {
    res.status(400).json({ error: BFM_ERRORS.searchPageInvalid });
    return;
  }

  const feed = await fetchLazadaProductFeedCatalog({
    page: Number.isFinite(page) ? page : 1,
    limit: Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 40) : 40,
    offerType: Number.isFinite(offerType) ? offerType : 1,
  });

  if (feed.blocked && feed.rows.length === 0) {
    res.status(503).json({ error: BFM_ERRORS.feedUnavailable, products: [] });
    return;
  }

  res.json({
    all: false,
    page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    limit: Number.isFinite(limit) ? Math.min(Math.max(Math.floor(limit), 1), 40) : 40,
    offer_type: Number.isFinite(offerType) ? offerType : 1,
    has_more: feed.has_more,
    count: feed.rows.length,
    products: feed.rows.map(mapRow),
  });
});
