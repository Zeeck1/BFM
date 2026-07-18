import { env } from "./config/env.js";

export interface ShopeePreviewResult {
  url: string;
  title?: string;
  description?: string;
  image_url?: string;
  site_name: "Shopee";
  price_thb?: number;
}

const SHOPEE_HOST_PATTERN = /(^|\.)shopee\.co\.th$/i;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function pickString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function pickNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    const number = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(number) && number > 0) return number;
  }
  return undefined;
}

function normalizePrice(raw: unknown): number | undefined {
  const value = pickNumber(raw);
  if (value == null) return undefined;

  // Shopee's public API normally stores prices in 1/100,000 currency units.
  const normalized = value >= 100_000 ? value / 100_000 : value;
  return normalized > 0 && normalized <= 50_000_000 ? normalized : undefined;
}

function absoluteImage(raw: unknown): string | undefined {
  const value = pickString(raw);
  if (!value) return undefined;
  if (/^https?:\/\//i.test(value)) return value;
  return `https://down-th.img.susercontent.com/file/${value.replace(/^\/+/, "")}`;
}

function extractIds(url: URL): { shopId: string; itemId: string } | null {
  const shopId =
    url.searchParams.get("shop_id") ??
    url.searchParams.get("shopid");
  const itemId =
    url.searchParams.get("item_id") ??
    url.searchParams.get("itemid");

  if (/^\d+$/.test(shopId ?? "") && /^\d+$/.test(itemId ?? "")) {
    return { shopId: shopId!, itemId: itemId! };
  }

  const pathPatterns = [
    /\/product\/(\d+)\/(\d+)(?:\/|$)/i,
    /-i\.(\d+)\.(\d+)(?:[/?#]|$)/i,
    /\/i\.(\d+)\.(\d+)(?:[/?#]|$)/i,
  ];

  for (const pattern of pathPatterns) {
    const match = url.pathname.match(pattern);
    if (match) return { shopId: match[1], itemId: match[2] };
  }

  return null;
}

export function isShopeeProductUrl(raw: string): boolean {
  try {
    const url = new URL(raw.trim());
    return SHOPEE_HOST_PATTERN.test(url.hostname) && extractIds(url) !== null;
  } catch {
    return false;
  }
}

function extractItem(payload: unknown): Record<string, unknown> | null {
  let root: unknown = payload;

  // Some proxy APIs return the upstream JSON as a string.
  if (typeof root === "string") {
    try {
      root = JSON.parse(root);
    } catch {
      return null;
    }
  }

  const rootRecord = asRecord(root);
  if (!rootRecord) return null;

  const body = rootRecord.body;
  if (typeof body === "string") {
    try {
      return extractItem(JSON.parse(body));
    } catch {
      return null;
    }
  }

  const data = asRecord(rootRecord.data);
  return (
    asRecord(data?.item) ??
    asRecord(rootRecord.item) ??
    (data && ("item_id" in data || "itemid" in data) ? data : null)
  );
}

export async function fetchShopeeProductPreview(rawUrl: string): Promise<ShopeePreviewResult> {
  const productUrl = new URL(rawUrl.trim());
  productUrl.hash = "";
  const normalizedUrl = productUrl.toString();
  const ids = extractIds(productUrl);

  if (!ids || !env.rapidApiShopeeKey) {
    throw new Error("Shopee preview API is not configured");
  }

  const target = new URL("https://shopee.co.th/api/v4/pdp/get_pc");
  target.searchParams.set("shop_id", ids.shopId);
  target.searchParams.set("item_id", ids.itemId);

  const response = await fetch(`https://${env.rapidApiShopeeHost}/`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-rapidapi-key": env.rapidApiShopeeKey,
      "x-rapidapi-host": env.rapidApiShopeeHost,
    },
    body: JSON.stringify({ url: target.toString() }),
    signal: AbortSignal.timeout(18_000),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`RapidAPI Shopee ${response.status}: ${text.slice(0, 180)}`);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error("RapidAPI Shopee returned invalid JSON");
  }

  const item = extractItem(payload);
  if (!item) throw new Error("RapidAPI Shopee returned no product data");

  const images = Array.isArray(item.images) ? item.images : [];
  const price_thb = normalizePrice(
    item.price_min ??
      item.price ??
      item.price_min_before_discount ??
      asRecord(item.price_info)?.price,
  );

  return {
    url: normalizedUrl,
    title: pickString(item.title, item.name),
    description: pickString(item.description, item.description_plaintext),
    image_url: absoluteImage(item.image ?? images[0] ?? item.image_url),
    site_name: "Shopee",
    price_thb,
  };
}
