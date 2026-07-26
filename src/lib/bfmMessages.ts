/** User-facing copy — BFM branded only; never mention third-party APIs. */

export const BFM_ERRORS = {
  searchUnavailable:
    "BFM couldn't complete this search right now. Please try again in a moment, or paste a product link.",
  searchFailed: "BFM couldn't search products right now. Please try again.",
  searchQueryRequired: "Please enter a product name to search on BFM.",
  searchQueryTooLong: "That search is too long. Please use a shorter product name.",
  searchPageInvalid: "BFM couldn't open that results page. Please try again.",
  previewFailed:
    "BFM couldn't load this product preview. You can still save the link to your wishlist.",
  previewUrlRequired: "Please paste a product link to continue on BFM.",
  previewUrlInvalid: "Please paste a valid product link starting with http:// or https://.",
  previewUrlNotAllowed: "BFM can't open this link. Please try another product URL.",
  productUnavailable:
    "BFM couldn't load this product right now. Please go back and try again.",
  generic: "Something went wrong on BFM. Please try again.",
} as const;

const LEAKY_PATTERNS =
  /rapidapi|api provider|rate[- ]?limit|403|502|503|timeout|timed out|upstream|scraper|blocked|proxy|ssl|econn|fetch failed|invalid json|aborted|status code|x-rapidapi/i;

/** Map any raw/API error into a safe BFM message for alerts. */
export function toBfmUserError(
  raw: unknown,
  fallback: string = BFM_ERRORS.generic,
): string {
  const message =
    typeof raw === "string"
      ? raw.trim()
      : raw instanceof Error
        ? raw.message.trim()
        : "";

  if (!message) return fallback;
  if (LEAKY_PATTERNS.test(message)) return fallback;

  // Keep short, already-friendly BFM messages from our API.
  if (/^BFM\b/i.test(message) || /^Please\b/i.test(message)) {
    return message.length > 180 ? fallback : message;
  }

  return fallback;
}
