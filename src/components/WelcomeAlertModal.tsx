import { ShoppingBag, X } from "lucide-react";

interface WelcomeAlertModalProps {
  open: boolean;
  onClose: () => void;
}

export function WelcomeAlertModal({ open, onClose }: WelcomeAlertModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-alert-title"
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="relative bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-6 pb-5 pt-6 text-white">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500">
            <ShoppingBag className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-indigo-200">
            
            Welcome to Buy For Me
          </div>
          <h2 id="welcome-alert-title" className="mt-3 text-xl font-bold tracking-tight">
            Shop from Thailand, delivered to Myanmar
          </h2>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-slate-600">
          ထိုင်း Website များမှ ပစ္စည်းများ ရှာမည်ဆိုပါက လူကြီးမင်းအနေနဲ့ ထိုင်း VPN ဖွင့်ပေးရန်လိုအပ်ပါသည်။ 
          </p>

          <ul className="space-y-2 text-sm text-slate-600">
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              Paste a link to preview product details and prices
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              Save favourites and order via Messenger in one tap
            </li>
            <li className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              THB prices with estimated MMK exchange rate
            </li>
          </ul>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-xl bg-slate-900 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}
