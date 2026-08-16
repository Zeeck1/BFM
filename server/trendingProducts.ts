// Resolve home-page "Trending products" from most-searched user queries.

import type { LazadaSearchResult } from "./lazadaProduct.js";
import { searchLazadaCatalog } from "./lazadaCatalog.js";
import { getSupabaseAdmin, isSupabaseAdminConfigured } from "./supabaseAdmin.js";

const TRENDING_LIMIT = 6;
const SEARCH_SAMPLE = 1500;
const CACHE_TTL_MS = 10 * 60 * 1000;

let cache:
  | {
      expiresAt: number;
      products: LazadaSearchResult[];
    }
  | null = null;

function stripPlatformPrefix(raw: string): string {
  return raw
    .replace(/^lazada\s*:\s*/i, "")
    .trim()
    .slice(0, 120);
}

function productKey(product: LazadaSearchResult): string {
  return (product.source_id || product.url || product.title || "").trim().toLowerCase();
}

/** Rank signed-in search queries by frequency (platform prefix stripped). */
async function topSearchQueries(limit: number): Promise<string[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("search_events")
    .select("query")
    .order("created_at", { ascending: false })
    .limit(SEARCH_SAMPLE);

  if (error || !data?.length) {
    if (error) console.warn("[BFM] trending search_events failed:", error.message);
    return [];
  }

  const counts = new Map<string, { label: string; count: number }>();
  for (const row of data) {
    const cleaned = stripPlatformPrefix(typeof row.query === "string" ? row.query : "");
    if (cleaned.length < 2) continue;
    const key = cleaned.toLowerCase();
    const existing = counts.get(key);
    if (existing) {
      existing.count += 1;
    } else {
      counts.set(key, { label: cleaned, count: 1 });
    }
  }

  return [...counts.values()]
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((item) => item.label);
}

async function firstProductForQuery(query: string): Promise<LazadaSearchResult | null> {
  if (!isSupabaseAdminConfigured()) return null;
  const catalog = await searchLazadaCatalog(query, 1, 3);
  return catalog.results[0] ?? null;
}

async function popularFallback(need: number, seen: Set<string>): Promise<LazadaSearchResult[]> {
  if (need <= 0 || !isSupabaseAdminConfigured()) return [];
  const popular = await searchLazadaCatalog("", 1, need + 8);
  const out: LazadaSearchResult[] = [];
  for (const product of popular.results) {
    const key = productKey(product);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(product);
    if (out.length >= need) break;
  }
  return out;
}

async function productsFromSearchEvents(limit: number): Promise<LazadaSearchResult[]> {
  const queries = await topSearchQueries(limit);
  const found = await Promise.all(
    queries.map((query) =>
      firstProductForQuery(query).catch((err) => {
        console.warn(
          "[BFM] trending resolve failed for",
          query,
          err instanceof Error ? err.message : err,
        );
        return null;
      }),
    ),
  );
  return found.filter((product): product is LazadaSearchResult => Boolean(product));
}

export async function getTrendingProducts(limit = TRENDING_LIMIT): Promise<LazadaSearchResult[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit) || TRENDING_LIMIT, 1), 12);

  if (cache && cache.expiresAt > Date.now() && cache.products.length > 0) {
    return cache.products.slice(0, safeLimit);
  }

  const products: LazadaSearchResult[] = [];
  const seen = new Set<string>();

  const [fromSearches, popular] = await Promise.all([
    productsFromSearchEvents(safeLimit),
    popularFallback(safeLimit, new Set()),
  ]);

  for (const product of fromSearches) {
    const key = productKey(product);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    products.push(product);
    if (products.length >= safeLimit) break;
  }

  for (const product of popular) {
    if (products.length >= safeLimit) break;
    const key = productKey(product);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    products.push(product);
  }

  if (products.length > 0) {
    cache = {
      expiresAt: Date.now() + CACHE_TTL_MS,
      products,
    };
  }

  return products.slice(0, safeLimit);
}
