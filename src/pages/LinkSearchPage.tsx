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
  Heart,
  Link2,
  Loader2,
  MessageCircle,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { AdSenseUnit } from "../components/AdSenseUnit";
import type { AppOutletContext } from "../components/AppLayout";
import { BrandLogo } from "../components/BrandLogo";
import { GuestSearchLimitModal } from "../components/GuestSearchLimitModal";
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
import { clearLastLazadaSearch, loadLastLazadaSearch } from "../lib/lazadaSearchCache";
import { SHEIN_SEARCH_PAGE_SIZE, searchSheinProducts } from "../lib/sheinSearch";
import { clearLastSheinSearch, loadLastSheinSearch } from "../lib/sheinSearchCache";
import { fetchPreview } from "../lib/preview";
import { BFM_ERRORS, toBfmUserError } from "../lib/bfmMessages";
import { isProductUrlSaved } from "../lib/savedLinkMatch";
import { recordSearchHistory } from "../lib/searchHistory";
import { isFetchableUrl } from "../lib/utils";
import { formatMMK, formatSoldCount, formatTHB } from "../lib/utils";
import type { ProductPreview, ProductSearchResult } from "../types";

type FetchState = "idle" | "loading" | "done" | "error";
type SearchPlatform = "lazada" | "shein";
const ADSENSE_SEARCH_SLOT =
  (import.meta.env.VITE_ADSENSE_SEARCH_SLOT as string | undefined)?.trim() ?? "";

const SEARCH_PLATFORM_TABS: {
  id: SearchPlatform;
  label: string;
  hint: string;
  activeClass: string;
}[] = [
  {
    id: "lazada",
    label: "Lazada",
    hint: "Marketplace",
    activeClass: "bg-white text-[#0F146D] shadow-md shadow-black/20",
  },
  {
    id: "shein",
    label: "SHEIN",
    hint: "Fashion store",
    activeClass: "bg-white text-slate-950 shadow-md shadow-black/20",
  },
];

function platformDisplayName(platform: SearchPlatform): string {
  return platform === "shein" ? "SHEIN" : "Lazada";
}

interface SearchResultCardProps {
  result: ProductSearchResult;
  rate: number;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  loggedIn: boolean;
  onSignIn: () => void;
}

