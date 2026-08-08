// server/lazadaCatalog.ts
// Sync Lazada Affiliate feed into Supabase and search the local catalog.

import { createClient } from "@supabase/supabase-js";
import { env } from "./config/env.js";
import {
  catalogRowToSearchResult,
  clearLazadaAffiliateFeedCache,
  extractLazadaOfferPrices,
  fetchLazadaProductFeedCatalog,
  getCachedFullFeedCatalog,
  isLazadaAffiliateConfigured,
  lazadaProductPageUrl,
  type LazadaCatalogRow,
} from "./lazadaAffiliate.js";
import type { LazadaSearchResult, LazadaSearchResponse } from "./lazadaProduct.js";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "./supabaseAdmin.js";

const PAGE_LIMIT = 40;
const UPSERT_CHUNK = 100;

export interface CatalogSyncResult {
  ok: boolean;
  status: "success" | "failed";
  pages_fetched: number;
  products_upserted: number;
  error_message?: string;
  run_id?: string;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Postgres `integer` range — Lazada sometimes sends sentinel values like 200000000000. */
const PG_INT_MAX = 2_147_483_647;
const PG_INT_MIN = -2_147_483_648;

function toPgInt(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  const n = Math.trunc(value);
  if (n > PG_INT_MAX || n < PG_INT_MIN) return null;
  return n;
}

/**
 * Full DB row: indexed columns for search/UI + complete Open API object in `raw`.
 * Out-of-range sold/stock stay in `raw` only so upsert never fails.
 */
function toDbRow(row: LazadaCatalogRow) {
  return {
    product_id: row.product_id,
    title: row.title || "",
    product_url: row.product_url || lazadaProductPageUrl(row.product_id),
    image_url: row.image_url,
    price_thb: row.price_thb,
    shop_name: row.shop_name,
    brand_name: row.brand_name,
    category_l1: row.category_l1,
    sold_count: toPgInt(row.sold_count),
    stock: toPgInt(row.stock),
    out_of_stock: row.out_of_stock,
    offer_type: toPgInt(row.offer_type) ?? 1,
    currency: row.currency || "THB",
    // Keep every field Lazada returned (productName, pictures, trackingLink, etc.)
    raw: row.raw && typeof row.raw === "object" ? row.raw : {},
    synced_at: new Date().toISOString(),
  };
}

async function upsertCatalogRows(
  supabase: NonNullable<ReturnType<typeof getSupabaseAdmin>>,
  rows: LazadaCatalogRow[],
): Promise<number> {
  let upserted = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK).map(toDbRow);
    const { error } = await supabase.from("lazada_products").upsert(chunk, {
      onConflict: "product_id",
    });
    if (error) throw new Error(error.message);
    upserted += chunk.length;
  }
  return upserted;
}

export interface LeanCatalogProduct {
  product_id: string;
  product_page_url: string;
  title: string;
  image_url: string | null;
  price_thb: number | null;
  original_price_thb: number | null;
  shop_name: string | null;
  brand_name: string | null;
  category_l1: number | null;
  sold_count: number | null;
  stock: number | null;
  out_of_stock: boolean;
  offer_type: number;
  currency: string | null;
  product_url: string;
}

