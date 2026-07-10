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
};
