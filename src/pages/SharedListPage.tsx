import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Clock,
  ExternalLink,
  Heart,
  Loader2,
  MessageCircle,
  ShoppingBag,
  Sparkles,
} from "lucide-react";
import { SiteAvatar } from "../components/SiteAvatar";
import { ImageLightbox } from "../components/ImageLightbox";
import { fetchSharedList, timeRemaining, type SharedList } from "../lib/shareList";
import { buildBuyForMeMessengerUrl } from "../lib/messenger";
import { formatMMK, formatTHB } from "../lib/utils";
import type { SavedLink } from "../types";

function SharedItemRow({ item, index }: { item: SavedLink; index: number }) {
  const [imgError, setImgError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const hasImage = Boolean(item.image_url && !imgError);

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex gap-0 sm:gap-0">
        {/* Thumbnail */}
        <button
          type="button"
          onClick={() => hasImage && setLightboxOpen(true)}
          className="relative h-32 w-28 shrink-0 overflow-hidden bg-slate-50 sm:h-36 sm:w-32"
        >
          {hasImage ? (
            <img
              src={item.image_url}
              alt={item.title ?? "Product"}
              className="h-full w-full object-cover object-center"
              onError={() => setImgError(true)}
            />
          ) : (
            <SiteAvatar name={item.site_name} />
          )}
          <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-[11px] font-bold text-slate-600 shadow-sm">
            {index + 1}
          </span>
        </button>

        {/* Details */}
        <div className="flex min-w-0 flex-1 flex-col justify-between p-3 sm:p-4">
          <div className="min-w-0 space-y-1">
            {item.site_name && (
              <span className="inline-block rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                {item.site_name}
              </span>
            )}
            <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 sm:text-base">
              {item.title ?? "Product link"}
            </h2>
            {item.notes?.trim() && (
              <p className="line-clamp-1 text-xs text-amber-700">{item.notes}</p>
            )}
          </div>

          <div className="mt-2 flex flex-wrap items-end justify-between gap-2">
            <div>
              {item.price_mmk != null ? (
                <>
                  <p className="text-base font-bold text-slate-900">{formatMMK(item.price_mmk)}</p>
                  {item.price_thb != null && (
                    <p className="text-[11px] text-slate-400">{formatTHB(item.price_thb)}</p>
                  )}
                </>
              ) : (
                <p className="text-xs italic text-slate-400">Price on request</p>
              )}
            </div>

            <div className="flex shrink-0 gap-1.5">
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50"
                aria-label="Open product link"
              >
                <ExternalLink className="h-4 w-4" />
              </a>
              <a
                href={buildBuyForMeMessengerUrl([item], { fromQrReferral: true })}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-[#0084FF] px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#0078eb] sm:px-4 sm:text-sm"
              >
                <MessageCircle className="h-4 w-4" />
                Buy Now
              </a>
            </div>
          </div>
        </div>
      </div>

      {lightboxOpen && item.image_url && (
        <ImageLightbox
          src={item.image_url}
          alt={item.title ?? "Product"}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </article>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f1f5f9] pb-[env(safe-area-inset-bottom)]">
      {children}
    </div>
  );
}

export function SharedListPage() {
  const { shareId } = useParams<{ shareId: string }>();
  const [list, setList] = useState<SharedList | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!shareId) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function loadSharedList() {
      const data = await fetchSharedList(shareId!);
      if (cancelled) return;

      if (data) {
        setList(data);
        setNotFound(false);
      } else {
        setList(null);
        setNotFound(true);
      }
      setLoading(false);
    }

    void loadSharedList();

    const interval = window.setInterval(() => {
      void fetchSharedList(shareId!).then((data) => {
        if (cancelled) return;
        if (data) {
          setList(data);
          setNotFound(false);
        } else {
          setList(null);
          setNotFound(true);
        }
      });
    }, 15_000);

    function handleVisibility() {
      if (document.visibilityState === "visible") {
        void loadSharedList();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [shareId]);

  const totalMmk = useMemo(
    () => list?.items.reduce((sum, item) => sum + (item.price_mmk ?? 0), 0) ?? 0,
    [list],
  );

  const pricedCount = useMemo(
    () => list?.items.filter((i) => i.price_mmk != null).length ?? 0,
    [list],
  );

  if (loading) {
    return (
      <PageShell>
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
          </div>
          <p className="text-sm font-medium text-slate-600">Opening shared list…</p>
        </div>
      </PageShell>
    );
  }

  if (notFound || !list) {
    return (
      <PageShell>
        <div className="flex min-h-screen flex-col items-center justify-center gap-5 px-6 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm">
            <Heart className="h-8 w-8 text-slate-300" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Link expired</h1>
            <p className="mt-2 max-w-xs text-sm text-slate-500">
              This shared list is no longer available. Links expire after 2 days.
            </p>
          </div>
          <Link
            to="/"
            className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Visit Buy For Me
          </Link>
        </div>
      </PageShell>
    );
  }

  const ownerLabel = list.owner_name ? `${list.owner_name}'s Favourites` : "Shared Favourites";
  const allMessengerUrl = buildBuyForMeMessengerUrl(list.items, { fromQrReferral: true });
  const showStickyBar = list.items.length > 0;

  return (
    <PageShell>
      {/* Hero */}
      <header className="relative overflow-hidden bg-slate-900 px-4 pb-8 pt-6 sm:px-6">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.25),transparent_60%)]" />

        <div className="relative mx-auto max-w-lg">
          {/* Brand */}
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
                <ShoppingBag className="h-4 w-4 text-white" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Buy For Me
              </span>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">
              <Clock className="h-3 w-3 text-amber-400" />
              {timeRemaining(list)}
            </span>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-2.5 py-1 text-[11px] font-semibold text-indigo-200">
              <Sparkles className="h-3 w-3" />
              Shared wishlist
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
              {ownerLabel}
            </h1>
            <p className="text-sm text-slate-400">
              {list.items.length} product{list.items.length !== 1 ? "s" : ""} picked for you
              {pricedCount > 0 && totalMmk > 0 && (
                <span className="text-slate-300"> · est. {formatMMK(totalMmk)} total</span>
              )}
            </p>
          </div>
        </div>
      </header>

      {/* Product list */}
      <main className="relative mx-auto max-w-lg px-4 pb-28 pt-5 sm:px-6">
        <div className="-mt-10 space-y-3">
          {list.items.map((item, index) => (
            <SharedItemRow key={item.id} item={item} index={index} />
          ))}
        </div>

        
      </main>

      {/* Sticky buy bar */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-20 border-t border-slate-200/80 bg-white/95 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-md">
          <div className="mx-auto flex max-w-lg items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {list.items.length} item{list.items.length !== 1 ? "s" : ""}
              </p>
              {totalMmk > 0 && (
                <p className="text-xs text-slate-500">Est. {formatMMK(totalMmk)}</p>
              )}
            </div>
            <a
              href={allMessengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex shrink-0 items-center gap-2 rounded-xl bg-[#0084FF] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-[#0084FF]/25 transition hover:bg-[#0078eb]"
            >
              <MessageCircle className="h-5 w-5" />
              {list.items.length === 1 ? "Buy Now" : "Buy All"}
            </a>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200/60 bg-white py-5 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 transition hover:text-indigo-600"
        >
          <ShoppingBag className="h-3.5 w-3.5" />
          Create your own wishlist at Buy For Me
        </Link>
      </footer>
    </PageShell>
  );
}
