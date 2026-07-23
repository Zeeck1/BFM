export interface ShopeePreviewResult {
  url: string;
  title?: string;
  description?: string;
  image_url?: string;
  site_name: "Shopee";
  price_thb?: number;
}

const SHOPEE_HOST_PATTERN = /(^|\.)shopee\.co\.th$/i;

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

/**
 * Dedicated Shopee RapidAPI credentials were removed.
 * Generic OG preview still works through /api/fetch-preview for Shopee links.
 */
export async function fetchShopeeProductPreview(rawUrl: string): Promise<ShopeePreviewResult> {
  const productUrl = new URL(rawUrl.trim());
  productUrl.hash = "";

  if (!extractIds(productUrl)) {
    throw new Error("Invalid Shopee product URL");
  }

  throw new Error("Shopee product API preview is not configured");
}
