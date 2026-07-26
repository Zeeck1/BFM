/** User-facing API errors — BFM branded only; never mention third-party APIs. */

export const BFM_ERRORS = {
  searchUnavailable:
    "BFM couldn't complete this search right now. Please try again in a moment, or paste a product link.",
  searchQueryRequired: "Please enter a product name to search on BFM.",
  searchQueryTooLong: "That search is too long. Please use a shorter product name.",
  searchPageInvalid: "BFM couldn't open that results page. Please try again.",
  previewUrlRequired: "Please paste a product link to continue on BFM.",
  previewUrlInvalid: "Please paste a valid product link starting with http:// or https://.",
  previewUrlNotAllowed: "BFM can't open this link. Please try another product URL.",
} as const;
