// src/components/ProductPriceModal.tsx

import { useEffect, useState } from "react";
import { AlertCircle, Loader2, Tag, X } from "lucide-react";
import { useExchangeRate } from "../hooks/useExchangeRate";
import { formatMMK, formatTHB } from "../lib/utils";
import type { SavedLink } from "../types";

interface ProductPriceModalProps {
  item: SavedLink | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, price_mmk: number | null, price_thb: number | null) => Promise<boolean>;
}

type Currency = "MMK" | "THB";

export function ProductPriceModal({ item, open, onClose, onSave }: ProductPriceModalProps) {
  const { rate } = useExchangeRate();
  const [currency, setCurrency] = useState<Currency>("THB");
  const [rawInput, setRawInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !item) return;
    setError("");
    // Pre-fill whichever currency is already set, preferring THB
    if (item.price_thb != null) {
      setCurrency("THB");
      setRawInput(String(item.price_thb));
    } else if (item.price_mmk != null) {
      setCurrency("MMK");
      setRawInput(String(item.price_mmk));
    } else {
      setCurrency("THB");
      setRawInput("");
    }
  }, [open, item]);

  if (!open || !item) return null;
  const currentItem = item;

  const numericValue = parseFloat(rawInput.replace(/,/g, ""));
  const isValid = !isNaN(numericValue) && numericValue > 0;

  // Derived values
  const computedMMK = isValid
    ? currency === "MMK"
      ? Math.round(numericValue)
      : Math.round(numericValue * rate)
    : null;

  const computedTHB = isValid
    ? currency === "THB"
      ? numericValue
      : numericValue / rate
    : null;

  async function handleSave() {
    if (!isValid) {
      setError("Please enter a valid price.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const ok = await onSave(currentItem.id, computedMMK, computedTHB ?? null);
      if (ok) onClose();
      else setError("Could not save price. Try again.");
    } catch {
      setError("Could not save price. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleClear() {
    setSaving(true);
    setError("");
    try {
      const ok = await onSave(currentItem.id, null, null);
      if (ok) onClose();
      else setError("Could not clear price. Try again.");
    } catch {
      setError("Could not clear price. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const hasExistingPrice = item.price_mmk != null || item.price_thb != null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5 text-indigo-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Set price</h2>
              <p className="line-clamp-1 text-xs text-slate-500">{item.title ?? item.url}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Currency toggle */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Enter price in
            </p>
            <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
              {(["THB", "MMK"] as Currency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => {
                    setCurrency(c);
                    setRawInput("");
                    setError("");
                  }}
                  className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-all ${
                    currency === c
                      ? "bg-white shadow-sm text-slate-900 ring-1 ring-slate-200"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {c === "THB" ? "฿ Thai Baht (THB)" : "K Myanmar Kyat (MMK)"}
                </button>
              ))}
            </div>
          </div>

          {/* Price input */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              {currency === "THB" ? "Price in THB (฿)" : "Price in MMK (K)"}
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-base font-bold text-slate-400">
                {currency === "THB" ? "฿" : "K"}
              </span>
              <input
                type="number"
                inputMode="decimal"
                min="0"
                step={currency === "THB" ? "0.01" : "1"}
                value={rawInput}
                onChange={(e) => {
                  setRawInput(e.target.value);
                  setError("");
                }}
                placeholder={currency === "THB" ? "e.g. 599.00" : "e.g. 22000"}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-8 pr-4 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                autoFocus
              />
            </div>
          </div>

          {/* Live conversion preview */}
          {isValid && (
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3">
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-indigo-400">
                Auto-calculated
              </p>
              {currency === "THB" ? (
                <div className="flex items-baseline justify-between">
                  <p className="text-base font-bold text-slate-900">
                    {formatMMK(computedMMK!)}
                  </p>
                  <p className="text-xs text-slate-500">
                    rate: 1 ฿ = {rate.toLocaleString()} MMK
                  </p>
                </div>
              ) : (
                <div className="flex items-baseline justify-between">
                  <p className="text-base font-bold text-slate-900">
                    {formatTHB(computedTHB!)}
                  </p>
                  <p className="text-xs text-slate-500">
                    rate: 1 ฿ = {rate.toLocaleString()} MMK
                  </p>
                </div>
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-3.5 py-3">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-col gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row">
          {hasExistingPrice && (
            <button
              type="button"
              onClick={handleClear}
              disabled={saving}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Clear price
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !isValid}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-slate-700 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {saving ? "Saving…" : "Save price"}
          </button>
        </div>
      </div>
    </div>
  );
}
