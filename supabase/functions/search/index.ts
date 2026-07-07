// supabase/functions/search/index.ts
// BFM Scrape API — hybrid: Shopee via Apify, Lazada via Scrape.do (Apify fallback)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Platform = "shopee" | "lazada";

export interface ProductResult {
  id: string;
  title: string;
  price_thb: number;
  price_mmk: number;
  image: string;
  platform: Platform;
  original_url: string;
}

interface RawShopeeItem {
  itemid?: number | string;
  item_id?: number | string;
  shop_id?: number | string;
  name?: string;
  title?: string;
  price?: number;
  images?: string[];
  image_url?: string;
  url?: string;
}

interface RawLazadaItem {
  id?: number | string;
  name?: string;
  price?: number | string;
  image?: string;
  url?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SCRAPE_DO_TOKEN = Deno.env.get("SCRAPE_DO_TOKEN") ?? "";
const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN") ?? "";

const SCRAPE_DO_BASE = "https://api.scrape.do";
const SHOPEE_ACTOR = "xtracto/shopee-scraper";
const LAZADA_ACTOR = "dtrungtin/lazada-scraper";
const CACHE_TTL_MS = 30 * 60 * 1000;
const MAX_ITEMS = 15;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

function isValidToken(token: string): boolean {
  return token.trim().length > 10;
}

async function getExchangeRate(): Promise<number> {
  const { data } = await supabase
    .from("exchange_rates")
    .select("thb_to_mmk")
    .order("id", { ascending: false })
    .limit(1)
    .single();
  return data?.thb_to_mmk ?? 110;
}

async function scrapeDoGet(
  targetUrl: string,
  opts?: { super?: boolean; render?: boolean; referer?: string },
): Promise<string> {
  const params = new URLSearchParams({
    token: SCRAPE_DO_TOKEN,
    url: targetUrl,
    geoCode: "TH",
  });
  if (opts?.super) params.set("super", "true");
  if (opts?.render) params.set("render", "true");
  if (opts?.referer) {
    params.set("customHeaders", "true");
    params.set(
      "headers",
      JSON.stringify({
        Referer: opts.referer,
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json, text/plain, */*",
      }),
    );
  }

  const res = await fetch(`${SCRAPE_DO_BASE}/?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`Scrape.do error (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
  return res.text();
}

function normaliseShopee(item: RawShopeeItem, thbToMmk: number): ProductResult {
  const itemId = item.item_id ?? item.itemid ?? crypto.randomUUID();
  const shopId = item.shop_id;
  const title = item.name ?? item.title ?? "Unknown Product";

  let priceThb = item.price ?? 0;
  if (item.item_id == null && item.itemid != null) {
    priceThb = priceThb / 100_000;
  } else if (priceThb > 100_000) {
    priceThb = priceThb / 100_000;
  }

  const rawImage = item.image_url ?? item.images?.[0] ?? "";
  const image = rawImage.startsWith("http")
    ? rawImage
    : rawImage
      ? `https://cf.shopee.co.th/file/${rawImage}`
      : "";

  return {
    id: `shopee_${itemId}`,
    title,
    price_thb: priceThb,
    price_mmk: Math.round(priceThb * thbToMmk),
    image,
    platform: "shopee",
    original_url:
      item.url ??
      (shopId
        ? `https://shopee.co.th/product/${shopId}/${itemId}`
        : `https://shopee.co.th/product/${itemId}`),
  };
}

function normaliseLazada(item: RawLazadaItem, thbToMmk: number): ProductResult {
  const priceThb =
    typeof item.price === "string"
      ? parseFloat(item.price.replace(/[^0-9.]/g, ""))
      : (item.price ?? 0);
  const itemId = item.id ?? crypto.randomUUID();

  return {
    id: `lazada_${itemId}`,
    title: item.name ?? "Unknown Product",
    price_thb: priceThb,
    price_mmk: Math.round(priceThb * thbToMmk),
    image: item.image ?? "",
    platform: "lazada",
    original_url: item.url ?? "https://www.lazada.co.th",
  };
}

function extractLazadaItems(raw: string): RawLazadaItem[] {
  const trimmed = raw.trim();
  let data: unknown = null;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      data = JSON.parse(trimmed);
    } catch {
      /* fall through */
    }
  }

  const list =
    (data as { mods?: { listItems?: unknown[] } })?.mods?.listItems ??
    (data as { listItems?: unknown[] })?.listItems ??
    [];

  if (Array.isArray(list) && list.length > 0) {
    return list.slice(0, MAX_ITEMS).map((entry) => {
      const item = entry as {
        name?: string;
        title?: string;
        price?: number | string;
        priceShow?: string;
        picUrl?: string;
        image?: string;
        productUrl?: string;
        itemId?: string | number;
        nid?: string | number;
      };
      const path = item.productUrl ?? "";
      const url = path.startsWith("http")
        ? path
        : path
          ? `https://www.lazada.co.th${path.startsWith("/") ? path : `/${path}`}`
          : undefined;

      return {
        id: item.itemId ?? item.nid,
        name: item.name ?? item.title,
        price: item.priceShow ?? item.price,
        image: item.picUrl ?? item.image,
        url,
      };
    });
  }

  return [];
}

async function runApifyActor(
  actorId: string,
  input: Record<string, unknown>,
): Promise<unknown[]> {
  const encodedId = encodeURIComponent(actorId);
  const url =
    `https://api.apify.com/v2/acts/${encodedId}/run-sync-get-dataset-items` +
    `?token=${APIFY_TOKEN}&clean=true&limit=${MAX_ITEMS}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Apify ${actorId} failed (${res.status}): ${text.slice(0, 200)}`);
  }

  return res.json() as Promise<unknown[]>;
}

async function fetchShopeeViaApify(keyword: string, thbToMmk: number): Promise<ProductResult[]> {
  if (!isValidToken(APIFY_TOKEN)) {
    throw new Error("APIFY_TOKEN is required for Shopee (Scrape.do blocks Shopee)");
  }

  const raw = await runApifyActor(SHOPEE_ACTOR, {
    country: "th",
    mode: "keyword",
    keyword,
    maxProducts: MAX_ITEMS,
  });

  return (raw as RawShopeeItem[]).map((item) => normaliseShopee(item, thbToMmk));
}

async function fetchLazadaViaApify(keyword: string, thbToMmk: number): Promise<ProductResult[]> {
  const q = encodeURIComponent(keyword);
  const raw = await runApifyActor(LAZADA_ACTOR, {
    startUrls: [{ url: `https://www.lazada.co.th/catalog/?q=${q}` }],
    maxPages: 1,
    proxyConfig: { useApifyProxy: true },
  });

  return (raw as RawLazadaItem[]).map((item) => normaliseLazada(item, thbToMmk));
}

async function fetchLazadaViaScrapeDo(keyword: string, thbToMmk: number): Promise<ProductResult[]> {
  if (!isValidToken(SCRAPE_DO_TOKEN)) {
    throw new Error("SCRAPE_DO_TOKEN is required for Lazada via Scrape.do");
  }

  const q = encodeURIComponent(keyword);
  const catalogPage = `https://www.lazada.co.th/catalog/?q=${q}`;
  const ajaxUrl = `https://www.lazada.co.th/catalog/?ajax=true&isFirstRequest=true&q=${q}`;

  try {
    const raw = await scrapeDoGet(ajaxUrl, { super: true, referer: catalogPage });
    const items = extractLazadaItems(raw);
    if (items.length > 0) {
      return items.map((item) => normaliseLazada(item, thbToMmk));
    }
  } catch {
    /* try render fallback */
  }

  const html = await scrapeDoGet(catalogPage, { super: true, render: true });
  const items = extractLazadaItems(html);
  if (items.length === 0) {
    throw new Error("Lazada: no products found via Scrape.do");
  }
  return items.map((item) => normaliseLazada(item, thbToMmk));
}

async function fetchLazada(keyword: string, thbToMmk: number): Promise<ProductResult[]> {
  if (isValidToken(SCRAPE_DO_TOKEN)) {
    try {
      return await fetchLazadaViaScrapeDo(keyword, thbToMmk);
    } catch (err) {
      console.warn("Lazada Scrape.do failed, falling back to Apify:", err);
    }
  }
  return fetchLazadaViaApify(keyword, thbToMmk);
}

async function fetchPlatformResults(
  platform: Platform,
  keyword: string,
  thbToMmk: number,
): Promise<ProductResult[]> {
  if (platform === "shopee") {
    return fetchShopeeViaApify(keyword, thbToMmk);
  }
  return fetchLazada(keyword, thbToMmk);
}

async function readCache(keyword: string, platform: Platform): Promise<ProductResult[] | null> {
  const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();
  const { data, error } = await supabase
    .from("search_cache")
    .select("data")
    .eq("keyword", keyword)
    .eq("platform", platform)
    .gte("created_at", cutoff)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return null;
  return data.data as ProductResult[];
}

async function writeCache(
  keyword: string,
  platform: Platform,
  results: ProductResult[],
): Promise<void> {
  await supabase.from("search_cache").insert({ keyword, platform, data: results });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "application/json",
  };

