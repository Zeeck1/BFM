import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  BookmarkPlus,
  Heart,
  Loader2,
  LogIn,
  MessageCircle,
  QrCode,
  Receipt,
  Search,
  StickyNote,
  Trash2,
  X,
} from "lucide-react";
import type { AppOutletContext } from "../components/AppLayout";
import { LinkSlipModal } from "../components/LinkSlipModal";
import { ProductNotesModal } from "../components/ProductNotesModal";
import { ProductPriceModal } from "../components/ProductPriceModal";
import { QRCodeModal } from "../components/QRCodeModal";
import { SavedItemCard } from "../components/SavedItemCard";
import { useSavedItems } from "../contexts/SavedItemsProvider";
import { useExchangeRate } from "../hooks/useExchangeRate";
import { userAvatarUrl, userDisplayName } from "../lib/auth";
import { openBuyForMeOnMessenger } from "../lib/messenger";
import { matchesSavedLinkSearch } from "../lib/savedLinkSearch";
import { getOrCreateSharedList, shareUrl as buildShareUrl, timeRemaining } from "../lib/shareList";
import { formatMMK, formatTHB } from "../lib/utils";
import type { SavedLink } from "../types";

function EmptyWishlist({ loggedIn, onSignIn }: { loggedIn: boolean; onSignIn: () => void }) {
  if (!loggedIn) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
          <Heart className="h-7 w-7 text-indigo-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-800">Sign in to view your wishlist</p>
          <p className="mt-1 text-sm text-slate-500">Save product links and manage them in one place.</p>
        </div>
        <button
          onClick={onSignIn}
          className="flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
        >
          <LogIn className="h-4 w-4" />
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <StickyNote className="h-7 w-7 text-slate-400" />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-800">Your wishlist is empty</p>
        <p className="mt-1 text-sm text-slate-500">Paste a product link on the Add Link tab to get started.</p>
      </div>
      <Link
        to="/"
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        <BookmarkPlus className="h-4 w-4" />
        Add a link
      </Link>
    </div>
  );
}

function NoSearchResults({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
        <Search className="h-7 w-7 text-slate-400" />
      </div>
      <p className="text-base font-semibold text-slate-800">No results for &ldquo;{query}&rdquo;</p>
      <p className="text-sm text-slate-500">Try a different title, site, or URL.</p>
      <button
        type="button"
        onClick={onClear}
        className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Clear search
      </button>
    </div>
  );
}

