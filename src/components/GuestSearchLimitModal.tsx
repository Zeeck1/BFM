import { Heart, Search, X } from "lucide-react";

interface GuestSearchLimitModalProps {
  open: boolean;
  onClose: () => void;
  onSignIn: () => void;
}

export function GuestSearchLimitModal({
  open,
  onClose,
  onSignIn,
}: GuestSearchLimitModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="guest-search-limit-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="relative overflow-hidden bg-slate-950 px-6 pb-6 pt-6 text-white">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-36 w-36 rounded-full bg-rose-500/10 blur-3xl" />

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="relative">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-slate-300">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              Guest limit reached
            </div>
            <h2
              id="guest-search-limit-title"
              className="mt-3 text-2xl font-bold tracking-tight"
            >
              Free guest search used
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              Sign in to search again, open more pages, and save products to your wishlist.
            </p>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Search className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Unlimited searches</p>
                <p className="text-xs text-slate-500">Keep exploring Lazada and SHEIN products</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Heart className="h-4 w-4" />
              </span>
              <div>
                <p className="text-sm font-semibold text-slate-900">Save to wishlist</p>
                <p className="text-xs text-slate-500">Build your list and order through Messenger</p>
              </div>
            </li>
          </ul>

          <button
            type="button"
            onClick={() => {
              onClose();
              onSignIn();
            }}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
          >
            Sign in to continue
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
          >
            Keep browsing results
          </button>
        </div>
      </div>
    </div>
  );
}
