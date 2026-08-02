import type { ProductSearchResult } from "../types";
import {
  FEED_CATALOG_PAGE_SIZE,
  fetchLazadaFeedCatalog,
  type FeedCatalogProduct,
} from "./lazadaFeedCatalog";

export const AFFILIATE_SEARCH_PAGE_SIZE = FEED_CATALOG_PAGE_SIZE;

function toSearchResult(product: FeedCatalogProduct): ProductSearchResult {
  return {
    url: product.product_page_url || product.product_url,
    title: product.title || undefined,
    image_url: product.image_url ?? undefined,
    price_thb: product.price_thb ?? undefined,
    site_name: "Lazada",
    shop_name: product.shop_name ?? product.brand_name ?? undefined,
    source_id: product.product_id || undefined,
    sold_count: product.sold_count ?? undefined,
  };
}

export interface AffiliateSearchPage {
  results: ProductSearchResult[];
  page: number;
  hasMore: boolean;
  matchCount: number;
  catalogTotal: number;
  query: string;
}

/** Search affiliate products stored in Supabase (synced from Open API). */
export async function searchAffiliateCatalog(
  query: string,
  page = 1,
): Promise<AffiliateSearchPage> {
  const data = await fetchLazadaFeedCatalog({
    query,
    page,
    limit: AFFILIATE_SEARCH_PAGE_SIZE,
  });

  return {
    results: data.products.map(toSearchResult),
    page: data.page,
    hasMore: data.hasMore,
    matchCount: data.total,
    catalogTotal: data.catalogTotal,
    query: data.query,
  };
}
