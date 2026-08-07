// server/config/env.ts

import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  /** Optional Cookie from lazada.co.th DevTools — improves price/metadata fetch */
  lazadaCookie: process.env.LAZADA_COOKIE?.trim() ?? "",
  /**
   * Optional scraping-proxy URL template used when Lazada blocks direct
   * requests from datacenter IPs (e.g. on Render).
   * Use {url} as the placeholder for the encoded target URL, e.g.
   *   https://api.scraperapi.com/?api_key=KEY&url={url}
   *   https://api.scrapingant.com/v2/general?x-api-key=KEY&url={url}
   */
  lazadaProxyUrl: process.env.LAZADA_PROXY_URL?.trim() ?? "",
  /** RapidAPI key for Smart Search (Lazada keyword search) */
  rapidApiKey: process.env.RAPIDAPI_KEY?.trim() ?? "",
  /** RapidAPI host for Lazada search */
  rapidApiLazadaHost:
    process.env.RAPIDAPI_LAZADA_HOST?.trim() || "lazada-api.p.rapidapi.com",
  /**
   * Lazada keyword search via RapidAPI.
   * On by default when RAPIDAPI_KEY is set; set PRODUCT_SEARCH_ENABLED=false to disable.
   */
  productSearchEnabled:
    process.env.PRODUCT_SEARCH_ENABLED === "true" ||
    (process.env.PRODUCT_SEARCH_ENABLED !== "false" &&
      Boolean(process.env.RAPIDAPI_KEY?.trim())),
  /** Lazada Affiliate Open API (LiteApp Key) */
  lazadaAffiliateAppKey: process.env.LAZADA_AFFILIATE_APP_KEY?.trim() ?? "",
  /** Lazada Affiliate Open API (LiteApp Secret) */
  lazadaAffiliateAppSecret: process.env.LAZADA_AFFILIATE_APP_SECRET?.trim() ?? "",
  /** Lazada Affiliate User Token */
  lazadaAffiliateUserToken: process.env.LAZADA_AFFILIATE_USER_TOKEN?.trim() ?? "",
  /** Lazada Affiliate REST base (Thailand) */
  lazadaAffiliateBaseUrl:
    process.env.LAZADA_AFFILIATE_BASE_URL?.trim() ||
    "https://api.lazada.co.th/rest",
  /** Supabase project URL (same as Vite client URL) */
  supabaseUrl:
    process.env.SUPABASE_URL?.trim() ||
    process.env.VITE_SUPABASE_URL?.trim() ||
    "",
  /** Anon key — used with a user JWT for public.is_admin() checks */
  supabaseAnonKey:
    process.env.SUPABASE_ANON_KEY?.trim() ||
    process.env.VITE_SUPABASE_ANON_KEY?.trim() ||
    "",
  /** Service role key — catalog sync/search (never expose to browser) */
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? "",
  /** Max feed pages to pull per sync/source (each page up to 40 products) */
  lazadaFeedSyncMaxPages: Math.min(
    Math.max(Number.parseInt(process.env.LAZADA_FEED_SYNC_MAX_PAGES ?? "150", 10) || 150, 1),
    500,
  ),
  /**
   * When true, search also walks categoryL1 values found in offerType=1
   * to pull more products (Open API returns different sets per category).
   */
  lazadaFeedExpandCategories: process.env.LAZADA_FEED_EXPAND_CATEGORIES !== "false",
  /** Cap how many categoryL1 feeds to expand (each can be many pages). */
  lazadaFeedMaxCategories: Math.min(
    Math.max(Number.parseInt(process.env.LAZADA_FEED_MAX_CATEGORIES ?? "200", 10) || 200, 0),
    400,
  ),
  /** Comma-separated MM campaign IDs for offerType=2 */
  lazadaAffiliateMmCampaignIds: (process.env.LAZADA_AFFILIATE_MM_CAMPAIGN_IDS ?? "")
    .split(",")
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0),
  /** Comma-separated DM invite IDs for offerType=3 */
  lazadaAffiliateDmInviteIds: (process.env.LAZADA_AFFILIATE_DM_INVITE_IDS ?? "")
    .split(",")
    .map((v) => Number.parseInt(v.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0),
  /**
   * Minutes between live Affiliate → Supabase syncs (0 = boot sync only).
   * Default 20. Keeps Feed DB updated without manual refresh.
   */
  lazadaFeedLiveSyncMinutes: Math.min(
    Math.max(Number.parseInt(process.env.LAZADA_FEED_LIVE_SYNC_MINUTES ?? "20", 10) || 0, 0),
    24 * 60,
  ),
};
