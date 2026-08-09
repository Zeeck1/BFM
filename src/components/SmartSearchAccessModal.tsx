import { MessageCircle, Sparkles, X } from "lucide-react";
import { buyNowMessengerUrl } from "../lib/messenger";

interface SmartSearchAccessModalProps {
  open: boolean;
  onClose: () => void;
}

export function SmartSearchAccessModal({ open, onClose }: SmartSearchAccessModalProps) {
  if (!open) return null;

  const messengerUrl = buyNowMessengerUrl();

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="smart-search-access-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
        <div className="relative overflow-hidden bg-slate-950 px-6 pb-6 pt-6 text-white">
          <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
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
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              Smart Search
            </div>
            <h2
              id="smart-search-access-title"
              className="mt-3 text-2xl font-bold tracking-tight"
            >
              Access required
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">
              If you want to access our Smart Search, contact us on Messenger.
            </p>
          </div>
        </div>

        <div className="space-y-3 px-6 py-5">
          <a
            href={messengerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0084FF] py-3 text-sm font-bold text-white transition hover:bg-[#0078eb]"
          >
            <MessageCircle className="h-4 w-4" />
            Contact on Messenger
          </a>
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl py-2.5 text-sm font-semibold text-slate-500 transition hover:text-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