function mapLeanProduct(row: Record<string, unknown>): LeanCatalogProduct {
  const product_id = String(row.product_id ?? "");
  const product_url = String(row.product_url ?? "") || lazadaProductPageUrl(product_id);
  const fromRaw = extractLazadaOfferPrices(row.raw);
  const storedPrice =
    typeof row.price_thb === "number"
      ? row.price_thb
      : row.price_thb != null
        ? Number(row.price_thb)
        : null;
  const price_thb = fromRaw.price_thb ?? (Number.isFinite(storedPrice) ? storedPrice : null);
  const original_price_thb =
    fromRaw.original_price_thb != null &&
    price_thb != null &&
    fromRaw.original_price_thb > price_thb
      ? fromRaw.original_price_thb
      : null;
  return {
    product_id,
    product_page_url: lazadaProductPageUrl(product_id) || product_url,
    title: String(row.title ?? ""),
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    price_thb,
    original_price_thb,
    shop_name: typeof row.shop_name === "string" ? row.shop_name : null,
    brand_name: typeof row.brand_name === "string" ? row.brand_name : null,
    category_l1:
      typeof row.category_l1 === "number"
        ? row.category_l1
        : row.category_l1 != null
          ? Number(row.category_l1)
          : null,
    sold_count:
      typeof row.sold_count === "number"
        ? row.sold_count
        : row.sold_count != null
          ? Number(row.sold_count)
          : null,
    stock:
      typeof row.stock === "number" ? row.stock : row.stock != null ? Number(row.stock) : null,
    out_of_stock: row.out_of_stock === true,
    offer_type: typeof row.offer_type === "number" ? row.offer_type : 1,
    currency: typeof row.currency === "string" ? row.currency : "THB",
    product_url,
  };
}

let expandedSyncInFlight: Promise<CatalogSyncResult> | null = null;

/**
 * Upsert the expanded Open API feed into Supabase (full rows + raw), then free memory cache.
 * Concurrent callers share one in-flight sync (live interval + manual Sync button).
 */
export async function syncExpandedFeedToDatabase(): Promise<CatalogSyncResult> {
  if (expandedSyncInFlight) return expandedSyncInFlight;
  expandedSyncInFlight = runExpandedFeedSync().finally(() => {
    expandedSyncInFlight = null;
  });
  return expandedSyncInFlight;
}

