import type { ReactNode } from "react";
import { MessageCircle } from "lucide-react";
import { buyNowMessengerUrl } from "../lib/messenger";

interface SearchNotFoundCardProps {
  children?: ReactNode;
}

export function SearchNotFoundCard({ children }: SearchNotFoundCardProps) {
  const messengerUrl = buyNowMessengerUrl();

  return (
    <div className="relative overflow-hidden rounded-[1.75rem] border border-[#0084FF]/15 bg-gradient-to-br from-[#E8F3FF] via-white to-indigo-50 p-6 shadow-sm sm:p-8">
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-[#0084FF]/10 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-20 -left-10 h-40 w-40 rounded-full bg-indigo-200/30 blur-2xl" />

      <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0084FF] text-white shadow-lg shadow-[#0084FF]/30">
          <MessageCircle className="h-7 w-7" strokeWidth={2.2} />
        </div>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#0084FF]">
          BFM Messenger
        </p>
        <p className="mt-3 text-base font-semibold leading-8 text-slate-800 sm:text-lg">
          လူကြီးမင်းရှာနေတဲ့ ပစ္စည်းရှာမတွေ့ပါ။ BFM ရဲ့ Messenger မှာတိုက်ရိုက်မေးမြန်းနိုင်ပါတယ်။
        </p>
        <a
          href={messengerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#0084FF] px-6 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#0084FF]/25 transition hover:-translate-y-0.5 hover:bg-[#0078eb] sm:w-auto sm:min-w-[16rem]"
        >
          <MessageCircle className="h-4 w-4" />
          Messenger မှာ မေးရန်
        </a>
        {children}
      </div>
    </div>
  );
}
