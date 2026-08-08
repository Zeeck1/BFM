// src/components/LinkSlipModal.tsx

import { useRef, useState } from "react";
import { Download, Loader2, X } from "lucide-react";
import { LinkSlipCard } from "./LinkSlipCard";
import { downloadElementAsPng, linkSlipFilename } from "../lib/linkSlip";
import type { SavedLink } from "../types";

interface LinkSlipModalProps {
  items: SavedLink[];
  open: boolean;
  onClose: () => void;
}

export function LinkSlipModal({ items, open, onClose }: LinkSlipModalProps) {
  const slipRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState("");

  if (!open || items.length === 0) return null;

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

        <div className="flex-1 overflow-y-auto bg-slate-100 p-4 sm:p-6">
          <LinkSlipCard ref={slipRef} items={items} />
        </div>

        <div className="border-t border-slate-100 px-5 py-4">
          {error && <p className="mb-3 text-center text-sm text-red-600">{error}</p>}
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
