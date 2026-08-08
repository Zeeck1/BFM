import { forwardRef, useEffect, useRef, useState } from "react";
import { BrandLogo } from "./BrandLogo";
import { formatMMK, formatTHB } from "../lib/utils";
import type { SavedLink } from "../types";

function waitForImages(root: HTMLElement): Promise<void> {
  const images = Array.from(root.querySelectorAll("img"));
  if (images.length === 0) return Promise.resolve();
  return Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          const done = () => resolve();
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
        }),
    ),
  ).then(() => undefined);
}

/** Off-screen host used to capture a Link Slip PNG. */
export function LinkSlipCaptureHost({
  items,
  onReady,
}: {
  items: SavedLink[];
  onReady: (element: HTMLElement) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let cancelled = false;
    void waitForImages(el).then(() => {
      if (cancelled) return;
      requestAnimationFrame(() => {
        if (!cancelled && ref.current) onReady(ref.current);
      });
    });
    return () => {
      cancelled = true;
    };
  }, [items, onReady]);

  return <LinkSlipCard ref={ref} items={items} />;
}

function SlipThumbnail({ item }: { item: SavedLink }) {
  const [imgError, setImgError] = useState(false);
  const letter = (item.site_name ?? item.title ?? "?").charAt(0).toUpperCase();

  if (item.image_url && !imgError) {
    return (
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 ring-1 ring-slate-100">
        <img
          src={item.image_url}
          alt=""
          crossOrigin="anonymous"
          onError={() => setImgError(true)}
          className="h-full w-full object-contain object-center"
        />
      </div>
    );
  }

  return (
    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-lg font-bold text-indigo-700 ring-1 ring-indigo-100">
      {letter}
    </div>
  );
}

export const LinkSlipCard = forwardRef<HTMLDivElement, { items: SavedLink[]; generatedAt?: string }>(
  function LinkSlipCard({ items, generatedAt }, ref) {
    const stamp =
      generatedAt ??
      new Date().toLocaleString("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    const pricedItems = items.filter((item) => item.price_mmk != null);
    const totalMmk = pricedItems.reduce((sum, item) => sum + (item.price_mmk ?? 0), 0);

    return (
      <div
        ref={ref}
        className="mx-auto w-full max-w-[400px] overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-300/40"
      >
        <div className="bg-gradient-to-r from-[#7c5cfc] via-[#6d5efc] to-[#5b4cdb] px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <BrandLogo className="h-9 w-9 rounded-lg bg-white p-0.5 shadow-sm" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/80">
                Buy For Me
              </p>
              <h3 className="text-lg font-extrabold leading-tight tracking-tight">
                Product Link Slip
              </h3>
            </div>
          </div>
          <p className="mt-2.5 text-xs text-white/75">{stamp}</p>
        </div>

        <div className="px-4 py-1">
          {items.map((item, index) => (
            <div
              key={item.id}
              className={`flex gap-3 py-3.5 ${
                index < items.length - 1 ? "border-b border-slate-100" : ""
              }`}
            >
              <div className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500">
                {index + 1}
              </div>
              <SlipThumbnail item={item} />
              <div className="min-w-0 flex-1">
                {item.site_name && (
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#4f46e5]">
                    {item.site_name}
                  </p>
                )}
                <p className="mt-0.5 text-sm font-bold leading-snug text-slate-900">
                  {item.title ?? "Product link"}
                </p>
                {item.price_mmk != null ? (
                  <p className="mt-1 text-sm font-bold text-[#4f46e5]">
                    {formatMMK(item.price_mmk)}
                    {item.price_thb != null && (
                      <span className="ml-1.5 text-xs font-normal text-slate-400">
                        ({formatTHB(item.price_thb)})
                      </span>
                    )}
                  </p>
                ) : item.price_thb != null ? (
                  <p className="mt-1 text-sm font-bold text-[#4f46e5]">
                    {formatTHB(item.price_thb)}
                  </p>
                ) : null}
                <p className="mt-1.5 break-all text-[11px] leading-relaxed text-slate-400">
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

        <div className="border-t border-dashed border-slate-200 px-5 py-4">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-slate-500">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
            {pricedItems.length > 0 && (
              <span className="font-extrabold text-[#4f46e5]">Total {formatMMK(totalMmk)}</span>
            )}
          </div>
          <p className="mt-2.5 text-center text-[10px] text-slate-400">
            BFM · Thailand → Myanmar shopping service
          </p>
        </div>
      </div>
    );
  },
);
