// server/routes/fetchPreview.ts
// Fetches Open-Graph / product metadata from an arbitrary URL.

import { Router } from "express";
import {
  fetchLazadaProductPreview,
  isLazadaProductUrl,
  searchLazadaProducts,
} from "../lazadaProduct.js";

export const fetchPreviewRouter = Router();

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

const TIMEOUT_MS = 14_000;

/** Return first regex capture group, or "". */
function matchFirst(html: string, ...patterns: RegExp[]): string {
  for (const re of patterns) {
    const m = html.match(re);
    if (m?.[1]) return m[1].trim();
  }
  return "";
}

/** Extract an Open-Graph / meta tag value. */
function meta(html: string, ...keys: string[]): string {
  for (const key of keys) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const v = matchFirst(
      html,
      // property="key" content="val"
      new RegExp(
        `<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
      // content="val" property="key"
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["']`,
        "i",
      ),
      // name="key" content="val"
      new RegExp(
        `<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
        "i",
      ),
      // content="val" name="key"
      new RegExp(
        `<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["']`,
        "i",
      ),
    );
    if (v) return v;
  }
  return "";
}

function pageTitle(html: string): string {
  const og = meta(html, "og:title", "twitter:title");
  if (og) return og;
  return matchFirst(html, /<title[^>]*>([^<]+)<\/title>/i);
}

/** Absolutise possibly-relative image URLs. */
function absolutify(url: string, base: string): string {
  if (!url) return "";
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith("//")) return "https:" + url;
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

/** Decode common HTML entities. */
function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

/** Guess a friendly site name from the hostname. */
function siteLabel(url: URL): string {
  const h = url.hostname.replace(/^www\./, "");
  if (h.includes("lazada")) return "Lazada";
  if (h.includes("shopee")) return "Shopee";
  if (h.includes("amazon")) return "Amazon";
  if (h.includes("jd.co")) return "JD";
  if (h.includes("central.co.th")) return "Central";
  if (h.includes("robinson.co.th")) return "Robinson";
  const part = h.split(".")[0];
  return part.charAt(0).toUpperCase() + part.slice(1);
}

/** Basic SSRF guard — block private / loopback addresses. */
function isSafeUrl(url: URL): boolean {
  const h = url.hostname;
  return !(
    h === "localhost" ||
    h.startsWith("127.") ||
    h.startsWith("192.168.") ||
    h.startsWith("10.") ||
    h.startsWith("172.16.") ||
    h === "0.0.0.0" ||
    h === "::1"
  );
}

/** Try to extract a THB price from JSON-LD or OG product tags. */
function extractPrice(html: string): number | undefined {
  // OG product price
  const amount = meta(html, "product:price:amount");
  const currency = meta(html, "product:price:currency");
  if (amount && (!currency || currency.toUpperCase() === "THB")) {
    const n = parseFloat(amount);
    if (n > 0) return n;
  }

  // JSON-LD
  const ldMatch = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i,
  );
  if (ldMatch?.[1]) {
    try {
      const ld = JSON.parse(ldMatch[1]);
      const offers = ld.offers ?? ld?.["@graph"]?.[0]?.offers;
      const price = offers?.price ?? offers?.lowPrice;
      const curr = offers?.priceCurrency;
      if (price && (!curr || curr.toUpperCase() === "THB")) {
        const n = parseFloat(String(price));
        if (n > 0) return n;
      }
    } catch {
      /* ignore */
    }
  }

  return undefined;
}

// ── Route ─────────────────────────────────────────────────────

fetchPreviewRouter.post("/fetch-preview", async (req, res) => {
  const raw: unknown = (req.body as Record<string, unknown>)?.url;
  const urlStr = typeof raw === "string" ? raw.trim() : "";

  if (!urlStr) {
    res.status(400).json({ error: "url is required" });
    return;
  }

  let parsed: URL;
  try {
    parsed = new URL(urlStr);
    if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
  } catch {
    res.status(400).json({ error: "Invalid URL — must start with http:// or https://" });
    return;
  }

  if (!isSafeUrl(parsed)) {
    res.status(400).json({ error: "URL not allowed" });
    return;
  }

  // Lazada: dedicated parser for reliable price extraction
  if (isLazadaProductUrl(urlStr)) {
    const preview = await fetchLazadaProductPreview(urlStr);
    res.json(preview);
    return;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "th-TH,th;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      redirect: "follow",
    });

    // Read only first 400 KB — enough for <head> meta tags
    const reader = response.body?.getReader();
    let html = "";
    if (reader) {
      let bytes = 0;
      while (bytes < 400_000) {
        const { done, value } = await reader.read();
        if (done || !value) break;
        html += new TextDecoder().decode(value);
        bytes += value.byteLength;
      }
      reader.cancel();
    } else {
      html = await response.text();
    }

    const finalUrl = response.url || parsed.toString();
    const title = decodeHtml(pageTitle(html));
    const rawImage = meta(html, "og:image", "twitter:image", "og:image:url");
    const imageUrl = absolutify(rawImage, finalUrl);
    const description = decodeHtml(
      meta(html, "og:description", "twitter:description", "description"),
    );
    const siteName =
      decodeHtml(meta(html, "og:site_name")) || siteLabel(parsed);
    const price_thb = extractPrice(html);

    res.json({
      url: finalUrl,
      title: title || undefined,
      description: description || undefined,
      image_url: imageUrl || undefined,
      site_name: siteName || undefined,
      price_thb: price_thb ?? undefined,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      // Still return a partial success so the link can be saved
      res.json({ url: parsed.toString(), site_name: siteLabel(parsed) });
      return;
    }
    // Network error — return minimal result so the URL can still be saved
    res.json({ url: parsed.toString(), site_name: siteLabel(parsed) });
  } finally {
    clearTimeout(timer);
  }
});

fetchPreviewRouter.post("/lazada-search", async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const raw: unknown = body?.query;
  const query = typeof raw === "string" ? raw.trim() : "";
  const rawPage = body?.page;
  const page =
    typeof rawPage === "number"
      ? rawPage
      : typeof rawPage === "string"
        ? Number.parseInt(rawPage, 10)
        : 1;

  if (!query) {
    res.status(400).json({ error: "query is required" });
    return;
  }

  if (query.length > 120) {
    res.status(400).json({ error: "Search query is too long" });
    return;
  }

  if (!Number.isFinite(page) || page < 1 || page > 100) {
    res.status(400).json({ error: "Invalid page number" });
    return;
  }

  const { results, has_more, blocked } = await searchLazadaProducts(query, page, 12);

  if (results.length === 0 && blocked) {
    res.status(503).json({
      error:
        "Lazada search is temporarily unavailable from our server. Please try again later or paste a product link directly.",
      blocked: true,
    });
    return;
  }

  res.json({ results, page, has_more });
});