async function runExpandedFeedSync(): Promise<CatalogSyncResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      ok: false,
      status: "failed",
      pages_fetched: 0,
      products_upserted: 0,
      error_message: "Supabase service role is not configured",
    };
  }
  if (!isLazadaAffiliateConfigured()) {
    return {
      ok: false,
      status: "failed",
      pages_fetched: 0,
      products_upserted: 0,
      error_message: "Lazada Affiliate credentials are not configured",
    };
  }

  const { data: run, error: runError } = await supabase
    .from("lazada_feed_sync_runs")
    .insert({
      status: "running",
      offer_type: 1,
      pages_fetched: 0,
      products_upserted: 0,
    })
    .select("id")
    .single();

  if (runError || !run?.id) {
    return {
      ok: false,
      status: "failed",
      pages_fetched: 0,
      products_upserted: 0,
      error_message: runError?.message || "Could not start sync run",
    };
  }

  const runId = run.id as string;

  try {
    // Force a fresh Open API pull for live updates (ignore warm memory cache).
    clearLazadaAffiliateFeedCache();
    const catalog = await getCachedFullFeedCatalog(1);
    if (catalog.blocked && catalog.rows.length === 0) {
      throw new Error("Lazada feed request failed or was blocked");
    }

    const productsUpserted = await upsertCatalogRows(supabase, catalog.rows);

    await supabase
      .from("lazada_feed_sync_runs")
      .update({
        status: "success",
        pages_fetched: 0,
        products_upserted: productsUpserted,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    clearLazadaAffiliateFeedCache();
    console.warn(
      `[BFM] Synced ${productsUpserted} affiliate products to database (full API raw JSON)`,
    );

    return {
      ok: true,
      status: "success",
      pages_fetched: 0,
      products_upserted: productsUpserted,
      run_id: runId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Catalog sync failed";
    await supabase
      .from("lazada_feed_sync_runs")
      .update({
        status: "failed",
        error_message: message.slice(0, 500),
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return {
      ok: false,
      status: "failed",
      pages_fetched: 0,
      products_upserted: 0,
      error_message: message,
      run_id: runId,
    };
  }
}

export type CatalogSort = "default" | "price_asc" | "price_desc" | "popular";

export function normalizeCatalogSort(raw: unknown): CatalogSort {
  if (raw === "price_desc" || raw === "popular" || raw === "price_asc" || raw === "default") {
    return raw;
  }
  return "default";
}

/** Paginated browse/search against DB (lean products for Feed page). */
export async function listLazadaCatalogPage(
  query = "",
  page = 1,
  pageSize = 24,
  sort: CatalogSort = "default",
): Promise<{
  products: LeanCatalogProduct[];
  page: number;
  page_size: number;
  total: number;
  has_more: boolean;
  source: "database";
  blocked?: boolean;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !isSupabaseAdminConfigured()) {
    return {
      products: [],
      page: 1,
      page_size: pageSize,
      total: 0,
      has_more: false,
      source: "database",
      blocked: true,
    };
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize)
    ? Math.min(Math.max(Math.floor(pageSize), 1), 48)
    : 24;
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize - 1;
  const cleaned = query.trim();
  const catalogSort = normalizeCatalogSort(sort);

  let builder = supabase
    .from("lazada_products")
    .select(
      "product_id, title, product_url, image_url, price_thb, shop_name, brand_name, category_l1, sold_count, stock, out_of_stock, offer_type, currency, raw",
      { count: "exact" },
    );

  if (catalogSort === "price_desc") {
    builder = builder
      .order("price_thb", { ascending: false, nullsFirst: false })
      .order("sold_count", { ascending: false, nullsFirst: false });
  } else if (catalogSort === "price_asc") {
    builder = builder
      .order("price_thb", { ascending: true, nullsFirst: false })
      .order("sold_count", { ascending: false, nullsFirst: false });
  } else if (catalogSort === "popular") {
    builder = builder
      .order("sold_count", { ascending: false, nullsFirst: false })
      .order("price_thb", { ascending: true, nullsFirst: false });
  } else {
    // Default: natural catalog order (no price filter applied until user chooses)
    builder = builder
      .order("synced_at", { ascending: false, nullsFirst: false })
      .order("product_id", { ascending: true });
  }

  builder = builder.range(from, to);

  if (cleaned) {
    const safe = cleaned.replace(/[%_,.()]/g, " ").replace(/\s+/g, " ").trim();
    if (safe) {
      const pattern = `%${safe}%`;
      builder = builder.or(
        [
          `title.ilike."${pattern}"`,
          `shop_name.ilike."${pattern}"`,
          `brand_name.ilike."${pattern}"`,
          `product_id.ilike."${pattern}"`,
        ].join(","),
      );
    }
  }

  const { data, error, count } = await builder;
  if (error) {
    console.warn("[BFM] Lazada catalog list failed:", error.message);
    return {
      products: [],
      page: safePage,
      page_size: safeSize,
      total: 0,
      has_more: false,
      source: "database",
      blocked: true,
    };
  }

  const total = count ?? 0;
  const products = ((data ?? []) as Record<string, unknown>[]).map(mapLeanProduct);

  return {
    products,
    page: safePage,
    page_size: safeSize,
    total,
    has_more: from + products.length < total,
    source: "database",
  };
}

export async function syncLazadaProductCatalog(
  options: { offerType?: number; maxPages?: number } = {},
): Promise<CatalogSyncResult> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return {
      ok: false,
      status: "failed",
      pages_fetched: 0,
      products_upserted: 0,
      error_message: "Supabase service role is not configured",
    };
  }
  if (!isLazadaAffiliateConfigured()) {
    return {
      ok: false,
      status: "failed",
      pages_fetched: 0,
      products_upserted: 0,
      error_message: "Lazada Affiliate credentials are not configured",
    };
  }

  const offerType = options.offerType ?? 1;
  const maxPages = options.maxPages ?? env.lazadaFeedSyncMaxPages;

  const { data: run, error: runError } = await supabase
    .from("lazada_feed_sync_runs")
    .insert({
      status: "running",
      offer_type: offerType,
      pages_fetched: 0,
      products_upserted: 0,
    })
    .select("id")
    .single();

  if (runError || !run?.id) {
    return {
      ok: false,
      status: "failed",
      pages_fetched: 0,
      products_upserted: 0,
      error_message: runError?.message || "Could not start sync run",
    };
  }

  const runId = run.id as string;
  let pagesFetched = 0;
  let productsUpserted = 0;

  try {
    for (let page = 1; page <= maxPages; page += 1) {
      const feed = await fetchLazadaProductFeedCatalog({
        page,
        limit: PAGE_LIMIT,
        offerType,
      });

      if (feed.blocked) {
        throw new Error("Lazada feed request failed or was blocked");
      }
      if (feed.rows.length === 0) break;

      pagesFetched += 1;

      for (let i = 0; i < feed.rows.length; i += UPSERT_CHUNK) {
        const chunk = feed.rows.slice(i, i + UPSERT_CHUNK).map(toDbRow);
        const { error } = await supabase.from("lazada_products").upsert(chunk, {
          onConflict: "product_id",
        });
        if (error) throw new Error(error.message);
        productsUpserted += chunk.length;
      }

      await supabase
        .from("lazada_feed_sync_runs")
        .update({
          pages_fetched: pagesFetched,
          products_upserted: productsUpserted,
        })
        .eq("id", runId);

      if (!feed.has_more) break;
      await sleep(350);
    }

    await supabase
      .from("lazada_feed_sync_runs")
      .update({
        status: "success",
        pages_fetched: pagesFetched,
        products_upserted: productsUpserted,
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return {
      ok: true,
      status: "success",
      pages_fetched: pagesFetched,
      products_upserted: productsUpserted,
      run_id: runId,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Catalog sync failed";
    await supabase
      .from("lazada_feed_sync_runs")
      .update({
        status: "failed",
        pages_fetched: pagesFetched,
        products_upserted: productsUpserted,
        error_message: message.slice(0, 500),
        finished_at: new Date().toISOString(),
      })
      .eq("id", runId);

    return {
      ok: false,
      status: "failed",
      pages_fetched: pagesFetched,
      products_upserted: productsUpserted,
      error_message: message,
      run_id: runId,
    };
  }
}

function mapDbProduct(row: Record<string, unknown>): LazadaSearchResult {
  const catalog: LazadaCatalogRow = {
    product_id: String(row.product_id ?? ""),
    title: String(row.title ?? ""),
    product_url: String(row.product_url ?? ""),
    image_url: typeof row.image_url === "string" ? row.image_url : null,
    price_thb:
      typeof row.price_thb === "number"
        ? row.price_thb
        : row.price_thb != null
          ? Number(row.price_thb)
          : null,
    shop_name: typeof row.shop_name === "string" ? row.shop_name : null,
    brand_name: typeof row.brand_name === "string" ? row.brand_name : null,
    category_l1:
      typeof row.category_l1 === "number"
        ? row.category_l1
        : row.category_l1 != null
          ? Number(row.category_l1)
          : null,
    sold_count:
      typeof row.sold_count === "number"
        ? row.sold_count
        : row.sold_count != null
          ? Number(row.sold_count)
          : null,
    stock:
      typeof row.stock === "number" ? row.stock : row.stock != null ? Number(row.stock) : null,
    out_of_stock: row.out_of_stock === true,
    offer_type: typeof row.offer_type === "number" ? row.offer_type : 1,
    currency: typeof row.currency === "string" ? row.currency : "THB",
    raw: (row.raw as Record<string, unknown>) ?? {},
  };
  return catalogRowToSearchResult(catalog);
}

export async function searchLazadaCatalog(
  query: string,
  page = 1,
  pageSize = 15,
): Promise<LazadaSearchResponse> {
  const supabase = getSupabaseAdmin();
  if (!supabase || !isSupabaseAdminConfigured()) {
    return { results: [], has_more: false, blocked: true };
  }

  const safePage = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const safeSize = Number.isFinite(pageSize)
    ? Math.min(Math.max(Math.floor(pageSize), 1), 40)
    : 15;
  const from = (safePage - 1) * safeSize;
  const to = from + safeSize; // fetch one extra for has_more
  const cleaned = query.trim();

  let builder = supabase
    .from("lazada_products")
    .select(
      "product_id, title, product_url, image_url, price_thb, shop_name, brand_name, category_l1, sold_count, stock, out_of_stock, offer_type, currency, raw",
    )
    .eq("out_of_stock", false)
    .order("sold_count", { ascending: false, nullsFirst: false })
    .order("synced_at", { ascending: false })
    .range(from, to);

  if (cleaned) {
    // Keep PostgREST .or() filter safe (no commas / wildcards from user input).
    const safe = cleaned.replace(/[%_,.()]/g, " ").replace(/\s+/g, " ").trim();
    if (safe) {
      const pattern = `%${safe}%`;
      // Search synced Affiliate feed JSON fields (title = productName from API).
      builder = builder.or(
        [
          `title.ilike."${pattern}"`,
          `shop_name.ilike."${pattern}"`,
          `brand_name.ilike."${pattern}"`,
          `product_id.ilike."${pattern}"`,
        ].join(","),
      );
    }
  }

  const { data, error } = await builder;
  if (error) {
    console.warn("[BFM] Lazada catalog search failed:", error.message);
    return { results: [], has_more: false, blocked: true };
  }

  const rows = (data ?? []) as Record<string, unknown>[];
  const has_more = rows.length > safeSize;
  const pageRows = has_more ? rows.slice(0, safeSize) : rows;

  return {
    results: pageRows.map(mapDbProduct),
    has_more,
  };
}

export async function getLazadaCatalogStats(): Promise<{
  product_count: number;
  last_sync: {
    status: string;
    products_upserted: number;
    pages_fetched: number;
    started_at: string;
    finished_at: string | null;
    error_message: string | null;
  } | null;
}> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return { product_count: 0, last_sync: null };

  const [{ count }, { data: last }] = await Promise.all([
    supabase.from("lazada_products").select("*", { count: "exact", head: true }),
    supabase
      .from("lazada_feed_sync_runs")
      .select(
        "status, products_upserted, pages_fetched, started_at, finished_at, error_message",
      )
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    product_count: count ?? 0,
    last_sync: last
      ? {
          status: String(last.status),
          products_upserted: Number(last.products_upserted ?? 0),
          pages_fetched: Number(last.pages_fetched ?? 0),
          started_at: String(last.started_at),
          finished_at: last.finished_at ? String(last.finished_at) : null,
          error_message: last.error_message ? String(last.error_message) : null,
        }
      : null,
  };
}

export async function isRequestUserAdmin(accessToken: string): Promise<boolean> {
  if (!accessToken) return false;

  // Same source of truth as the admin UI: public.is_admin() (allowlist via JWT email).
  if (env.supabaseUrl && env.supabaseAnonKey) {
    try {
      const userClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
        global: { headers: { Authorization: `Bearer ${accessToken}` } },
        auth: { autoRefreshToken: false, persistSession: false },
      });
      const { data: isAdmin, error } = await userClient.rpc("is_admin");
      if (!error) {
        if (isAdmin === true) {
          // Keep profiles.role aligned for display / older checks.
          const supabase = getSupabaseAdmin();
          const { data: userData } = await userClient.auth.getUser();
          if (supabase && userData.user) {
            void supabase
              .from("profiles")
              .update({
                role: "admin",
                email: userData.user.email?.trim().toLowerCase() ?? undefined,
              })
              .eq("id", userData.user.id);
          }
        }
        return isAdmin === true;
      }
      console.warn("[BFM] is_admin RPC failed:", error.message);
    } catch (err) {
      console.warn(
        "[BFM] is_admin RPC error:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  // Fallback: profiles.role (older deployments / missing anon key)
  const supabase = getSupabaseAdmin();
  if (!supabase) return false;

  const { data: userData, error: userError } = await supabase.auth.getUser(accessToken);
  if (userError || !userData.user) {
    console.warn("[BFM] admin auth getUser failed:", userError?.message ?? "no user");
    return false;
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (error) {
    console.warn("[BFM] admin profiles.role check failed:", error.message);
    return false;
  }
  return data?.role === "admin";
}
