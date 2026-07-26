import type { SavedLink } from "../types";

/** Strip tracking noise so search/detail URLs match the same wishlist row. */
export function normalizeProductUrl(raw: string): string {
  try {
    const url = new URL(raw.trim());
    url.hash = "";
    url.hostname = url.hostname.toLowerCase();

    for (const key of [...url.searchParams.keys()]) {
      if (
        key.startsWith("utm_") ||
        [
          "spm",
          "scm",
          "clickTrackInfo",
          "search",
          "mp",
          "from",
          "cid",
          "src",
          "ds_rl",
          "exlaz",
          "gclid",
          "fbclid",
        ].includes(key)
      ) {
        url.searchParams.delete(key);
      }
    }

    if (url.pathname.length > 1) {
      url.pathname = url.pathname.replace(/\/+$/, "");
    }

    return url.toString();
  } catch {
    return raw.trim();
  }
}

export function findSavedLinkByUrl(
  items: SavedLink[],
  rawUrl: string | null | undefined,
): SavedLink | undefined {
  if (!rawUrl?.trim()) return undefined;
  const target = normalizeProductUrl(rawUrl);
  return items.find((item) => normalizeProductUrl(item.url) === target);
}

export function isProductUrlSaved(
  items: SavedLink[],
  rawUrl: string | null | undefined,
): boolean {
  return findSavedLinkByUrl(items, rawUrl) != null;
}
