import {
  type ClipboardEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  ArrowDownWideNarrow,
  ArrowRight,
  BookmarkPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  Link2,
  Loader2,
  MessageCircle,
  Search,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { AdSenseUnit } from "../components/AdSenseUnit";
import type { AppOutletContext } from "../components/AppLayout";
import { BrandLogo } from "../components/BrandLogo";
import { GuestSearchLimitModal } from "../components/GuestSearchLimitModal";
import { ImageLightbox } from "../components/ImageLightbox";
import { PlatformShowcase } from "../components/PlatformShowcase";
import { ProductPreviewCard } from "../components/ProductPreviewCard";
import { SmartSearchAccessModal } from "../components/SmartSearchAccessModal";
import { useExchangeRate } from "../hooks/useExchangeRate";
import { useSavedItems } from "../contexts/SavedItemsProvider";
import {
  clearGuestFreeSearchUsed,
  hasGuestUsedFreeSearch,
  markGuestFreeSearchUsed,
} from "../lib/guestSearchLimit";
import {
  AFFILIATE_SEARCH_PAGE_SIZE,
  searchAffiliateCatalog,
  type CatalogSort,
} from "../lib/affiliateCatalogSearch";
import { LAZADA_SEARCH_PAGE_SIZE, searchLazadaProducts } from "../lib/lazadaSearch";
import { clearLastLazadaSearch, loadLastLazadaSearch } from "../lib/lazadaSearchCache";
import {
  clearLastLazadaFeedSession,
  clearLinkSearchScroll,
  loadLastLazadaFeedSession,
  loadLinkSearchScroll,
  saveLastLazadaFeedSession,
  saveLinkSearchScroll,
  type LinkSearchMode,
  type LinkSearchScrollState,
} from "../lib/lazadaFeedCache";
import { fetchPreview } from "../lib/preview";
import { BFM_ERRORS, toBfmUserError } from "../lib/bfmMessages";
import { isProductUrlSaved } from "../lib/savedLinkMatch";
import {
  AFFILIATE_SEARCH_ENABLED,
  SMART_SEARCH_ENABLED,
} from "../lib/productSearchEnabled";
import { fetchCanUseSmartSearch } from "../lib/smartSearchAccess";

type SearchMode = "affiliate" | "smart";
import { recordSearchHistory } from "../lib/searchHistory";
import { fetchTrendingProducts, TRENDING_PRODUCTS_LIMIT } from "../lib/trendingProducts";
import { isFetchableUrl } from "../lib/utils";
import { formatMMK, formatSoldCount, formatTHB } from "../lib/utils";
import type { ProductPreview, ProductSearchResult } from "../types";

const SEARCH_SORT_OPTIONS: Array<{ value: CatalogSort; label: string }> = [
  { value: "popular", label: "Most sold" },
  { value: "default", label: "Default" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
];

function sortSearchResults(
  results: ProductSearchResult[],
  sort: CatalogSort,
): ProductSearchResult[] {
  if (sort === "default") return results;
  const copy = [...results];
  if (sort === "price_desc") {
    copy.sort(
      (a, b) => (b.price_thb ?? Number.NEGATIVE_INFINITY) - (a.price_thb ?? Number.NEGATIVE_INFINITY),
    );
  } else if (sort === "popular") {
    copy.sort((a, b) => (b.sold_count ?? 0) - (a.sold_count ?? 0));
  } else if (sort === "price_asc") {
    copy.sort(
      (a, b) => (a.price_thb ?? Number.POSITIVE_INFINITY) - (b.price_thb ?? Number.POSITIVE_INFINITY),
    );
  }
  return copy;
}

type FetchState = "idle" | "loading" | "done" | "error";
const ADSENSE_SEARCH_SLOT =
  (import.meta.env.VITE_ADSENSE_SEARCH_SLOT as string | undefined)?.trim() ?? "";

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

/** Animated window scroll — smoother and more controllable than CSS scroll-behavior. */
function animateWindowScrollTo(targetY: number, durationMs = 520): Promise<void> {
  return new Promise((resolve) => {
    const startY = window.scrollY;
    const delta = targetY - startY;
    if (Math.abs(delta) < 2) {
      window.scrollTo(0, targetY);
      resolve();
      return;
    }

    const start = performance.now();
    const html = document.documentElement;
    const previousBehavior = html.style.scrollBehavior;
    html.style.scrollBehavior = "auto";

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / durationMs);
      window.scrollTo(0, startY + delta * easeOutCubic(t));
      if (t < 1) {
        window.requestAnimationFrame(step);
      } else {
        html.style.scrollBehavior = previousBehavior;
        resolve();
      }
    };

    window.requestAnimationFrame(step);
  });
}

async function restoreScrollToProduct(
  pending: LinkSearchScrollState,
): Promise<string | null> {
  const targetUrl = pending.productUrl?.trim();
  if (targetUrl) {
    const el = document.querySelector(
      `[data-product-url="${CSS.escape(targetUrl)}"]`,
    ) as HTMLElement | null;
    if (el) {
      const rect = el.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;
      const targetY = Math.max(
        0,
        absoluteTop - Math.max(88, (window.innerHeight - rect.height) / 2),
      );
      await animateWindowScrollTo(targetY, 560);
      return targetUrl;
    }
  }

  await animateWindowScrollTo(Math.max(0, pending.y), 560);
  return targetUrl || null;
}

interface SearchResultCardProps {
  result: ProductSearchResult;
  rate: number;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  loggedIn: boolean;
  onSignIn: () => void;
  highlighted?: boolean;
  searchMode: LinkSearchMode;
}

