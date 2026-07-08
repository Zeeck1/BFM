// src/components/SavedItemCard.tsx

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ExternalLink,
  MessageCircle,
  MoreHorizontal,
  StickyNote,
  Tag,
  Trash2,
} from "lucide-react";
import { openBuyForMeOnMessenger } from "../lib/messenger";
import { formatMMK, formatTHB } from "../lib/utils";
import type { SavedLink } from "../types";
import { ImageLightbox } from "./ImageLightbox";
import { SiteAvatar } from "./SiteAvatar";

interface SavedItemCardProps {
  item: SavedLink;
  selected: boolean;
  onToggleSelect: () => void;
  onEditNotes: () => void;
  onEditPrice: () => void;
  onDelete: () => void;
}

export function SavedItemCard({
  item,
  selected,
  onToggleSelect,
  onEditNotes,
  onEditPrice,
  onDelete,
}: SavedItemCardProps) {
  const [imgError, setImgError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setConfirmDelete(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [menuOpen]);

  return (
    <div
      className={`group relative flex flex-col overflow-hidden rounded-xl bg-white transition-all duration-200 ${
        selected
          ? "ring-2 ring-indigo-500 shadow-md shadow-indigo-100"
          : "shadow-sm hover:shadow-md border border-slate-200/80"
      }`}
    >
      {/* ── Image ── */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-50">

        {/* Checkbox */}
        <button
          type="button"
          onClick={onToggleSelect}
          aria-pressed={selected}
          className={`absolute left-2 top-2 z-10 flex h-5 w-5 items-center justify-center rounded-md transition-all duration-150 ${
            selected
              ? "bg-indigo-600 text-white shadow-sm"
              : "bg-white/80 text-transparent shadow-sm backdrop-blur-sm hover:bg-white group-hover:text-slate-300"
          }`}
        >
          <Check className="h-3 w-3" strokeWidth={3} />
        </button>

        {/* Options */}
        <div ref={menuRef} className="absolute right-2 top-2 z-10">
          <button
            type="button"
            onClick={() => { setMenuOpen(o => !o); setConfirmDelete(false); }}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-slate-500 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-slate-800 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full z-20 mt-1 w-52 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60">
              <button
                type="button"
                onClick={() => { setMenuOpen(false); openBuyForMeOnMessenger([item]); }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm font-semibold text-[#0084FF] hover:bg-sky-50"
              >
                <MessageCircle className="h-4 w-4 shrink-0" />
                Buy for me on Messenger
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onEditNotes(); }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <StickyNote className="h-4 w-4 shrink-0 text-amber-400" />
                {item.notes?.trim() ? "Edit notes" : "Add notes"}
              </button>
              <button
                type="button"
                onClick={() => { setMenuOpen(false); onEditPrice(); }}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <Tag className="h-4 w-4 shrink-0 text-indigo-400" />
                {item.price_mmk != null || item.price_thb != null ? "Edit price" : "Set price"}
              </button>
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                Open link
              </a>
              <div className="mx-3 my-1 h-px bg-slate-100" />
              {confirmDelete ? (
                <div className="flex items-center gap-1.5 p-2">
                  <button
                    type="button"
                    onClick={() => { onDelete(); setConfirmDelete(false); setMenuOpen(false); }}
                    className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    Remove
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="flex flex-1 items-center justify-center rounded-lg border border-slate-200 py-2 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-sm text-red-500 hover:bg-red-50"
                >
                  <Trash2 className="h-4 w-4 shrink-0" />
                  Remove
                </button>
              )}
            </div>
          )}
        </div>

        {item.image_url && !imgError ? (
          <img
            src={item.image_url}
            alt={item.title ?? "Product"}
            className="block h-full w-full cursor-zoom-in object-cover object-center"
            onError={() => setImgError(true)}
            onClick={() => setLightboxOpen(true)}
          />
        ) : (
          <SiteAvatar name={item.site_name} />
        )}
      </div>

      {/* ── Body ── */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        {item.site_name && (
          <span className="w-fit rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {item.site_name}
          </span>
        )}

        <p className="line-clamp-2 flex-1 text-sm font-medium leading-snug text-slate-800">
          {item.title ?? item.url}
        </p>

        {item.notes?.trim() && (
          <button
            type="button"
            onClick={onEditNotes}
            className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-left text-[11px] text-amber-800 hover:bg-amber-100 transition-colors"
          >
            <StickyNote className="mt-px h-3 w-3 shrink-0 text-amber-500" />
            <span className="line-clamp-2 leading-relaxed">{item.notes}</span>
          </button>
        )}

        <div className="mt-auto pt-1">
          {item.price_mmk != null ? (
            <button
              type="button"
              onClick={onEditPrice}
              className="text-left transition hover:opacity-70"
              title="Edit price"
            >
              <p className="text-sm font-bold text-slate-900">
                {formatMMK(item.price_mmk)}
              </p>
              {item.price_thb != null && (
                <p className="text-[11px] text-slate-400">{formatTHB(item.price_thb)}</p>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={onEditPrice}
              className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] italic text-slate-400 transition hover:bg-indigo-50 hover:text-indigo-500 hover:not-italic"
              title="Set price"
            >
              <Tag className="h-3 w-3 shrink-0" />
              Set price
            </button>
          )}
        </div>
      </div>

      {lightboxOpen && item.image_url && (
        <ImageLightbox
          src={item.image_url}
          alt={item.title ?? "Product"}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </div>
  );
}
