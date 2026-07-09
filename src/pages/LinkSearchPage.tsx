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
import type { AppOutletContext } from "../components/AppLayout";
import { ImageLightbox } from "../components/ImageLightbox";
import { PlatformShowcase } from "../components/PlatformShowcase";
import { ProductPreviewCard } from "../components/ProductPreviewCard";
import { useExchangeRate } from "../hooks/useExchangeRate";
import { useSavedItems } from "../contexts/SavedItemsProvider";
import { searchLazadaProducts } from "../lib/lazadaSearch";
import { fetchPreview } from "../lib/preview";
import { isFetchableUrl } from "../lib/utils";
import { formatMMK, formatTHB } from "../lib/utils";
import type { ProductPreview, ProductSearchResult } from "../types";

type FetchState = "idle" | "loading" | "done" | "error";

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

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-indigo-200 hover:shadow-md">
      <button
        type="button"
        onClick={() => {
          if (hasImage) setLightboxOpen(true);
        }}
        title={hasImage ? "View full image" : "Image not available"}
        className="group relative flex aspect-[4/3] w-full items-center justify-center bg-slate-50/80 p-2 sm:p-3"
      >
        {hasImage ? (
          <img
            src={result.image_url}
            alt={result.title ?? "Lazada product"}
            className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-[1.03]"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-indigo-50 text-sm font-bold text-indigo-600">
            Lazada
          </div>
        )}
      </button>

      <div className="space-y-3 border-t border-slate-100 p-4">
        <div className="space-y-1">
          <span className="inline-block rounded-md bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange-600">
            Lazada
          </span>
          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900">
            {result.title ?? result.url}
          </h3>
          {result.price_thb != null ? (
            <>
              <p className="text-lg font-bold text-slate-900">{formatTHB(result.price_thb)}</p>
              <p className="text-xs font-medium text-slate-500">
                ≈ {formatMMK(result.price_thb * rate)}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-slate-400">Price not available</p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {loggedIn ? (
            <button
              type="button"
              onClick={onSave}
              disabled={saving || saved}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                saved
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
              }`}
            >
              {saved ? <CheckCircle2 className="h-4 w-4" /> : <BookmarkPlus className="h-4 w-4" />}
              {saved ? "Saved" : "Save"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onSignIn}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
            >
              <BookmarkPlus className="h-4 w-4" />
              Sign in to save
            </button>
          )}

          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            Open Lazada
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

  const { rate } = useExchangeRate();
  const { saving, save } = useSavedItems();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const hasActivity =
    fetchState !== "idle" || !!preview || searchState !== "idle" || searchResults.length > 0;

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
    setPreview(null);
    setFetchState("idle");
    setFetchError("");
    setPreviewSaved(false);
    setSearchState("loading");
    setSearchError("");
    setSearchResults([]);
    setSearchPage(page);
    setSearchHasMore(false);
    if (page === 1) {
      setSavedResultUrls(new Set());
    }

    try {
      const response = await searchLazadaProducts(query, page);
      setSearchResults(response.results);
      setSearchPage(response.page);
      setSearchHasMore(response.hasMore);
      setSearchState("done");
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
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">Search Lazada products</p>
            <p className="mt-1 text-sm text-slate-400">
              Type a product name or paste a product URL above.
            </p>
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

            {searchState === "loading" && (
              <div className="flex items-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-lg shadow-slate-200/60">
                <Loader2 className="h-5 w-5 shrink-0 animate-spin text-indigo-500" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">Searching Lazada products...</p>
                  <div className="shimmer h-3 w-1/2 rounded-full" />
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
                <p className="mt-1 text-xs text-red-400">
                  Lazada search could not be loaded right now. Please try another keyword or paste a
                  direct product link.
                </p>
              </div>
            )}

            {searchState === "done" && (
              <div className="space-y-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Lazada products</p>
                    <p className="text-xs text-slate-500">
                      {searchResults.length > 0
                        ? `${searchResults.length} result${searchResults.length !== 1 ? "s" : ""} on page ${searchPage}`
                        : "No products found for this search"}
                    </p>
                    <p className="text-[11px] text-slate-400">Tap product image to view full image.</p>
                  </div>
                </div>

                {searchResults.length > 0 ? (
                  <>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
                        onClick={() => handleSearchPage(searchPage + 1)}
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
