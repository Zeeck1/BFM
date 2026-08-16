import { fetchApi } from "./apiClient";
import { BFM_ERRORS, toBfmUserError } from "./bfmMessages";

export const FEED_CATALOG_PAGE_SIZE = 24;

export interface FeedCatalogProduct {
  product_id: string;
  product_page_url: string;
  title: string;
  image_url: string | null;
  price_thb: number | null;
  original_price_thb?: number | null;
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

export interface FeedCatalogLastSync {
  status: string;
  products_upserted: number;
  pages_fetched: number;
  started_at: string;
  finished_at: string | null;
  error_message: string | null;
}

interface FeedCatalogResponse {
  source?: string;
  page?: number;
  page_size?: number;
  total?: number;
  has_more?: boolean;
  query?: string;
  products?: FeedCatalogProduct[];
  catalog_total?: number;
  last_sync?: FeedCatalogLastSync | null;
  live_sync_minutes?: number;
  error?: string;
}

export interface FeedCatalogPage {
  source: string;
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  query: string;
  products: FeedCatalogProduct[];
  catalogTotal: number;
  lastSync: FeedCatalogLastSync | null;
  liveSyncMinutes: number;
}

export type CatalogSort = "default" | "price_asc" | "price_desc" | "popular";

/** Paginated affiliate products from DB (optional sync=1 to refresh from Open API). */
export async function fetchLazadaFeedCatalog(options?: {
  query?: string;
  page?: number;
  limit?: number;
  sync?: boolean;
  sort?: CatalogSort;
}): Promise<FeedCatalogPage> {
  const params = new URLSearchParams();
  const query = options?.query?.trim() ?? "";
  const page = options?.page ?? 1;
  const limit = options?.limit ?? FEED_CATALOG_PAGE_SIZE;
  if (query) params.set("q", query);
  params.set("page", String(page));
  params.set("limit", String(limit));
  params.set("sort", options?.sort ?? "popular");
  if (options?.sync) params.set("sync", "1");

  let res: Response;
  try {
    res = await fetchApi(`/api/lazada-feed-catalog?${params}`, {
      timeoutMs: options?.sync ? 300_000 : 45_000,
      retries: options?.sync ? 0 : 4,
    });
  } catch {
    throw new Error(BFM_ERRORS.feedUnavailable);
  }

  const data = (await res.json().catch(() => ({}))) as FeedCatalogResponse;
  if (!res.ok) {
    throw new Error(toBfmUserError(data.error, BFM_ERRORS.feedUnavailable));
  }

  return {
    source: data.source ?? "database",
    page: data.page ?? page,
    pageSize: data.page_size ?? limit,
    total: typeof data.total === "number" ? data.total : 0,
    hasMore: Boolean(data.has_more),
    query: data.query ?? query,
    products: Array.isArray(data.products) ? data.products : [],
    catalogTotal:
      typeof data.catalog_total === "number" ? data.catalog_total : (data.total ?? 0),
    lastSync: data.last_sync ?? null,
    liveSyncMinutes:
      typeof data.live_sync_minutes === "number" ? data.live_sync_minutes : 0,
  };
}