export function WishlistPage() {
  const { user, onSignIn } = useOutletContext<AppOutletContext>();
  const { rate } = useExchangeRate();
  const [wishlistSearch, setWishlistSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [slipOpen, setSlipOpen] = useState(false);
  const [notesItem, setNotesItem] = useState<SavedLink | null>(null);
  const [priceItem, setPriceItem] = useState<SavedLink | null>(null);
  const [qrOpen, setQrOpen] = useState(false);
  const [qrShareUrl, setQrShareUrl] = useState("");
  const [qrExpiresIn, setQrExpiresIn] = useState("");
  const [qrLoading, setQrLoading] = useState(false);
  const [removeConfirm, setRemoveConfirm] = useState(false);
  const [removing, setRemoving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  const { items, loading, updateNotes, updatePrice, remove, removeMany } = useSavedItems();

  const filteredItems = useMemo(
    () => items.filter((item) => matchesSavedLinkSearch(item, wishlistSearch)),
    [items, wishlistSearch],
  );

  const selectedItems = useMemo(
    () => filteredItems.filter((item) => selectedIds.has(item.id)),
    [filteredItems, selectedIds],
  );

  const totalSummary = useMemo(() => {
    const pricedItems = filteredItems.filter((item) => item.price_mmk != null || item.price_thb != null);
    const totalMmk = pricedItems.reduce((sum, item) => {
      if (item.price_mmk != null) return sum + item.price_mmk;
      return sum + (item.price_thb ?? 0) * rate;
    }, 0);
    const totalThb = pricedItems.reduce((sum, item) => {
      if (item.price_thb != null) return sum + item.price_thb;
      return sum + (item.price_mmk ?? 0) / rate;
    }, 0);

    return { pricedCount: pricedItems.length, totalMmk, totalThb };
  }, [filteredItems, rate]);

  const allFilteredSelected =
    filteredItems.length > 0 && filteredItems.every((item) => selectedIds.has(item.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (allFilteredSelected) setSelectedIds(new Set());
    else setSelectedIds(new Set(filteredItems.map((item) => item.id)));
  }

  async function handleGenerateQR() {
    if (!user || selectedItems.length === 0) return;
    setQrLoading(true);
    const name = userDisplayName(user);
    const avatar = userAvatarUrl(user);
    const shared = await getOrCreateSharedList(user.id, name, selectedItems, avatar);
    setQrLoading(false);
    if (shared) {
      setQrShareUrl(buildShareUrl(shared.id));
      setQrExpiresIn(timeRemaining(shared));
      setQrOpen(true);
    }
  }

  async function handleRemoveSelected() {
    if (!removeConfirm) {
      setRemoveConfirm(true);
      return;
    }

    setRemoving(true);
    const ids = [...selectedIds];
    const ok = await removeMany(ids);
    setRemoving(false);
    setRemoveConfirm(false);
    if (ok) setSelectedIds(new Set());
  }

  useEffect(() => {
    const visible = new Set(items.map((i) => i.id));
    setSelectedIds((prev) => {
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [items]);

  useEffect(() => {
    setRemoveConfirm(false);
  }, [selectedIds]);

  const hasItems = user && items.length > 0;
  const showSelectionBar = selectedIds.size > 0;

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Page header */}
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
                  <Heart className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">My Wishlist</h1>
                  {user && (
                    <p className="text-sm text-slate-500">
                      {loading
                        ? "Loading…"
                        : wishlistSearch.trim()
                          ? `${filteredItems.length} of ${items.length} item${items.length !== 1 ? "s" : ""}`
                          : `${items.length} saved item${items.length !== 1 ? "s" : ""}`}
                      {selectedIds.size > 0 && (
                        <span className="ml-1.5 rounded-md bg-indigo-50 px-1.5 py-0.5 text-xs font-semibold text-indigo-600">
                          {selectedIds.size} selected
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {hasItems && (
              <div className="hidden flex-col gap-2 sm:flex sm:flex-row sm:items-center">
                {filteredItems.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
                  >
                    {allFilteredSelected ? "Deselect all" : "Select all"}
                  </button>
                )}
                <div className="relative w-full sm:w-64">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    ref={searchRef}
                    type="search"
                    value={wishlistSearch}
                    onChange={(e) => setWishlistSearch(e.target.value)}
                    placeholder="Search saved links…"
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                  />
                  {wishlistSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setWishlistSearch("");
                        searchRef.current?.focus();
                      }}
                      className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {hasItems && !loading && (
        <section className="border-b border-slate-200/80 bg-white/70">
          <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/70 px-4 py-3 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                    Wishlist total
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {totalSummary.pricedCount > 0
                      ? `${totalSummary.pricedCount} priced item${totalSummary.pricedCount !== 1 ? "s" : ""}`
                      : "Add prices to calculate your total"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 sm:min-w-80">
                  <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-indigo-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Est. MMK total
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {formatMMK(totalSummary.totalMmk)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-white px-3 py-2 ring-1 ring-indigo-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                      Est. THB total
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-slate-900">
                      {formatTHB(totalSummary.totalThb)}
                    </p>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-[11px] text-slate-400">
                Est. rate used: 1 THB = {rate.toLocaleString()} MMK
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Prices may change depending on shipping costs and other updates.
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Mobile: select all + search below wishlist total */}
      {hasItems && (
        <section className="border-b border-slate-200/80 bg-white px-4 py-3 sm:hidden">
          <div className="mx-auto flex max-w-7xl flex-col gap-2">
            {filteredItems.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectAll}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-xs font-semibold text-slate-600 shadow-sm hover:bg-slate-50"
              >
                {allFilteredSelected ? "Deselect all" : "Select all"}
              </button>
            )}
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="search"
                value={wishlistSearch}
                onChange={(e) => setWishlistSearch(e.target.value)}
                placeholder="Search saved links…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-9 text-sm text-slate-800 placeholder-slate-400 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
              />
              {wishlistSearch && (
                <button
                  type="button"
                  onClick={() => setWishlistSearch("")}
                  className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200/60 hover:text-slate-600"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Grid */}
      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] shimmer rounded-2xl" />
            ))}
          </div>
        ) : !user || items.length === 0 ? (
          <EmptyWishlist loggedIn={!!user} onSignIn={onSignIn} />
        ) : filteredItems.length === 0 ? (
          <NoSearchResults query={wishlistSearch.trim()} onClear={() => setWishlistSearch("")} />
        ) : (
          <div className="grid grid-cols-2 items-stretch gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4">
            {filteredItems.map((item) => (
              <SavedItemCard
                key={item.id}
                item={item}
                selected={selectedIds.has(item.id)}
                onToggleSelect={() => toggleSelect(item.id)}
                onEditNotes={() => setNotesItem(item)}
                onEditPrice={() => setPriceItem(item)}
                onDelete={() => {
                  remove(item.id);
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    next.delete(item.id);
                    return next;
                  });
                }}
              />
            ))}
          </div>
        )}
      </section>

      {/* Selection bar — above mobile bottom nav */}
      {showSelectionBar && (
        <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] left-1/2 z-30 w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 lg:bottom-6 lg:max-w-2xl">
          <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 shadow-2xl shadow-black/30">
            <span className="mr-1 text-sm font-semibold text-white">
              {selectedIds.size} selected
            </span>
            <div className="mx-1 hidden h-4 w-px bg-white/20 sm:block" />
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
            >
              Clear
            </button>
            {removeConfirm ? (
              <>
                <button
                  type="button"
                  onClick={() => setRemoveConfirm(false)}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRemoveSelected}
                  disabled={removing}
                  className="flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-50"
                >
                  {removing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                  Confirm Remove
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleRemoveSelected}
                className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Remove</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSlipOpen(true)}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20"
            >
              <Receipt className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Link Slip</span>
            </button>
            <button
              type="button"
              onClick={handleGenerateQR}
              disabled={qrLoading}
              className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-white/20 disabled:opacity-50"
            >
              {qrLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <QrCode className="h-3.5 w-3.5" />}
              <span className="hidden sm:inline">QR Code</span>
            </button>
            <button
              type="button"
              onClick={() => openBuyForMeOnMessenger(selectedItems)}
              className="flex items-center gap-1.5 rounded-lg bg-[#0084FF] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#0078eb]"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Messenger</span>
            </button>
          </div>
        </div>
      )}

      <LinkSlipModal items={selectedItems} open={slipOpen} onClose={() => setSlipOpen(false)} />
      <ProductPriceModal
        item={priceItem}
        open={priceItem != null}
        onClose={() => setPriceItem(null)}
        onSave={(id, price_mmk, price_thb) => updatePrice(id, price_mmk, price_thb)}
      />
      <ProductNotesModal
        item={notesItem}
        open={notesItem != null}
        onClose={() => setNotesItem(null)}
        onSave={(id, notes) => updateNotes(id, notes)}
      />
      <QRCodeModal
        open={qrOpen}
        onClose={() => setQrOpen(false)}
        shareUrl={qrShareUrl}
        ownerName={user ? userDisplayName(user) : ""}
        avatarUrl={user ? userAvatarUrl(user) : null}
        itemCount={selectedItems.length}
        expiresIn={qrExpiresIn}
      />
    </div>
  );
}
