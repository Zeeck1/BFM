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
  Loader2,
  Sparkles,
  X,
} from "lucide-react";
import type { AppOutletContext } from "../components/AppLayout";
import { PlatformShowcase } from "../components/PlatformShowcase";
import { ProductPreviewCard } from "../components/ProductPreviewCard";
import { useExchangeRate } from "../hooks/useExchangeRate";
import { useSavedItems } from "../contexts/SavedItemsProvider";
import { fetchPreview } from "../lib/preview";
import { isFetchableUrl } from "../lib/utils";
import type { ProductPreview } from "../types";

type FetchState = "idle" | "loading" | "done" | "error";

export function LinkSearchPage() {
  const { user, onSignIn } = useOutletContext<AppOutletContext>();
  const [url, setUrl] = useState("");
  const [fetchState, setFetchState] = useState<FetchState>("idle");
  const [preview, setPreview] = useState<ProductPreview | null>(null);
  const [fetchError, setFetchError] = useState("");
  const [previewSaved, setPreviewSaved] = useState(false);

  const { rate } = useExchangeRate();
  const { saving, save } = useSavedItems();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const hasActivity = fetchState !== "idle" || !!preview;

  useEffect(() => {
    const trimmed = url.trim();
    if (!isFetchableUrl(trimmed)) {
      setFetchState("idle");
      setPreview(null);
      setFetchError("");
      return;
    }

    setPreviewSaved(false);
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
  }, [hasActivity, fetchState, preview]);

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").trim();
    if (pasted.startsWith("http")) setTimeout(() => setUrl(pasted), 0);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;

    if (!isFetchableUrl(trimmed)) {
      setFetchError("Invalid URL — must start with http:// or https://");
      setFetchState("error");
      setPreview(null);
      return;
    }

    setPreviewSaved(false);
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
    inputRef.current?.focus();
  }

  async function handleSavePreview() {
    if (!preview || !user) {
      onSignIn();
      return;
    }
    const saved = await save(preview, rate);
    if (saved) setPreviewSaved(true);
  }

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
            Paste a link,{" "}
            <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent">
              preview instantly
            </span>
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-slate-400 sm:mt-3 sm:max-w-none sm:text-base">
            Drop any product URL below — we fetch the details so you can save it to your wishlist.
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
                type="url"
                inputMode="url"
                autoComplete="off"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onPaste={handlePaste}
                placeholder="Paste a product link…"
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
              disabled={fetchState === "loading" || !url.trim()}
              className="flex w-full shrink-0 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white transition hover:bg-indigo-500 disabled:opacity-40 sm:py-4 lg:w-auto lg:rounded-none lg:px-6"
            >
              {fetchState === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  Preview
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <PlatformShowcase />
        </div>
      </section>

      {/* Preview */}
      <section className="bg-[#f8fafc] px-4 pb-8 pt-2 sm:px-6 sm:pb-10">
        <div ref={resultsRef} className="mx-auto max-w-2xl scroll-mt-16">
        {!hasActivity && (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100">
              <BookmarkPlus className="h-6 w-6 text-slate-400" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-700">No link pasted yet</p>
            <p className="mt-1 text-sm text-slate-400">
              Copy a product URL from any shop and paste it above.
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
