/**
 * Affiliate Search — keyword search against synced Open API products in Supabase.
 * On by default; set VITE_AFFILIATE_SEARCH_ENABLED=false to hide the tab.
 */
export const AFFILIATE_SEARCH_ENABLED =
  import.meta.env.VITE_AFFILIATE_SEARCH_ENABLED !== "false";

/**
 * Smart Search — Lazada marketplace-style results via RapidAPI.
 * Requires PRODUCT_SEARCH_ENABLED + RAPIDAPI_KEY on the server.
 */
export const SMART_SEARCH_ENABLED =
  import.meta.env.VITE_PRODUCT_SEARCH_ENABLED === "true";

/** @deprecated use AFFILIATE_SEARCH_ENABLED */
export const LAZADA_FEED_ENABLED = AFFILIATE_SEARCH_ENABLED;

/** @deprecated use SMART_SEARCH_ENABLED */
export const PRODUCT_SEARCH_ENABLED = SMART_SEARCH_ENABLED;