function SearchResultCard({
  result,
  rate,
  onSave,
  saving,
  saved,
  loggedIn,
  onSignIn,
}: SearchResultCardProps) {
  const [imgError, setImgError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasImage = Boolean(result.image_url && !imgError);
  const siteLabel = result.site_name || "Product";
  const isShein = siteLabel.toUpperCase() === "SHEIN";

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
              alt={result.title ?? `${siteLabel} product`}
              className="h-full w-full object-cover object-center transition-transform duration-200 group-hover:scale-[1.03]"
              onError={() => setImgError(true)}
            />
          </span>
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <div
              className={`flex h-20 w-20 items-center justify-center rounded-2xl text-sm font-bold sm:h-24 sm:w-24 ${
                isShein ? "bg-black text-white" : "bg-indigo-50 text-indigo-600"
              }`}
            >
              {siteLabel}
            </div>
          </span>
        )}
      </button>

      <div className="flex min-h-0 flex-1 flex-col border-t border-slate-100 p-3 sm:p-4">
        <div className="flex min-h-0 flex-1 flex-col gap-1.5">
          <div className="h-5 shrink-0">
            <span
              className={`inline-block rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                isShein ? "bg-black text-white" : "bg-orange-50 text-orange-600"
              }`}
            >
              {siteLabel}
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
  const [searchState, setSearchState] = useState<FetchState>("idle");
  const [searchResults, setSearchResults] = useState<ProductSearchResult[]>([]);
  const [searchPage, setSearchPage] = useState(1);
  const [searchHasMore, setSearchHasMore] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [guestSearchLocked, setGuestSearchLocked] = useState(() => hasGuestUsedFreeSearch());
  const [guestLimitModalOpen, setGuestLimitModalOpen] = useState(false);
  const [searchPlatform, setSearchPlatform] = useState<SearchPlatform>("lazada");

  const { rate } = useExchangeRate();
  const { items: savedItems, saving, save } = useSavedItems();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      clearGuestFreeSearchUsed();
      setGuestSearchLocked(false);
      setGuestLimitModalOpen(false);
      return;
    }
    setGuestSearchLocked(hasGuestUsedFreeSearch());
  }, [user]);

  const hasActivity =
    fetchState !== "idle" || !!preview || searchState !== "idle" || searchResults.length > 0;

  function applyCachedSearch(
    platform: SearchPlatform,
    last: {
      query: string;
      page: number;
      hasMore: boolean;
      results: ProductSearchResult[];
    },
  ) {
    const pageSize = platform === "shein" ? SHEIN_SEARCH_PAGE_SIZE : LAZADA_SEARCH_PAGE_SIZE;
    setSearchPlatform(platform);
    setUrl(last.query);
    setSearchResults(last.results.slice(0, pageSize));
    setSearchPage(last.page);
    setSearchHasMore(last.hasMore);
    setSearchState("done");
    setSearchError("");
    setFetchState("idle");
    setPreview(null);
    setFetchError("");
  }

  // Restore the most recent Lazada/SHEIN search when returning to the page
  useEffect(() => {
    const lazada = loadLastLazadaSearch();
    const shein = loadLastSheinSearch();
    const candidates = [
      lazada && lazada.results.length > 0
        ? { platform: "lazada" as const, savedAt: lazada.savedAt, data: lazada }
        : null,
      shein && shein.results.length > 0
        ? { platform: "shein" as const, savedAt: shein.savedAt, data: shein }
        : null,
    ].filter((item): item is NonNullable<typeof item> => item !== null);

    if (candidates.length === 0) return;
    candidates.sort((a, b) => b.savedAt - a.savedAt);
    const newest = candidates[0];
    applyCachedSearch(newest.platform, newest.data);
  }, []);

  function switchSearchPlatform(platform: SearchPlatform) {
    if (platform === searchPlatform) return;
    setSearchPlatform(platform);
    setSearchError("");
    setFetchState("idle");
    setPreview(null);
    setFetchError("");

    const cached =
      platform === "shein" ? loadLastSheinSearch() : loadLastLazadaSearch();
    if (cached && cached.results.length > 0) {
      applyCachedSearch(platform, cached);
      return;
    }

    // Keep the typed query, but clear stale results from the other platform
    setSearchResults([]);
    setSearchPage(1);
    setSearchHasMore(false);
    setSearchState("idle");
    if (isFetchableUrl(url.trim())) setUrl("");
  }

  useEffect(() => {
    const trimmed = url.trim();
    if (!isFetchableUrl(trimmed)) {
      setFetchState("idle");
      setPreview(null);
      setFetchError("");
      return;
    }

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

  async function runProductSearch(query: string, page = 1, platform: SearchPlatform = searchPlatform) {
    const platformLabel = platformDisplayName(platform);
    // Guests get one free keyword search. Extra searches (and pagination) require sign-in.
    if (!user && (page > 1 || guestSearchLocked || hasGuestUsedFreeSearch())) {
      setGuestSearchLocked(true);
      setGuestLimitModalOpen(true);
      setSearchError("");
      setSearchState(searchResults.length > 0 ? "done" : "idle");
      return;
    }

    setPreview(null);
    setFetchState("idle");
    setFetchError("");
    setSearchError("");
    setSearchPage(page);
    setSearchPlatform(platform);

    // Keep previous results visible while loading a new page/query when possible
    setSearchState("loading");

    try {
      const response =
        platform === "shein"
          ? await searchSheinProducts(query, page)
          : await searchLazadaProducts(query, page);

      setSearchResults(response.results);
      setSearchPage(response.page);
      setSearchHasMore(response.hasMore);
      setSearchState("done");
      if (!user && page === 1) {
        markGuestFreeSearchUsed();
        setGuestSearchLocked(true);
        setGuestLimitModalOpen(true);
      }
      if (user && page === 1) {
        void recordSearchHistory(user.id, `${platformLabel}: ${query}`);
      }
    } catch (e) {
      setSearchError(toBfmUserError(e, BFM_ERRORS.searchFailed));
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
        setGuestLimitModalOpen(true);
        return;
      }
      await runProductSearch(trimmed, 1, searchPlatform);
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
    setSearchState("idle");
    setSearchResults([]);
    setSearchPage(1);
    setSearchHasMore(false);
    setSearchError("");
    // Drop restored search cache so cleared results stay gone.
    clearLastLazadaSearch();
    clearLastSheinSearch();
    inputRef.current?.focus();
  }

  async function handleSearchPage(nextPage: number) {
    if (searchState === "loading") return;
    if (!trimmedInput || isFetchableUrl(trimmedInput)) return;
    await runProductSearch(trimmedInput, nextPage, searchPlatform);
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
  const isSearching = fetchState === "loading" || searchState === "loading";
  const platformLabel = platformDisplayName(searchPlatform);
  const submitLabel = trimmedInput && !isFetchableUrl(trimmedInput) ? `Search ${platformLabel}` : "Preview";
  const previewSaved = preview ? isProductUrlSaved(savedItems, preview.url) : false;

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
            Search Lazada or SHEIN products, or paste any product URL — we fetch the details so you can
            save it to your wishlist.
          </p>
          {!user && (
            <p className="mx-auto mt-2 max-w-lg text-xs text-slate-500">
              {guestSearchLocked
                ? "Free guest search used. Sign in to keep searching."
                : "Guests get 1 free product search. Sign in for unlimited searches."}
            </p>
          )}

          <div
            role="tablist"
            aria-label="Search platform"
            className="mx-auto mt-5 grid w-full max-w-sm grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-black/25 p-1 backdrop-blur-sm"
          >
            {SEARCH_PLATFORM_TABS.map((tab) => {
              const active = searchPlatform === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => switchSearchPlatform(tab.id)}
                  className={`relative rounded-xl px-2 py-2.5 text-center transition duration-200 sm:px-3 ${
                    active
                      ? tab.activeClass
                      : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  <span className="block text-xs font-bold tracking-wide sm:text-sm">
                    {tab.label}
                  </span>
                  <span
                    className={`mt-0.5 block text-[10px] font-medium ${
                      active ? "opacity-70" : "opacity-50"
                    }`}
                  >
                    {tab.hint}
                  </span>
                </button>
              );
            })}
          </div>

          <form
            onSubmit={handleSubmit}
            className="mt-4 flex w-full min-w-0 flex-col gap-2 sm:mt-5 lg:flex-row lg:overflow-hidden lg:rounded-2xl lg:bg-white lg:shadow-2xl lg:shadow-black/30 lg:ring-1 lg:ring-white/10"
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
                placeholder={`Search ${platformLabel} or paste a product link...`}
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

          <PlatformShowcase />
        </div>
      </section>

      {/* Preview */}
      <section className="bg-[#f8fafc] px-4 pb-8 pt-2 sm:px-6 sm:pb-10">
        <div ref={resultsRef} className="mx-auto max-w-5xl scroll-mt-16">
        {!hasActivity && (
          <div className="space-y-4">
            <section className="relative overflow-hidden rounded-[1.75rem] border border-slate-200/80 bg-white shadow-sm shadow-slate-200/50">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.12),_transparent_55%),radial-gradient(ellipse_at_bottom_left,_rgba(14,165,233,0.08),_transparent_50%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-300/60 to-transparent" />

              <div className="relative px-5 py-7 sm:px-8 sm:py-9">
                <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:gap-7">
                  <BrandLogo className="h-16 w-16 rounded-2xl shadow-lg shadow-slate-900/10 sm:h-[4.5rem] sm:w-[4.5rem]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-indigo-600">
                      About
                    </p>
                    <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-950 sm:text-3xl">
                      Buy For Me
                    </h2>
                    <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
                      Myanmar customers shop from Thailand with confidence — search products, save
                      favourites, and request purchases through Messenger.
                    </p>
                  </div>
                </div>

                <div className="mt-7 grid gap-3 sm:grid-cols-3">
                  {[
                    {
                      icon: Search,
                      title: "Search & paste",
                      text: "Find Lazada or SHEIN items, or paste any product link.",
                    },
                    {
                      icon: Heart,
                      title: "Save wishlist",
                      text: "Keep favourites and share lists with QR codes.",
                    },
                    {
                      icon: MessageCircle,
                      title: "Order easily",
                      text: "Request buys through Messenger in one tap.",
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

                <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-slate-100 pt-5 text-sm font-semibold">
                  <Link
                    to="/our-service"
                    className="inline-flex items-center gap-1.5 text-slate-800 transition hover:text-indigo-600"
                  >
                    <Link2 className="h-3.5 w-3.5" />
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

            <div className="rounded-2xl border border-dashed border-slate-200 bg-white/80 p-8 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
                <Search className="h-6 w-6 text-slate-400" />
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-700">Search {platformLabel} products</p>
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
                  <p className="text-sm font-semibold text-slate-700">Searching {platformLabel} products...</p>
                  <p className="text-xs text-slate-400">
                    {searchPlatform === "shein"
                      ? "BFM is searching — this can take a little longer. Please wait…"
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

            {searchState === "error" && (
              <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                <p className="text-sm font-semibold text-red-700">{searchError}</p>
                <p className="mt-1 text-xs text-red-400">
                  Try another keyword on BFM, or paste a product link instead.
                </p>
              </div>
            )}

            {(searchState === "done" || (searchState === "loading" && searchResults.length > 0)) && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{platformLabel} products</p>
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
                        <SearchResultCard
                          key={result.source_id ?? result.url}
                          result={result}
                          rate={rate}
                          onSave={() => handleSaveSearchResult(result)}
                          saving={saving}
                          saved={isProductUrlSaved(savedItems, result.url)}
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
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
                    <p className="text-sm font-semibold text-slate-700">No {platformLabel} products found</p>
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

      <GuestSearchLimitModal
        open={guestLimitModalOpen && !user}
        onClose={() => setGuestLimitModalOpen(false)}
        onSignIn={onSignIn}
      />
    </div>
  );
}
