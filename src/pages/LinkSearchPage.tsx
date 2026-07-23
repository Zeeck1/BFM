import {
  type ClipboardEvent,
  type FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  ArrowRight,
  BookmarkPlus,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { AdSenseUnit } from "../components/AdSenseUnit";
import type { AppOutletContext } from "../components/AppLayout";
import { ImageLightbox } from "../components/ImageLightbox";
import { PlatformShowcase } from "../components/PlatformShowcase";
import { ProductPreviewCard } from "../components/ProductPreviewCard";
import { useExchangeRate } from "../hooks/useExchangeRate";
import { useSavedItems } from "../contexts/SavedItemsProvider";
import {
  clearGuestFreeSearchUsed,
  hasGuestUsedFreeSearch,
  markGuestFreeSearchUsed,
} from "../lib/guestSearchLimit";
import { LAZADA_SEARCH_PAGE_SIZE, searchLazadaProducts } from "../lib/lazadaSearch";
import { loadLastLazadaSearch } from "../lib/lazadaSearchCache";
import { fetchPreview } from "../lib/preview";
import { recordSearchHistory } from "../lib/searchHistory";
import { isFetchableUrl } from "../lib/utils";
import { formatMMK, formatSoldCount, formatTHB } from "../lib/utils";
import type { ProductPreview, ProductSearchResult } from "../types";

type FetchState = "idle" | "loading" | "done" | "error";
const ADSENSE_SEARCH_SLOT =
  (import.meta.env.VITE_ADSENSE_SEARCH_SLOT as string | undefined)?.trim() ?? "";

interface LazadaResultCardProps {
  result: ProductSearchResult;
  rate: number;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  loggedIn: boolean;
  onSignIn: () => void;
}

function LazadaResultCard({
  result,
  rate,
  onSave,
  saving,
  saved,
  loggedIn,
  onSignIn,
}: LazadaResultCardProps) {
  const [imgError, setImgError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasImage = Boolean(result.image_url && !imgError);

  const hasShopName = Boolean(result.shop_name?.trim());
  const hasSoldCount = result.sold_count != null && result.sold_count > 0;

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md">
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
              alt={result.title ?? "Lazada product"}
              className="h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.03]"
              onError={() => setImgError(true)}
            />
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-600 sm:h-24 sm:w-24">
              Lazada
            </div>
          </span>
        )}
      </button>

      <div className="flex min-h-0 flex-1 flex-col border-t border-slate-100 p-3 sm:p-4">
        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          <div className="h-5 shrink-0">
            <span className="inline-block rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-600">
              Lazada
            </span>
          </div>
          <Link
            to={`/product-detail?url=${encodeURIComponent(result.url)}`}
            state={{ product: result, from: "/" }}
            className="line-clamp-2 block h-9 shrink-0 overflow-hidden text-xs font-semibold leading-[1.125rem] text-slate-900 transition hover:text-indigo-600 sm:h-10 sm:text-sm sm:leading-5"
          >
            {result.title ?? result.url}
          </Link>
          <div className="min-h-[2.75rem] shrink-0 sm:min-h-[3rem]">
            {result.price_thb != null ? (
              <>
                <p className="truncate text-base font-bold leading-tight text-slate-900 sm:text-lg">
                  {formatTHB(result.price_thb)}
                </p>
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
          <p className="line-clamp-1 min-h-[1.125rem] shrink-0 text-[11px] font-medium sm:text-xs">
            {hasShopName && <span className="text-slate-600">{result.shop_name}</span>}
            {hasShopName && hasSoldCount && <span className="text-slate-400"> · </span>}
            {hasSoldCount ? (
              <span className="text-emerald-600">{formatSoldCount(result.sold_count!)} sold</span>
            ) : (
              !hasShopName && <span className="invisible">&nbsp;</span>
            )}
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
  const [url, setUrl] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [preview, setPreview] = useState<ProductPreview | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [previewSaved, setPreviewSaved] = useState(false);
  const [searchState, setSearchState] = useState<FetchState>("idle");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [savedResultUrls, setSavedResultUrls] = useState<Set<string>>(new Set());
  const [guestSearchLocked, setGuestSearchLocked] = useState(() => hasGuestUsedFreeSearch());

  const { rate } = useExchangeRate();
  const { saving, save } = useSavedItems();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      clearGuestFreeSearchUsed();
      setGuestSearchLocked(false);
      return;
    }
    setGuestSearchLocked(hasGuestUsedFreeSearch());
  }, [user]);

  const hasActivity =
    fetchState !== "idle" || !!preview || searchState !== "idle" || searchResults.length > 0;

  // Restore last Lazada search instantly when returning to the page
  useEffect(() => {
    const last = loadLastLazadaSearch();
    if (!last || last.results.length === 0) return;
    setUrl(last.query);
    setSearchResults(last.results.slice(0, LAZADA_SEARCH_PAGE_SIZE));
    setSearchPage(last.page);
    setSearchHasMore(last.hasMore);
    setSearchState("done");
    setSearchError("");
    setFetchState("idle");
    setPreview(null);
  }, []);

  useEffect(() => {
    const trimmed = url.trim();
    if (!isFetchableUrl(trimmed)) {
      setFetchState("idle");
      setPreview(null);
      setFetchError("");
      return;
    }

    setPreviewSaved(false);
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
        setFetchError(e instanceof Error ? e.message : "Failed to load preview");
        setFetchState("error");
      }
    }, 700);

    return () => clearTimeout(timer);
  }, [url]);

  useEffect(() => {
    if (!hasActivity) return;

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

  async function runLazadaSearch(query: string, page = 1) {
    // Guests get one free keyword search. Extra searches (and pagination) require sign-in.
    if (!user && (page > 1 || guestSearchLocked || hasGuestUsedFreeSearch())) {
      setGuestSearchLocked(true);
      setSearchError("Sign in to search again. Guests can search Lazada once for free.");
      setSearchState("error");
      onSignIn();
      return;
    }

    setPreview(null);
    setFetchState("idle");
    setFetchError("");
    setPreviewSaved(false);
    setSearchError("");
    setSearchPage(page);
    if (page === 1) {
      setSavedResultUrls(new Set());
    }

    // Keep previous results visible while loading a new page/query when possible
    setSearchState("loading");

    try {
      const response = await searchLazadaProducts(query, page);
      setSearchResults(response.results);
      setSearchPage(response.page);
      setSearchHasMore(response.hasMore);
      setSearchState("done");
      if (!user && page === 1) {
        markGuestFreeSearchUsed();
        setGuestSearchLocked(true);
      }
      if (user && page === 1) {
        void recordSearchHistory(user.id, query);
      }
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "Failed to search Lazada products");
      setSearchHasMore(false);
      setSearchState("error");
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!isFetchableUrl(trimmed)) {
      if (!user && (guestSearchLocked || hasGuestUsedFreeSearch())) {
        setGuestSearchLocked(true);
        setSearchError("Sign in to search again. Guests can search Lazada once for free.");
        setSearchState("error");
        onSignIn();
        return;
      }
      await runLazadaSearch(trimmed, 1);
      return;
    }

    setPreviewSaved(false);
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
      setFetchError(e instanceof Error ? e.message : "Failed to load preview");
      setFetchState("error");
    }
  }

  function clearInput() {
    setUrl("");
    setPreview(null);
    setFetchState("idle");
    setFetchError("");
    setPreviewSaved(false);
    setSearchState("idle");
    setSearchResults([]);
    setSearchPage(1);
    setSearchHasMore(false);
    setSearchError("");
    setSavedResultUrls(new Set());
    inputRef.current?.focus();
  }

  async function handleSearchPage(nextPage: number) {
    if (searchState === "loading") return;
    if (!trimmedInput || isFetchableUrl(trimmedInput)) return;
    await runLazadaSearch(trimmedInput, nextPage);
  }

  async function handleSavePreview() {
    if (!preview || !user) {
      onSignIn();
      return;
    }
    const saved = await save(preview, rate);
    if (saved) setPreviewSaved(true);
  }

  async function handleSaveSearchResult(result: ProductSearchResult) {
    if (!user) {
      onSignIn();
      return;
    }

    const saved = await save(result, rate);
    if (saved) {
      setSavedResultUrls((current) => {
        const next = new Set(current);
        next.add(result.url);
        return next;
      });
    }
  }

  const trimmedInput = url.trim();
  const isSearching = fetchState === "loading" || searchState === "loading";
  const submitLabel = trimmedInput && !isFetchableUrl(trimmedInput) ? "Search Lazada" : "Preview";

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
            Search here or{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              Paste a link
            </span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400 sm:mt-3 sm:max-w-none sm:text-base">
            Search Lazada products or paste any product URL — we fetch the details so you can save
            it to your wishlist.
          </p>
          {!user && (
            <p className="mx-auto mt-2 max-w-lg text-xs text-slate-500">
              {guestSearchLocked
                ? "Free guest search used. Sign in to keep searching Lazada."
                : "Guests get 1 free Lazada search. Sign in for unlimited searches."}
            </p>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-6 flex w-full min-w-0 flex-col gap-2 sm:mt-8 lg:flex-row lg:overflow-hidden lg:rounded-2xl lg:bg-white lg:shadow-2xl lg:shadow-black/30 lg:ring-1 lg:ring-white/10"
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
                placeholder="Search Lazada or paste a product link..."
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
              disabled={isSearching || !trimmedInput}
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-40 sm:py-4 lg:w-auto lg:rounded-none lg:px-6"
            >
              {isSearching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  {submitLabel === "Search Lazada" ? (
                    <Search className="h-4 w-4" />
                  ) : (
                    <ArrowRight className="h-4 w-4" />
                  )}
                  {submitLabel}
                </>
              )}
            </button>
          </form>

          <PlatformShowcase />
        </div>
      </section>

      {/* Preview */}
      <section className="bg-[#f8fafc] px-4 pb-8 pt-2 sm:px-6 sm:pb-10">
        <div ref={resultsRef} className="mx-auto max-w-5xl scroll-mt-16">
        {!hasActivity && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
              <h2 className="text-base font-bold text-slate-900">About Buy For Me</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-600">
                Buy For Me (BFM) helps Myanmar customers shop from Thailand. Search Lazada products,
                paste product links, save items to your wishlist, share lists with QR codes, and
                request purchases through Messenger. Sign in with Google only to identify your
                account and save your shopping list.
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm font-semibold">
                <Link to="/our-service" className="text-indigo-600 hover:text-indigo-700">
                  Our Service
                </Link>
                <span className="text-slate-300">·</span>
                <Link to="/privacy" className="text-indigo-600 hover:text-indigo-700">
                  Privacy Policy
                </Link>
                <span className="text-slate-300">·</span>
                <Link to="/terms" className="text-indigo-600 hover:text-indigo-700">
                  Terms of Service
                </Link>
              </div>
            </div>
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">Search Lazada products</p>
              <p className="mt-1 text-sm text-slate-400">
                Type a product name or paste a product URL above.
              </p>
            </div>
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

            {searchState === "loading" && searchResults.length === 0 && (
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-lg shadow-slate-200/60">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-500" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Searching Lazada products...</p>
                  <p className="text-xs text-slate-400">Usually 1–3 seconds.</p>
                </div>
              </div>
            )}

            {fetchState === "error" && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                <p className="text-sm font-semibold text-red-700">{fetchError}</p>
                <p className="mt-1 text-xs text-red-400">
                  The link couldn&apos;t be fetched, but you can still save it.
                </p>
                {isFetchableUrl(url.trim()) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {user ? (
                      <button
                        onClick={async () => {
                          const saved = await save({ url: url.trim() }, rate);
                          if (saved) {
                            setPreviewSaved(true);
                            setFetchState("idle");
                          }
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

            {searchState === "error" && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                <p className="text-sm font-semibold text-red-700">{searchError}</p>
                {!user && guestSearchLocked ? (
                  <div className="mt-3">
                    <p className="text-xs text-red-400">
                      Create a free account to unlock unlimited Lazada searches and save products.
                    </p>
                    <button
                      type="button"
                      onClick={onSignIn}
                      className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                    >
                      Sign in to continue
                    </button>
                  </div>
                ) : (
                  <p className="mt-1 text-xs text-red-400">
                    Lazada search could not be loaded right now. Please try another keyword or paste a
                    direct product link.
                  </p>
                )}
              </div>
            )}

            {!user && guestSearchLocked && searchState === "done" && searchResults.length > 0 && (
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50 p-4 sm:p-5">
                <p className="text-sm font-semibold text-indigo-900">Free guest search used</p>
                <p className="mt-1 text-xs text-indigo-700">
                  Sign in to search again, open more pages, and save products to your wishlist.
                </p>
                <button
                  type="button"
                  onClick={onSignIn}
                  className="mt-3 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Sign in to search more
                </button>
              </div>
            )}

            {(searchState === "done" || (searchState === "loading" && searchResults.length > 0)) && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Lazada products</p>
                    <p className="text-xs text-slate-500">
                      {searchState === "loading"
                        ? "Updating results..."
                        : searchResults.length > 0
                          ? `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} on page ${searchPage}`
                          : "No products found for this search"}
                    </p>
                    <p className="text-[11px] text-slate-400">Tap product image to view full image.</p>
                  </div>
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
                        <LazadaResultCard
                          key={result.source_id ?? result.url}
                          result={result}
                          rate={rate}
                          onSave={() => handleSaveSearchResult(result)}
                          saving={saving}
                          saved={savedResultUrls.has(result.url)}
                          loggedIn={!!user}
                          onSignIn={onSignIn}
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
                          if (!user && guestSearchLocked) {
                            onSignIn();
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
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm font-semibold text-slate-700">No Lazada products found</p>
                    <p className="mt-1 text-sm text-slate-400">
                      Try a shorter keyword, English product name, or paste a Lazada product link.
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
    </div>
  );
}
