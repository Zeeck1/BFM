// src/components/LinkSlipModal.tsx

import { useRef, useState } from "react";
import { Download, Loader2, ShoppingBag, X } from "lucide-react";
import { downloadElementAsPng, linkSlipFilename } from "../lib/linkSlip";
import { formatMMK, formatTHB } from "../lib/utils";
import type { SavedLink } from "../types";

interface LinkSlipModalProps {
  items: SavedLink[];
  open: boolean;
  onClose: () => void;
}

function SlipThumbnail({ item }: { item: SavedLink }) {
  const [imgError, setImgError] = useState(false);
  const letter = (item.site_name ?? item.title ?? "?").charAt(0).toUpperCase();

  if (item.image_url && !imgError) {
    return (
      <img
        src={item.image_url}
        alt=""
        crossOrigin="anonymous"
        onError={() => setImgError(true)}
        className="h-14 w-14 flex-shrink-0 rounded-lg bg-slate-100 object-cover"
      />
    );
  }

  return (
    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-lg font-bold text-indigo-700">
      {letter}
    </div>
  );
}

export function LinkSlipModal({ items, open, onClose }: LinkSlipModalProps) {
  const slipRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  if (!open || items.length === 0) return null;

  const generatedAt = new Date().toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const pricedItems = items.filter((item) => item.price_mmk != null);
  const totalMmk = pricedItems.reduce((sum, item) => sum + (item.price_mmk ?? 0), 0);

  async function handleDownload() {
    if (!slipRef.current) return;
    setDownloading(true);
    setError("");
    try {
      await downloadElementAsPng(slipRef.current, linkSlipFilename());
    } catch {
      setError("Could not generate image. Try again.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && !downloading && onClose()}
    >
      <div className="flex max-h-[95dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Link Slip</h2>
            <p className="text-xs text-slate-500">
              {items.length} product link{items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={downloading}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6">
          <div
            ref={slipRef}
            className="mx-auto w-full max-w-[400px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-md"
          >
            {/* Slip header */}
            <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <ShoppingBag className="h-5 w-5" strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">
                    Buy For Me
                  </p>
                  <h3 className="text-lg font-extrabold tracking-tight">Product Link Slip</h3>
                </div>
              </div>
              <p className="mt-3 text-xs text-indigo-100">{generatedAt}</p>
            </div>

            {/* Items */}
            <div className="divide-y divide-slate-100 px-4 py-2">
              {items.map((item, index) => (
                <div key={item.id} className="flex gap-3 py-3">
                  <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-500">
                    {index + 1}
                  </div>
                  <SlipThumbnail item={item} />
                  <div className="min-w-0 flex-1">
                    {item.site_name && (
                      <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                        {item.site_name}
                      </p>
                    )}
                    <p className="text-sm font-semibold leading-snug text-slate-900">
                      {item.title ?? "Product link"}
                    </p>
                    {item.price_mmk != null && (
                      <p className="mt-1 text-sm font-bold text-indigo-700">
                        {formatMMK(item.price_mmk)}
                        {item.price_thb != null && (
                          <span className="ml-1 text-xs font-normal text-slate-400">
                            ({formatTHB(item.price_thb)})
                          </span>
                        )}
                      </p>
                    )}
                    <p className="mt-1.5 break-all text-[11px] leading-relaxed text-slate-500">
                      {item.url}
                    </p>
                    {item.notes?.trim() && (
                      <p className="mt-1.5 rounded-md bg-amber-50 px-2 py-1 text-[11px] text-amber-900">
                        <span className="font-semibold">Note:</span> {item.notes.trim()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-dashed border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">
                  {items.length} item{items.length !== 1 ? "s" : ""}
                </span>
                {pricedItems.length > 0 && (
                  <span className="font-extrabold text-indigo-700">
                    Total {formatMMK(totalMmk)}
                  </span>
                )}
              </div>
              <p className="mt-2 text-center text-[10px] text-slate-400">
                BFM · Thailand → Myanmar shopping service
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="border-t border-slate-100 px-5 py-4">
          {error && (
            <p className="mb-3 text-center text-sm text-red-600">{error}</p>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={downloading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {downloading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating image…
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                Download as Image
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
