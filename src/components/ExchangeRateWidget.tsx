// src/components/ExchangeRateWidget.tsx

import { useExchangeRate } from "../hooks/useExchangeRate";

export function ExchangeRateWidget() {
  const { rate, loading } = useExchangeRate();

  return (
    <div className="hidden items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 sm:flex">
      <span className="text-[10px] font-medium text-slate-400">THB/MMK</span>
      {loading ? (
        <span className="h-3 w-12 animate-pulse rounded-full bg-slate-200" />
      ) : (
        <span className="text-xs font-semibold text-slate-700">{rate.toLocaleString()}</span>
      )}
    </div>
  );
}
