import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import {
  Clock,
  Copy,
  Check,
  ExternalLink,
  Heart,
  ImageOff,
  Loader2,
  LogIn,
  QrCode,
  Trash2,
} from "lucide-react";
import QRCode from "qrcode";
import type { AppOutletContext } from "../components/AppLayout";
import { QRCodeModal } from "../components/QRCodeModal";
import { userAvatarUrl, userDisplayName } from "../lib/auth";
import {
  deleteSharedList,
  formatQrGeneratedAt,
  listUserValidSharedLists,
  shareUrl,
  timeRemaining,
  type SharedList,
} from "../lib/shareList";

function QrThumb({ url, size = 112 }: { url: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current || !url) return;
    let cancelled = false;
    void QRCode.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 1,
      errorCorrectionLevel: "M",
      color: { dark: "#1e293b", light: "#ffffff" },
    }).catch(() => {
      if (!cancelled) {
        /* keep blank canvas */
      }
    });
    return () => {
      cancelled = true;
    };
  }, [url, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="h-full w-full rounded-lg"
      aria-hidden
    />
  );
}

function EmptyQrCodes({ loggedIn, onSignIn }: { loggedIn: boolean; onSignIn: () => void }) {
  if (!loggedIn) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
          <QrCode className="h-7 w-7 text-indigo-400" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-800">Sign in to view your QR codes</p>
          <p className="mt-1 text-sm text-slate-500">
            Generate a QR from your wishlist, then reopen it here anytime while it is valid.
          </p>
        </div>
        <button
          type="button"
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
        <QrCode className="h-7 w-7 text-slate-400" />
      </div>
      <div>
        <p className="text-base font-semibold text-slate-800">No valid QR codes yet</p>
        <p className="mt-1 text-sm text-slate-500">
          Select items in your wishlist and tap QR Code. Links stay active for 2 days.
        </p>
      </div>
      <Link
        to="/wishlist"
        className="flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
      >
        <Heart className="h-4 w-4" />
        Go to Wishlist
      </Link>
    </div>
  );
}

function ItemThumbs({ list }: { list: SharedList }) {
  const thumbs = list.items.filter((item) => item.image_url).slice(0, 4);
  const extra = Math.max(0, list.items.length - thumbs.length);

  if (thumbs.length === 0) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100">
        <ImageOff className="h-5 w-5 text-slate-300" />
      </div>
    );
  }

  return (
    <div className="flex -space-x-2">
      {thumbs.map((item) => (
        <img
          key={item.id}
          src={item.image_url!}
          alt=""
          className="h-12 w-12 rounded-lg border-2 border-white object-cover shadow-sm"
          referrerPolicy="no-referrer"
        />
      ))}
      {extra > 0 && (
        <div className="flex h-12 w-12 items-center justify-center rounded-lg border-2 border-white bg-slate-100 text-xs font-bold text-slate-600 shadow-sm">
          +{extra}
        </div>
      )}
    </div>
  );
}

export function QrCodesPage() {
  const { user, onSignIn } = useOutletContext<AppOutletContext>();
  const [lists, setLists] = useState<SharedList[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<SharedList | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) {
      setLists([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const rows = await listUserValidSharedLists(user.id);
    setLists(rows);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleCopy(list: SharedList) {
    const url = shareUrl(list.id);
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(list.id);
      setTimeout(() => setCopiedId((id) => (id === list.id ? null : id)), 2000);
    } catch {
      /* ignore */
    }
  }

  async function handleDelete(list: SharedList) {
    if (!user) return;
    setDeletingId(list.id);
    const ok = await deleteSharedList(list.id, user.id);
    setDeletingId(null);
    setConfirmDeleteId(null);
    if (ok) {
      setLists((prev) => prev.filter((row) => row.id !== list.id));
      if (active?.id === list.id) setActive(null);
    }
  }

  const ownerName = user ? userDisplayName(user) : "";
  const avatarUrl = user ? userAvatarUrl(user) : null;

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      <header className="border-b border-slate-200/80 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50">
              <QrCode className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 sm:text-2xl">My QR Codes</h1>
              {user && (
                <p className="text-sm text-slate-500">
                  {loading
                    ? "Loading…"
                    : `${lists.length} valid QR code${lists.length !== 1 ? "s" : ""}`}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {loading && user ? (
          <div className="flex items-center justify-center gap-2 py-20 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading your QR codes…
          </div>
        ) : !user || lists.length === 0 ? (
          <EmptyQrCodes loggedIn={Boolean(user)} onSignIn={onSignIn} />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {lists.map((list) => {
              const url = shareUrl(list.id);
              const remaining = timeRemaining(list);
              const generated = formatQrGeneratedAt(list.created_at);
              const titles = list.items
                .map((item) => item.title || item.site_name || "Item")
                .slice(0, 2)
                .join(" · ");
              const more =
                list.items.length > 2 ? ` +${list.items.length - 2} more` : "";

              return (
                <li
                  key={list.id}
                  className="flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="flex gap-4 p-4">
                    <button
                      type="button"
                      onClick={() => setActive(list)}
                      className="h-28 w-28 shrink-0 rounded-xl border border-slate-200 bg-white p-1.5 shadow-sm transition hover:border-indigo-300 hover:ring-2 hover:ring-indigo-500/10"
                      aria-label="View QR code"
                    >
                      <QrThumb url={url} size={104} />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
                          <Clock className="h-3 w-3" />
                          {remaining}
                        </span>
                        <span className="text-[11px] font-medium text-slate-400">
                          {list.items.length} item{list.items.length !== 1 ? "s" : ""}
                        </span>
                      </div>
                      {generated && (
                        <p className="mt-1.5 text-[11px] font-medium text-slate-500">
                          Generated {generated}
                        </p>
                      )}
                      <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">
                        {titles}
                        {more}
                      </p>
                      <div className="mt-3">
                        <ItemThumbs list={list} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto flex flex-wrap gap-2 border-t border-slate-100 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => setActive(list)}
                      className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700"
                    >
                      <QrCode className="h-3.5 w-3.5" />
                      View QR
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleCopy(list)}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      {copiedId === list.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                      {copiedId === list.id ? "Copied" : "Copy"}
                    </button>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Open
                    </a>
                    {confirmDeleteId === list.id ? (
                      <button
                        type="button"
                        disabled={deletingId === list.id}
                        onClick={() => void handleDelete(list)}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-60"
                      >
                        {deletingId === list.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                        Confirm delete
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(list.id)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {active && (
        <QRCodeModal
          open
          onClose={() => setActive(null)}
          shareUrl={shareUrl(active.id)}
          ownerName={active.owner_name || ownerName}
          avatarUrl={active.owner_avatar ?? avatarUrl}
          itemCount={active.items.length}
          expiresIn={timeRemaining(active)}
          generatedAt={formatQrGeneratedAt(active.created_at)}
        />
      )}
    </div>
  );
}
