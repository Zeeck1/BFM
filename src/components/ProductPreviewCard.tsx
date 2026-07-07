import { useState } from "react";
import { BookmarkCheck, BookmarkPlus, ExternalLink, Loader2 } from "lucide-react";
import { formatTHB } from "../lib/utils";
import type { ProductPreview } from "../types";
import { ImageLightbox } from "./ImageLightbox";
import { SiteAvatar } from "./SiteAvatar";

interface ProductPreviewCardProps {
  preview: ProductPreview;
  onSave: () => void;
  saving: boolean;
  saved: boolean;
  loggedIn: boolean;
  onSignIn: () => void;
}

export function ProductPreviewCard({
  preview,
  onSave,
  saving,
  saved,
  loggedIn,
  onSignIn,
}: ProductPreviewCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [imgError, setImgError] = useState(false);
  const hasImage = Boolean(preview.image_url && !imgError);

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-lg shadow-slate-200/50">
      {hasImage ? (
        <button
          type="button"
          onClick={() => setLightboxOpen(true)}
          className="flex w-full items-center justify-center bg-slate-50 p-4 sm:p-6"
        >
          <img
            src={preview.image_url}
            alt={preview.title ?? "Product"}
            className="block max-h-56 w-auto max-w-full object-contain sm:max-h-64 md:max-h-72"
            onError={() => setImgError(true)}
          />
        </button>
      ) : (
        <div className="flex h-44 w-full items-center justify-center bg-slate-50 sm:h-52">
          <SiteAvatar name={preview.site_name} />
        </div>
      )}

      <div className="border-t border-slate-100 p-5">
        <div className="space-y-1.5">
          {preview.site_name && (
            <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {preview.site_name}
            </span>
          )}
          <h3 className="line-clamp-3 text-base font-semibold leading-snug text-slate-900">
            {preview.title ?? preview.url}
          </h3>
          {preview.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-slate-500">
              {preview.description}
            </p>
          )}
          {preview.price_thb != null && (
            <p className="text-xl font-bold text-slate-900">{formatTHB(preview.price_thb)}</p>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {loggedIn ? (
            <button
              onClick={onSave}
              disabled={saving || saved}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
                saved
                  ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50"
              }`}
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : saved ? (
                <BookmarkCheck className="h-4 w-4" />
              ) : (
                <BookmarkPlus className="h-4 w-4" />
              )}
              {saved ? "Saved!" : "Save to Wishlist"}
            </button>
          ) : (
            <button
              onClick={onSignIn}
              className="flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
            >
              Sign in to save
            </button>
          )}
          <a
            href={preview.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" />
            Open link
          </a>
        </div>
      </div>

      {lightboxOpen && preview.image_url && (
        <ImageLightbox
          src={preview.image_url}
          alt={preview.title ?? "Product"}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