  try {
    if (!isValidToken(APIFY_TOKEN)) {
      return new Response(
        JSON.stringify({
          error: "APIFY_TOKEN secret is required (Scrape.do cannot scrape Shopee)",
        }),
        { status: 500, headers: corsHeaders },
      );
    }

    const url = new URL(req.url);
    const keyword = url.searchParams.get("keyword")?.trim() ?? "";
    const platform = (url.searchParams.get("platform") ?? "all") as Platform | "all";

    if (!keyword) {
      return new Response(
        JSON.stringify({ error: "keyword is required" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const thbToMmk = await getExchangeRate();
    const platforms: Platform[] = platform === "all" ? ["shopee", "lazada"] : [platform];

    const cacheResults = await Promise.all(platforms.map((p) => readCache(keyword, p)));
    const missingPlatforms: Platform[] = [];
    let allResults: ProductResult[] = [];

    platforms.forEach((p, i) => {
      if (cacheResults[i]) {
        allResults = allResults.concat(cacheResults[i]!);
      } else {
        missingPlatforms.push(p);
      }
    });

    if (missingPlatforms.length > 0) {
      const settled = await Promise.allSettled(
        missingPlatforms.map((p) => fetchPlatformResults(p, keyword, thbToMmk)),
      );

      for (let i = 0; i < settled.length; i++) {
        const outcome = settled[i];
        const p = missingPlatforms[i];
        if (outcome.status === "rejected") {
          console.error(`${p} scrape failed:`, outcome.reason);
          continue;
        }
        await writeCache(keyword, p, outcome.value);
        allResults = allResults.concat(outcome.value);
      }
    }

    if (allResults.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No products found. Check APIFY_TOKEN, SCRAPE_DO_TOKEN, and provider credits.",
        }),
        { status: 502, headers: corsHeaders },
      );
    }

    return new Response(
      JSON.stringify({
        keyword,
        provider: "hybrid",
        exchange_rate: { thb_to_mmk: thbToMmk },
        results: allResults,
        total: allResults.length,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (err) {
    console.error("Search function error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500, headers: corsHeaders },
    );
  }
});
