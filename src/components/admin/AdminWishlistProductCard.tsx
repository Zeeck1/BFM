import { type ReactNode, useState } from "react";
import { ExternalLink, ImageOff, StickyNote } from "lucide-react";
import type { SavedLink } from "../../types";
import { formatMMK, formatSoldCount, formatTHB } from "../../lib/utils";
import { dateLabel } from "./AdminUi";

export function AdminWishlistProductCard({
  item,
  owner,
  children,
}: {
  item: SavedLink;
  owner?: string;
  children?: ReactNode;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const hasRating = item.average_score != null || item.review_count != null;

  return (
    <article className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-sm">
      <div className="grid md:grid-cols-[220px_minmax(0,1fr)]">
        <div className="flex min-h-48 items-center justify-center bg-slate-50 md:min-h-full">
          {item.image_url && !imageFailed ? (
            <img
              src={item.image_url}
              alt={item.title || "Wishlist product"}
              className="h-full max-h-72 w-full object-contain p-3"
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 text-xs text-slate-400">
              <ImageOff className="h-7 w-7" />
              No product image
            </div>
          )}
        </div>

        <div className="min-w-0 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              {item.site_name && (
                <span className="inline-flex rounded-md bg-indigo-50 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-indigo-600">
                  {item.site_name}
                </span>
              )}
              <h2 className="mt-2 text-base font-bold leading-6 text-slate-900">
                {item.title || item.url}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {owner ? `Saved by ${owner} · ` : ""}
                {dateLabel(item.created_at)}
              </p>
            </div>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700"
            >
              Open product
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <Detail label="MMK price" value={item.price_mmk != null ? formatMMK(item.price_mmk) : "Not set"} />
            <Detail label="THB price" value={item.price_thb != null ? formatTHB(item.price_thb) : "Not set"} />
            <Detail label="Shop" value={item.shop_name || "Not available"} />
            <Detail
              label="Rating"
              value={
                hasRating
                  ? `${item.average_score?.toFixed(1) ?? "—"} · ${(item.review_count ?? 0).toLocaleString()} reviews`
                  : "Not available"
              }
            />
          </div>

          {item.sold_count != null && (
            <p className="mt-3 text-xs font-medium text-slate-600">
              {formatSoldCount(item.sold_count)} sold
            </p>
          )}

          {item.description?.trim() && (
            <p className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-600">{item.description}</p>
          )}

          {(item.product_colors?.length || item.product_sizes?.length) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {item.product_colors?.map((color) => (
                <span key={`color-${color}`} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                  Color: {color}
                </span>
              ))}
              {item.product_sizes?.map((size) => (
                <span key={`size-${size}`} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
                  Size: {size}
                </span>
              ))}
            </div>
          )}

          {item.notes?.trim() && (
            <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-800">
              <StickyNote className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
              {item.notes}
            </div>
          )}

          <div className="mt-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">Product URL</p>
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              title={item.url}
              className="mt-1 block break-all text-xs font-medium text-indigo-600 hover:underline"
            >
              {item.url}
            </a>
          </div>

          {children && <div className="mt-5 border-t border-slate-100 pt-4">{children}</div>}
        </div>
      </div>
    </article>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 break-words text-xs font-semibold text-slate-800">{value}</p>
    </div>
  );
}