function SearchResultCard({
  result,
  rate,
  onSave,
  saving,
  saved,
  loggedIn,
  onSignIn,
  highlighted = false,
  searchMode,
}: SearchResultCardProps) {
  const [imgError, setImgError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasImage = Boolean(result.image_url && !imgError);
  const siteLabel = result.site_name || "Product";

  const hasShopName = Boolean(result.shop_name?.trim());
  const hasSoldCount = result.sold_count != null && result.sold_count > 0;

  return (
    <article
      data-product-url={result.url}
      className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm transition duration-300 hover:border-indigo-200 hover:shadow-md ${
        highlighted
          ? "bfm-restore-target border-indigo-300 shadow-md shadow-indigo-200/50"
          : "border-slate-200/80"
      }`}
    >
      <button
        type="button"
        onClick={() => {
          if (hasImage) setLightboxOpen(true);
        }}
        title={hasImage ? "View full image" : "Image not available"}
        className="group relative block aspect-square w-full shrink-0 overflow-hidden bg-slate-50"
      >
        {hasImage ? (
          <span className="absolute inset-0 flex items-center justify-center p-2.5 sm:p-3">
            <img
              src={result.image_url}
              alt={result.title ?? `${siteLabel} product`}
              className="h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.03]"
              onError={() => setImgError(true)}
            />
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-600 sm:h-24 sm:w-24">
              {siteLabel}
            </div>
          </span>
        )}
      </button>

      <div className="flex min-h-0 flex-1 flex-col border-t border-slate-100 p-3 sm:p-4">
        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          <div className="flex h-5 shrink-0 items-center gap-1.5">
            <span className="inline-block rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-600">
              {siteLabel}
            </span>
            {hasSoldCount && (
              <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700">
                {formatSoldCount(result.sold_count!)} sold
              </span>
            )}
          </div>
          <Link
            to={`/product-detail?url=${encodeURIComponent(result.url)}`}
            state={{ product: result, from: "/", searchMode }}
            onClick={() => saveLinkSearchScroll(window.scrollY, result.url, searchMode)}
            className="line-clamp-2 block h-9 shrink-0 overflow-hidden text-xs font-semibold leading-[1.125rem] text-slate-900 transition hover:text-indigo-600 sm:h-10 sm:text-sm sm:leading-5"
          >
            {result.title ?? result.url}
          </Link>
          <div className="min-h-[2.75rem] shrink-0 sm:min-h-[3rem]">
            {result.price_thb != null ? (
              <>
                <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                  <p className="truncate text-base font-bold leading-tight text-slate-900 sm:text-lg">
                    {formatTHB(result.price_thb)}
                  </p>
                  {result.original_price_thb != null &&
                    result.original_price_thb > result.price_thb && (
                      <p className="truncate text-[11px] font-medium text-slate-400 line-through sm:text-xs">
                        {formatTHB(result.original_price_thb)}
                      </p>
                    )}
                </div>
                <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500 sm:text-xs">
                  ≈ {formatMMK(result.price_thb * rate)}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold leading-tight text-slate-400 sm:text-sm">Price not available</p>
                <p className="mt-0.5 text-[11px] invisible sm:text-xs">&nbsp;</p>
              </>
            )}
          </div>
          <p className="line-clamp-1 min-h-[1.125rem] shrink-0 text-[11px] font-medium text-slate-600 sm:text-xs">
            {hasShopName ? result.shop_name : <span className="invisible">&nbsp;</span>}
          </p>
        </div>

        <div className="mt-auto grid shrink-0 grid-cols-2 gap-1.5 pt-3">
          {loggedIn ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saving || saved}
              className={`inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg px-2 text-[10px] font-semibold transition sm:text-xs ${
                saved
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
              }`}
            >
              {saved ? (
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              ) : (
                <BookmarkPlus className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              )}
              {saved ? "Saved" : "Save"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg bg-slate-900 px-2 text-[10px] font-semibold text-white hover:bg-slate-700 sm:text-xs"
            >
              <BookmarkPlus className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
              Sign in
            </button>
          )}

          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 w-full items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 sm:text-xs"
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4" />
            Open
          </a>
        </div>
      </div>

      {lightboxOpen && result.image_url && (
        <ImageLightbox
          src={result.image_url}
          alt={result.title ?? "Lazada product"}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </article>
  );
}

export function LinkSearchPage() {
  const { user, onSignIn } = useOutletContext<AppOutletContext>();
  const defaultMode: SearchMode = "affiliate";
  const [searchMode, setSearchMode] = useState<SearchMode>(defaultMode);
  const [url, setUrl] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [preview, setPreview] = useState<ProductPreview | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [searchState, setSearchState] = useState<FetchState>("idle");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [feedMatched, setFeedMatched] = useState(false);
  const [feedMatchCount, setFeedMatchCount] = useState(0);
  const [searchSort, setSearchSort] = useState<CatalogSort>("popular");
  const [guestSearchLocked, setGuestSearchLocked] = useState(() => hasGuestUsedFreeSearch());
  const [guestLimitModalOpen, setGuestLimitModalOpen] = useState(false);
  const [smartSearchAllowed, setSmartSearchAllowed] = useState(false);
  const [smartAccessModalOpen, setSmartAccessModalOpen] = useState(false);
  const { rate } = useExchangeRate();
  const { items: savedItems, saving, save } = useSavedItems();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const restoreScrollRef = useRef(false);
  const pendingScrollRef = useRef<LinkSearchScrollState | null>(null);
  const [highlightProductUrl, setHighlightProductUrl] = useState<string | null>(null);
  const [trendingProducts, setTrendingProducts] = useState<ProductSearchResult[]>([]);
  const [trendingState, setTrendingState] = useState<FetchState>("idle");

  useEffect(() => {
    if (user) {
      clearGuestFreeSearchUsed();
      setGuestSearchLocked(false);
      setGuestLimitModalOpen(false);
      let cancelled = false;
      void fetchCanUseSmartSearch().then((allowed) => {
        if (cancelled) return;
        setSmartSearchAllowed(allowed);
        if (!allowed) {
          setSearchMode((mode) => (mode === "smart" ? "affiliate" : mode));
          setSearchResults([]);
          setSearchPage(1);
          setSearchHasMore(false);
          setSearchState("idle");
          setSearchError("");
        }
      });
      return () => {
        cancelled = true;
      };
    }
    setSmartSearchAllowed(false);
    setGuestSearchLocked(hasGuestUsedFreeSearch());
    setSearchMode((mode) => (mode === "smart" ? "affiliate" : mode));
    setSearchResults([]);
    setSearchPage(1);
    setSearchHasMore(false);
    setSearchState("idle");
    setSearchError("");
  }, [user]);

  useEffect(() => {
    const controller = new AbortController();
    setTrendingState("loading");
    void fetchTrendingProducts(TRENDING_PRODUCTS_LIMIT, controller.signal)
      .then((results) => {
        if (controller.signal.aborted) return;
        setTrendingProducts(results);
        setTrendingState(results.length > 0 ? "done" : "idle");
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setTrendingProducts([]);
        setTrendingState("idle");
      });
    return () => controller.abort();
  }, []);

  const searchEnabled = AFFILIATE_SEARCH_ENABLED || SMART_SEARCH_ENABLED;
  const affiliateMode = searchMode === "affiliate" && AFFILIATE_SEARCH_ENABLED;
  const smartMode =
    searchMode === "smart" && SMART_SEARCH_ENABLED && smartSearchAllowed;

  const hasActivity =
    fetchState !== "idle" ||
    !!preview ||
    (searchEnabled &&
      Boolean(url.trim()) &&
      !isFetchableUrl(url.trim()) &&
      (searchState !== "idle" || searchResults.length > 0));

  function applyCachedSearch(last: {
    query: string;
    page: number;
    hasMore: boolean;
    results: ProductSearchResult[];
  }) {
    setUrl(last.query);
    setSearchResults(last.results.slice(0, LAZADA_SEARCH_PAGE_SIZE));
    setSearchPage(last.page);
    setSearchHasMore(last.hasMore);
    setSearchState("done");
    setSearchError("");
    setFetchState("idle");
    setPreview(null);
    setFetchError("");
  }

  function clearSearchResults() {
    setSearchState("idle");
    setSearchResults([]);
    setSearchPage(1);
    setSearchHasMore(false);
    setSearchError("");
    setFeedMatched(false);
    setFeedMatchCount(0);
  }

  function applyAffiliateSession(session: {
    query: string;
    page: number;
    hasMore: boolean;
    results: ProductSearchResult[];
  }) {
    setSearchMode("affiliate");
    setUrl(session.query);
    setSearchResults(session.results.slice(0, AFFILIATE_SEARCH_PAGE_SIZE));
    setSearchPage(session.page);
    setSearchHasMore(session.hasMore);
    setSearchState("done");
    setSearchError("");
    setFeedMatched(session.results.length > 0);
    setFeedMatchCount(session.results.length);
    setFetchState("idle");
    setPreview(null);
    setFetchError("");
  }

  function switchSearchMode(mode: SearchMode) {
    if (mode === searchMode) return;
    if (mode === "smart" && !SMART_SEARCH_ENABLED) return;
    if (mode === "affiliate" && !AFFILIATE_SEARCH_ENABLED) return;

    if (mode === "smart" && !smartSearchAllowed) {
      setSmartAccessModalOpen(true);
      return;
    }

    setSearchMode(mode);
    setPreview(null);
    setFetchState("idle");
    setFetchError("");
    setHighlightProductUrl(null);
    restoreScrollRef.current = false;
    pendingScrollRef.current = null;

    // Keep each mode's session/scroll isolated — reload that mode's own cache.
    if (mode === "affiliate") {
      const cached = loadLastLazadaFeedSession();
      if (cached?.query.trim() && cached.results.length > 0) {
        applyAffiliateSession(cached);
        return;
      }
      clearSearchResults();
      setUrl("");
      return;
    }

    const smart = loadLastLazadaSearch();
    if (smart && smart.results.length > 0) {
      applyCachedSearch(smart);
      setSearchMode("smart");
      return;
    }
    clearSearchResults();
    setUrl("");
  }

  async function runAffiliateSearch(page = 1, query = "", sort: CatalogSort = searchSort) {
    const cleaned = query.trim();
    if (!cleaned) {
      clearSearchResults();
      return;
    }

    // Guests get one free Search. Extra searches (and pagination) require sign-in.
    if (!user && (page > 1 || guestSearchLocked || hasGuestUsedFreeSearch())) {
      setGuestSearchLocked(true);
      setGuestLimitModalOpen(true);
      setSearchError("");
      setSearchState(searchResults.length > 0 ? "done" : "idle");
      return;
    }

    restoreScrollRef.current = false;
    pendingScrollRef.current = null;
    clearLinkSearchScroll("affiliate");
    setHighlightProductUrl(null);
    setSearchError("");
    setSearchPage(page);
    setSearchState("loading");

    try {
      const response = await searchAffiliateCatalog(cleaned, page, sort);
      const results = response.results.slice(0, AFFILIATE_SEARCH_PAGE_SIZE);
      setSearchResults(results);
      setSearchPage(response.page);
      setSearchHasMore(response.hasMore);
      setFeedMatched(response.matchCount > 0);
      setFeedMatchCount(response.matchCount);
      setSearchState("done");
      if (results.length > 0) {
        saveLastLazadaFeedSession(cleaned, response.page, response.hasMore, results);
      }
      if (!user && page === 1) {
        markGuestFreeSearchUsed();
        setGuestSearchLocked(true);
        setGuestLimitModalOpen(true);
      }
      if (user && page === 1) {
        void recordSearchHistory(user.id, `Search: ${cleaned}`);
      }
    } catch (e) {
      setSearchError(toBfmUserError(e, BFM_ERRORS.feedUnavailable));
      setSearchHasMore(false);
      setFeedMatched(false);
      setFeedMatchCount(0);
      setSearchState("error");
    }
  }

  // Restore Search session / scroll. Smart Search is restored only after access is confirmed.
  useEffect(() => {
    const affiliateScroll = AFFILIATE_SEARCH_ENABLED
      ? loadLinkSearchScroll("affiliate")
      : null;
    const affiliateSession = AFFILIATE_SEARCH_ENABLED
      ? loadLastLazadaFeedSession()
      : null;

    const restoreAffiliate = (scroll: LinkSearchScrollState | null) => {
      if (!affiliateSession?.results.length) return false;
      restoreScrollRef.current = Boolean(scroll);
      pendingScrollRef.current = scroll;
      applyAffiliateSession(affiliateSession);
      return true;
    };

    if (affiliateScroll?.productUrl && restoreAffiliate(affiliateScroll)) return;
    if (affiliateScroll && restoreAffiliate(affiliateScroll)) return;
    restoreAffiliate(null);
  }, []);

  // After Smart Search access is confirmed, restore that mode if returning from a product.
  useEffect(() => {
    if (!SMART_SEARCH_ENABLED || !smartSearchAllowed) return;

    const smartScroll = loadLinkSearchScroll("smart");
    const smartSession = loadLastLazadaSearch();
    if (!smartScroll?.productUrl || !smartSession?.results.length) return;

    restoreScrollRef.current = true;
    pendingScrollRef.current = smartScroll;
    applyCachedSearch(smartSession);
    setSearchMode("smart");
  }, [smartSearchAllowed]);

  // After restored results paint, smoothly scroll back to the opened product
  useEffect(() => {
    if (!restoreScrollRef.current) return;
    if (searchState !== "done" || searchResults.length === 0) return;

    const pending = pendingScrollRef.current;
    if (!pending) {
      restoreScrollRef.current = false;
      return;
    }

    const mode: LinkSearchMode =
      pending.mode ?? (affiliateMode ? "affiliate" : "smart");

    let cancelled = false;
    const timer = window.setTimeout(() => {
      void (async () => {
        if (cancelled) return;
        const highlighted = await restoreScrollToProduct(pending);
        if (cancelled) return;
        if (highlighted) {
          setHighlightProductUrl(highlighted);
          window.setTimeout(() => {
            if (!cancelled) setHighlightProductUrl(null);
          }, 1400);
        }
        restoreScrollRef.current = false;
        pendingScrollRef.current = null;
        clearLinkSearchScroll(mode);
      })();
    }, 80);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [searchState, searchResults, affiliateMode]);

  // Save scroll when leaving the home page (browser back/forward or in-app nav)
  useEffect(() => {
    const mode: LinkSearchMode = searchMode;
    const persist = () => {
      // Don't overwrite a product-click scroll with a stale/zero value during unmount races.
      const existing = loadLinkSearchScroll(mode);
      if (existing?.productUrl) return;
      saveLinkSearchScroll(window.scrollY, undefined, mode);
    };
    window.addEventListener("pagehide", persist);
    return () => {
      persist();
      window.removeEventListener("pagehide", persist);
    };
  }, [searchMode]);

  useEffect(() => {
    const trimmed = url.trim();
    if (!isFetchableUrl(trimmed)) {
      setFetchState("idle");
      setPreview(null);
      setFetchError("");
      return;
    }

    // Preview a pasted link; keep feed/search results hidden while preview is active
    setSearchState("idle");
    setSearchResults([]);
    setSearchPage(1);
    setSearchHasMore(false);
    setSearchError("");
    const timer = setTimeout(async () => {
      setFetchState("loading");
      setFetchError("");
      setPreview(null);
      try {
        const data = await fetchPreview(trimmed);
        setPreview(data);
        setFetchState("done");
      } catch (e) {
        setFetchError(toBfmUserError(e, BFM_ERRORS.previewFailed));
        setFetchState("error");
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [url]);

  useEffect(() => {
    if (!hasActivity) return;
    if (restoreScrollRef.current) return;

    const frame = window.requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [hasActivity, fetchState, preview, searchResults, searchState]);

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();
    if (pasted.startsWith("http")) setTimeout(() => setUrl(pasted), 0);
  }

  async function runProductSearch(query: string, page = 1, sort: CatalogSort = searchSort) {
    if (!smartSearchAllowed) {
      setSmartAccessModalOpen(true);
      setSearchError("");
      setSearchState(searchResults.length > 0 ? "done" : "idle");
      return;
    }

    // Guests cannot use Smart Search — permission is admin-granted only.
    if (!user) {
      setSmartAccessModalOpen(true);
      setSearchError("");
      setSearchState(searchResults.length > 0 ? "done" : "idle");
      return;
    }

    restoreScrollRef.current = false;
    pendingScrollRef.current = null;
    if (page === 1) clearLinkSearchScroll("smart");
    setHighlightProductUrl(null);
    setPreview(null);
    setFetchState("idle");
    setFetchError("");
    setSearchError("");
    setSearchPage(page);

    // Keep previous results visible while loading a new page/query when possible
    setSearchState("loading");

    try {
      const response = await searchLazadaProducts(query, page);

      setSearchResults(sortSearchResults(response.results, sort));
      setSearchPage(response.page);
      setSearchHasMore(response.hasMore);
      setSearchState("done");
      if (user && page === 1) {
        void recordSearchHistory(user.id, `Smart Search: ${query}`);
      }
    } catch (e) {
      setSearchError(toBfmUserError(e, BFM_ERRORS.searchFailed));
      setSearchHasMore(false);
      setSearchState("error");
    }
  }

  async function handleSortChange(next: CatalogSort) {
    setSearchSort(next);
    if (!trimmedInput || isFetchableUrl(trimmedInput)) return;
    if (searchState !== "done" && searchResults.length === 0) return;

    if (affiliateMode) {
      await runAffiliateSearch(1, trimmedInput, next);
      return;
    }
    if (smartMode) {
      // Re-sort current Smart Search page without another API call.
      setSearchResults((prev) => sortSearchResults(prev, next));
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!isFetchableUrl(trimmed)) {
      // Fresh search defaults to Most sold.
      setSearchSort("popular");
      if (affiliateMode) {
        if (!user && (guestSearchLocked || hasGuestUsedFreeSearch())) {
          setGuestSearchLocked(true);
          setGuestLimitModalOpen(true);
          return;
        }
        setPreview(null);
        setFetchState("idle");
        setFetchError("");
        await runAffiliateSearch(1, trimmed, "popular");
        return;
      }
      if (smartMode) {
        if (!user && (guestSearchLocked || hasGuestUsedFreeSearch())) {
          setGuestSearchLocked(true);
          setGuestLimitModalOpen(true);
          return;
        }
        await runProductSearch(trimmed, 1, "popular");
        return;
      }
      return;
    }

    setSearchState("idle");
    setSearchResults([]);
    setSearchPage(1);
    setSearchHasMore(false);
    setSearchError("");
    setFetchState("loading");
    setFetchError("");
    setPreview(null);
    try {
      const data = await fetchPreview(trimmed);
      setPreview(data);
      setFetchState("done");
    } catch (e) {
      setFetchError(toBfmUserError(e, BFM_ERRORS.previewFailed));
      setFetchState("error");
    }
  }

  function clearInput() {
    setUrl("");
    setPreview(null);
    setFetchState("idle");
    setFetchError("");
    setSearchError("");
    clearSearchResults();
    if (smartMode) clearLastLazadaSearch();
    if (affiliateMode) clearLastLazadaFeedSession();
    inputRef.current?.focus();
  }

  async function handleSearchPage(nextPage: number) {
    if (searchState === "loading") return;
    if (!trimmedInput || isFetchableUrl(trimmedInput)) return;
    if (affiliateMode) {
      await runAffiliateSearch(nextPage, trimmedInput);
      return;
    }
    if (smartMode) {
      await runProductSearch(trimmedInput, nextPage);
    }
  }

  async function handleSavePreview() {
    if (!preview || !user) {
      onSignIn();
      return;
    }
    await save(preview, rate);
  }

  async function handleSaveSearchResult(result: ProductSearchResult) {
    if (!user) {
      onSignIn();
      return;
    }
    await save(result, rate);
  }

  const trimmedInput = url.trim();
  const isSearching =
    fetchState === "loading" ||
    ((SMART_SEARCH_ENABLED || AFFILIATE_SEARCH_ENABLED) && searchState === "loading");
  const canPreviewInput = Boolean(trimmedInput) && isFetchableUrl(trimmedInput);
  const canSearchInput =
    searchEnabled && Boolean(trimmedInput) && !isFetchableUrl(trimmedInput);
  const submitLabel = canSearchInput
    ? affiliateMode
      ? "Search"
      : "Smart Search"
    : "Preview";
  const previewSaved = preview ? isProductUrlSaved(savedItems, preview.url) : false;
  const browseMode = affiliateMode;
  const showProductGrid =
    searchEnabled &&
    (searchState === "done" || (searchState === "loading" && searchResults.length > 0)) &&
    !canPreviewInput &&
    fetchState === "idle" &&
    Boolean(trimmedInput) &&
    !isFetchableUrl(trimmedInput);

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Hero */}
      <section className="bg-hero-dots relative overflow-hidden px-4 pb-8 pt-8 sm:pb-12 sm:pt-12 lg:pb-14 lg:pt-14">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-[280px] w-full max-w-xl rounded-full bg-indigo-600/10 blur-[80px] sm:h-[420px] sm:max-w-2xl sm:blur-[100px]" />
        </div>

        <div className="relative mx-auto max-w-2xl text-center">
          <div className="mb-3 inline-flex max-w-full items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-400 sm:mb-4 sm:text-xs">
            <Sparkles className="h-3.5 w-3.5 shrink-0 text-indigo-400" />
            <span className="truncate">Lazada · Shopee · Amazon & more</span>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl lg:leading-tight">
            {searchEnabled ? (
              <>
                Search here or{" "}
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  Paste a link
                </span>
              </>
            ) : (
              <>
                <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
                  Paste a link
                </span>{" "}
                to save
              </>
            )}
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400 sm:mt-3 sm:max-w-none sm:text-base">
            {affiliateMode
              ? "Search Lazada products or paste any product URL."
              : smartMode
                ? "Fast and update Lazada product results or paste any product URL."
                : "Paste any product URL — we fetch the details so you can save it to your wishlist."}
          </p>
          {(affiliateMode || smartMode) && !user && (
            <p className="mx-auto mt-2 max-w-lg text-xs text-slate-500">
              {guestSearchLocked
                ? `Free guest ${affiliateMode ? "Search" : "Smart Search"} used. Sign in to keep searching.`
                : `Guests get 1 free ${affiliateMode ? "Search" : "Smart Search"}. Sign in for unlimited searches.`}
            </p>
          )}

          {searchEnabled && (
            <div className="mx-auto mt-4 flex w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-1">
              {AFFILIATE_SEARCH_ENABLED && (
                <button
                  type="button"
                  onClick={() => switchSearchMode("affiliate")}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    affiliateMode
                      ? "bg-white text-slate-900 shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Search
                </button>
              )}
              {SMART_SEARCH_ENABLED && (
                <button
                  type="button"
                  onClick={() => switchSearchMode("smart")}
                  className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition sm:text-sm ${
                    smartMode
                      ? "bg-white text-slate-900 shadow"
                      : "text-slate-300 hover:text-white"
                  }`}
                >
                  Smart Search
                  {!smartSearchAllowed && (
                    <span className="ml-1 text-[10px] font-medium text-amber-300/90">Locked</span>
                  )}
                </button>
              )}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className={`flex w-full min-w-0 flex-col gap-2 lg:flex-row lg:overflow-hidden lg:rounded-2xl lg:bg-white lg:shadow-2xl lg:shadow-black/30 lg:ring-1 lg:ring-white/10 ${searchEnabled ? "mt-4 sm:mt-5" : "mt-5 sm:mt-6"}`}
          >
            <div className="relative flex min-w-0 flex-1 items-center overflow-hidden rounded-2xl bg-white shadow-xl shadow-black/20 ring-1 ring-white/10 lg:rounded-none lg:shadow-none lg:ring-0">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400 sm:left-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M12.232 4.232a2.5 2.5 0 0 1 3.536 3.536l-1.225 1.224a.75.75 0 0 0 1.061 1.06l1.224-1.224a4 4 0 0 0-5.656-5.656l-3 3a4 4 0 0 0 .225 5.865.75.75 0 0 0 .977-1.138 2.5 2.5 0 0 1-.142-3.667l3-3z" />
                <path d="M11.603 7.963a.75.75 0 0 0-.977 1.138 2.5 2.5 0 0 1 .142 3.667l-3 3a2.5 2.5 0 0 1-3.536-3.536l1.225-1.224a.75.75 0 0 0-1.061-1.06l-1.224 1.224a4 4 0 1 0 5.656 5.656l3-3a4 4 0 0 0-.225-5.865z" />
              </svg>
              <input
                ref={inputRef}
                type="text"
                inputMode="search"
                autoComplete="off"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={handlePaste}
                placeholder={
                  affiliateMode
                    ? "Search products or paste a link..."
                    : smartMode
                      ? "Smart Search Lazada or paste a link..."
                      : "Paste a product link..."
                }
                className="w-full min-w-0 bg-transparent py-3.5 pl-10 pr-10 text-sm text-slate-800 placeholder-slate-400 outline-none sm:py-4 sm:pl-11"
              />
              {url && (
                <button
                  type="button"
                  onClick={clearInput}
                  className="absolute right-2.5 flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 sm:right-3"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
            <button
              type="submit"
              disabled={isSearching || !canPreviewInput && !canSearchInput}
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-40 sm:py-4 lg:w-auto lg:rounded-none lg:px-6"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {submitLabel.startsWith("Search") ? (
                    <Search className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {submitLabel}
                </>
              )}
            </button>
          </form>

          {!SMART_SEARCH_ENABLED && !browseMode && trimmedInput && !isFetchableUrl(trimmedInput) && (
            <p className="mt-2 text-xs text-amber-200/90">{BFM_ERRORS.searchDisabled}</p>
          )}

          <PlatformShowcase />
        </div>
      </section>

      {/* Preview */}
      <section className="bg-[#f8fafc] px-4 pb-8 pt-2 sm:px-6 sm:pb-10">
        <div ref={resultsRef} className="mx-auto max-w-5xl scroll-mt-16">
        {!hasActivity && (
          <div className="space-y-6">
            {(trendingState === "loading" || trendingProducts.length > 0) && (
              <section>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
                      <TrendingUp className="h-3.5 w-3.5" />
                      Popular now
                    </p>
                    <h2 className="mt-1 text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
                      Trending products
                    </h2>
                  
                  </div>
                </div>

                {trendingState === "loading" && trendingProducts.length === 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div
                        key={i}
                        className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"
                      >
                        <div className="shimmer aspect-square w-full" />
                        <div className="space-y-2 p-3 sm:p-4">
                          <div className="shimmer h-3 w-16 rounded-full" />
                          <div className="shimmer h-4 w-full rounded-full" />
                          <div className="shimmer h-4 w-2/3 rounded-full" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
                    {trendingProducts.slice(0, TRENDING_PRODUCTS_LIMIT).map((result) => (
                      <SearchResultCard
                        key={result.source_id ?? result.url}
                        result={result}
                        rate={rate}
                        onSave={() => handleSaveSearchResult(result)}
                        saving={saving}
                        saved={isProductUrlSaved(savedItems, result.url)}
                        loggedIn={Boolean(user)}
                        onSignIn={onSignIn}
                        searchMode={searchMode}
                      />
                    ))}
                  </div>
                )}
              </section>
            )}

            <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(14,165,233,0.08),_transparent_50%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/60 to-transparent" />

              <div className="relative px-5 py-7 sm:px-8 sm:py-9">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
                  <BrandLogo className="h-16 w-16 rounded-2xl shadow-lg shadow-slate-900/10 sm:h-[4.5rem] sm:w-[4.5rem]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
                      About BFM
                    </p>
                    <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                      Buy For Me
                    </h2>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                      Buy For Me is a Thailand → Myanmar shopping helper. Search Lazada products,
                      paste links from supported shops, save a wishlist, share with QR, and request
                      purchases through Messenger — we handle buying and delivery support.
                    </p>
                  </div>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    {
                      icon: Search,
                      title: "Search & paste",
                      text: browseMode || SMART_SEARCH_ENABLED
                        ? "Find Lazada items by keyword, or paste any product URL."
                        : "Paste product links from Lazada, Shopee, Amazon and more.",
                    },
                    {
                      icon: Heart,
                      title: "Wishlist",
                      text: "Save favourites with THB prices and live MMK estimates.",
                    },
                    {
                      icon: MessageCircle,
                      title: "Messenger order",
                      text: "Send your list to BFM on Messenger in one tap.",
                    },
                    {
                      icon: Link2,
                      title: "Share & slips",
                      text: "Create QR wishlists and link slips for friends and family.",
                    },
                  ].map(({ icon: Icon, title, text }) => (
                    <div
                      key={title}
                      className="rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-4 backdrop-blur-sm"
                    >
                      <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white">
                        <Icon className="h-4 w-4" />
                      </span>
                      <p className="mt-3 text-sm font-bold text-slate-900">{title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-slate-500">{text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200/70 bg-slate-50/80 px-4 py-4 sm:px-5">
                  <p className="text-sm font-bold text-slate-900">How BFM works</p>
                  <ol className="mt-2 grid gap-2 text-xs leading-relaxed text-slate-600 sm:grid-cols-2 sm:text-sm">
                    <li>
                      <span className="font-semibold text-slate-800">1.</span> Search or paste a
                      Thailand product link.
                    </li>
                    <li>
                      <span className="font-semibold text-slate-800">2.</span> Save items to your
                      wishlist.
                    </li>
                    <li>
                      <span className="font-semibold text-slate-800">3.</span> Share via QR or send
                      the list on Messenger.
                    </li>
                    <li>
                      <span className="font-semibold text-slate-800">4.</span> We confirm, purchase,
                      and help with delivery.
                    </li>
                  </ol>
                </div>

                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-5 text-sm font-semibold">
                  <Link
                    to="/our-service"
                    className="inline-flex items-center gap-1.5 text-slate-800 transition hover:text-indigo-600"
                  >
                    <ArrowRight className="h-3.5 w-3.5" />
                    Our Service
                  </Link>
                  <Link to="/privacy" className="text-slate-500 transition hover:text-indigo-600">
                    Privacy Policy
                  </Link>
                  <Link to="/terms" className="text-slate-500 transition hover:text-indigo-600">
                    Terms of Service
                  </Link>
                </div>
              </div>
            </section>
          </div>
        )}

        {hasActivity && (
          <div className="space-y-4">
            {fetchState === "loading" && (
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-lg shadow-slate-200/60">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-500" />
                <div className="flex-1 space-y-2">
                  <div className="shimmer h-4 w-2/3 rounded-full" />
                  <div className="shimmer h-3 w-1/2 rounded-full" />
                </div>
              </div>
            )}

            {(SMART_SEARCH_ENABLED || AFFILIATE_SEARCH_ENABLED) &&
              searchState === "loading" &&
              searchResults.length === 0 &&
              Boolean(trimmedInput) &&
              !isFetchableUrl(trimmedInput) && (
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-lg shadow-slate-200/60">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-500" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">
                    {affiliateMode ? "Search" : "Smart Search"} for “{trimmedInput}”…
                  </p>
                  <p className="text-xs text-slate-400">
                    {affiliateMode
                      ? "Searching your product catalog…"
                      : "BFM usually responds in a few seconds."}
                  </p>
                </div>
              </div>
            )}

            {fetchState === "error" && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                <p className="text-sm font-semibold text-red-700">{fetchError}</p>
                <p className="mt-1 text-xs text-red-400">
                  BFM couldn&apos;t load the preview, but you can still save this link.
                </p>
                {isFetchableUrl(url.trim()) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {user ? (
                      <button
                        onClick={async () => {
                          const saved = await save({ url: url.trim() }, rate);
                          if (saved) setFetchState("idle");
                        }}
                        disabled={saving}
                        className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                      >
                        {saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <BookmarkPlus className="h-4 w-4" />
                        )}
                        Save URL anyway
                      </button>
                    ) : (
                      <button
                        onClick={onSignIn}
                        className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                      >
                        Sign in to save
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {(SMART_SEARCH_ENABLED || AFFILIATE_SEARCH_ENABLED) && searchState === "error" && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                <p className="text-sm font-semibold text-red-700">{searchError}</p>
                <p className="mt-1 text-xs text-red-400">
                  {browseMode
                    ? "Try again on BFM, or paste a product link instead."
                    : "Try another keyword on BFM, or paste a product link instead."}
                </p>
              </div>
            )}

            {showProductGrid && (
              <div className="space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {affiliateMode && trimmedInput
                        ? `Search results for “${trimmedInput}”`
                        : smartMode
                          ? "Smart Search results"
                          : "Lazada products"}
                    </p>
                    <p className="text-xs text-slate-500">
                      {searchState === "loading"
                        ? affiliateMode
                          ? "Searching your product catalog…"
                          : "Searching Lazada via Smart Search…"
                        : searchResults.length > 0
                          ? affiliateMode && feedMatched
                            ? feedMatchCount <= searchResults.length
                              ? `Showing all ${feedMatchCount} match${feedMatchCount !== 1 ? "es" : ""}`
                              : `Showing ${searchResults.length} of ${feedMatchCount} matches · page ${searchPage}`
                            : `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} on page ${searchPage}`
                          : "No products found for this search"}
                    </p>
                    <p className="text-[11px] text-slate-400">Tap product image to view full image.</p>
                  </div>
                  {searchResults.length > 0 && (
                    <label className="relative inline-flex w-full items-center sm:w-auto">
                      <span className="sr-only">Sort products</span>
                      <ArrowDownWideNarrow className="pointer-events-none absolute left-3 h-4 w-4 text-slate-400" />
                      <select
                        value={searchSort}
                        onChange={(e) => void handleSortChange(e.target.value as CatalogSort)}
                        className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-9 text-xs font-semibold text-slate-700 shadow-sm outline-none transition hover:border-slate-300 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 sm:w-52 sm:text-sm"
                      >
                        {SEARCH_SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="pointer-events-none absolute right-3 h-4 w-4 rotate-90 text-slate-400" />
                    </label>
                  )}
                </div>

                {searchResults.length > 0 ? (
                  <>
                    {searchState === "done" && (
                      <AdSenseUnit
                        key={`${trimmedInput.toLowerCase()}::${searchPage}`}
                        slotId={ADSENSE_SEARCH_SLOT}
                      />
                    )}
                    <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 lg:grid-cols-3">
                      {searchResults.map((result) => (
                        <SearchResultCard
                          key={result.source_id ?? result.url}
                          result={result}
                          rate={rate}
                          onSave={() => handleSaveSearchResult(result)}
                          saving={saving}
                          saved={isProductUrlSaved(savedItems, result.url)}
                          loggedIn={!!user}
                          onSignIn={onSignIn}
                          highlighted={highlightProductUrl === result.url}
                          searchMode={searchMode}
                        />
                      ))}
                    </div>
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => handleSearchPage(searchPage - 1)}
                        disabled={searchPage <= 1}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        <ChevronLeft className="h-4 w-4" />
                        Prev
                      </button>
                      <span className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600">
                        Page {searchPage}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (!user && (guestSearchLocked || hasGuestUsedFreeSearch())) {
                            setGuestSearchLocked(true);
                            setGuestLimitModalOpen(true);
                            return;
                          }
                          void handleSearchPage(searchPage + 1);
                        }}
                        disabled={!searchHasMore}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                      >
                        Next
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </>
                ) : affiliateMode ? (
                  <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-violet-50 p-6 shadow-sm sm:p-8">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-indigo-200/30 blur-2xl" />
                    <div className="pointer-events-none absolute -bottom-12 -left-8 h-32 w-32 rounded-full bg-violet-200/25 blur-2xl" />
                    <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-md shadow-indigo-100 ring-1 ring-indigo-100">
                        <Search className="h-6 w-6 text-indigo-500" />
                      </div>
                      <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-500">
                        Not in Search
                      </p>
                      <h3 className="mt-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                        “{trimmedInput}” is not present here
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-slate-600">
                        That searched product data is not present in here. You can upgrade to{" "}
                        <span className="font-semibold text-indigo-700">Smart Search</span> or search
                        in an app.
                      </p>
                      <div className="mt-6 flex w-full flex-col gap-2.5 sm:flex-row sm:justify-center">
                        {SMART_SEARCH_ENABLED && (
                          <button
                            type="button"
                            onClick={() => {
                              switchSearchMode("smart");
                              if (trimmedInput) {
                                window.setTimeout(() => {
                                  void runProductSearch(trimmedInput, 1);
                                }, 0);
                              }
                            }}
                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500"
                          >
                            <Sparkles className="h-4 w-4" />
                            Upgrade to Smart Search
                            <ArrowRight className="h-4 w-4" />
                          </button>
                        )}
                        <a
                          href={`https://www.lazada.co.th/catalog/?q=${encodeURIComponent(trimmedInput)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Search in an app
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm font-semibold text-slate-700">No products found</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Try a shorter keyword, English product name, or paste a product link.
                    </p>
                  </div>
                )}
              </div>
            )}

            {fetchState === "done" && preview && (
              <>
                <ProductPreviewCard
                  preview={preview}
                  onSave={handleSavePreview}
                  saving={saving}
                  saved={previewSaved}
                  loggedIn={!!user}
                  onSignIn={onSignIn}
                  searchMode={searchMode}
                />
                {previewSaved && (
                  <div className="flex flex-col items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-center sm:flex-row sm:text-left">
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-emerald-800">Saved to your wishlist</p>
                      <p className="text-xs text-emerald-600">View it anytime in the Wishlist tab.</p>
                    </div>
                    <Link
                      to="/wishlist"
                      className="rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
                    >
                      Open Wishlist
                    </Link>
                  </div>
                )}
              </>
            )}
          </div>
        )}
        </div>
      </section>

      {(affiliateMode || smartMode) && (
        <GuestSearchLimitModal
          open={guestLimitModalOpen && !user}
          onClose={() => setGuestLimitModalOpen(false)}
          onSignIn={onSignIn}
        />
      )}
      <SmartSearchAccessModal
        open={smartAccessModalOpen}
        onClose={() => setSmartAccessModalOpen(false)}
      />
    </div>
  );
}
