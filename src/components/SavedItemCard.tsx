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
  X,
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

function ItemActionMenu({
  item,
  confirmDelete,
  onClose,
  onConfirmDelete,
  onRequestDelete,
  onCancelDelete,
  onEditNotes,
  onEditPrice,
  variant,
}: {
  item: SavedLink;
  confirmDelete: boolean;
  onClose: () => void;
  onConfirmDelete: () => void;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onEditNotes: () => void;
  onEditPrice: () => void;
  variant: "sheet" | "dropdown";
}) {
  const isSheet = variant === "sheet";

  return (
    <div className={isSheet ? "px-2 pb-2" : ""}>
      {isSheet && (
        <div className="mb-2 flex items-start justify-between gap-3 border-b border-slate-100 px-3 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-900">Item options</p>
            <p className="line-clamp-2 text-xs text-slate-500">{item.title ?? item.url}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          onClose();
          openBuyForMeOnMessenger([item]);
        }}
        className={`flex w-full items-center gap-2.5 text-left text-sm font-semibold text-[#0084FF] hover:bg-sky-50 ${
          isSheet ? "rounded-xl px-4 py-3.5" : "px-3.5 py-2.5"
        }`}
      >
        <MessageCircle className="h-4 w-4 shrink-0" />
        Buy for me on Messenger
      </button>
      <button
        type="button"
        onClick={() => {
          onClose();
          onEditNotes();
        }}
        className={`flex w-full items-center gap-2.5 text-sm text-slate-700 hover:bg-slate-50 ${
          isSheet ? "rounded-xl px-4 py-3.5" : "px-3.5 py-2.5"
        }`}
      >
        <StickyNote className="h-4 w-4 shrink-0 text-amber-400" />
        {item.notes?.trim() ? "Edit notes" : "Add notes"}
      </button>
      <button
        type="button"
        onClick={() => {
          onClose();
          onEditPrice();
        }}
        className={`flex w-full items-center gap-2.5 text-sm text-slate-700 hover:bg-slate-50 ${
          isSheet ? "rounded-xl px-4 py-3.5" : "px-3.5 py-2.5"
        }`}
      >
        <Tag className="h-4 w-4 shrink-0 text-indigo-400" />
        {item.price_mmk != null || item.price_thb != null ? "Edit price" : "Set price"}
      </button>
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClose}
        className={`flex w-full items-center gap-2.5 text-sm text-slate-700 hover:bg-slate-50 ${
          isSheet ? "rounded-xl px-4 py-3.5" : "px-3.5 py-2.5"
        }`}
      >
        <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
        Open link
      </a>

      <div className={`${isSheet ? "mx-4" : "mx-3"} my-1 h-px bg-slate-100`} />

      {confirmDelete ? (
        <div className={`flex items-center gap-1.5 ${isSheet ? "p-3" : "p-2"}`}>
          <button
            type="button"
            onClick={onConfirmDelete}
            className="flex flex-1 items-center justify-center gap-1 rounded-xl bg-red-600 py-3 text-xs font-semibold text-white hover:bg-red-700"
          >
            Remove
          </button>
          <button
            type="button"
            onClick={onCancelDelete}
            className="flex flex-1 items-center justify-center rounded-xl border border-slate-200 py-3 text-xs text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onRequestDelete}
          className={`flex w-full items-center gap-2.5 text-sm text-red-500 hover:bg-red-50 ${
            isSheet ? "rounded-xl px-4 py-3.5" : "px-3.5 py-2.5"
          }`}
        >
          <Trash2 className="h-4 w-4 shrink-0" />
          Remove
        </button>
      )}
    </div>
  );
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

  function closeMenu() {
    setMenuOpen(false);
    setConfirmDelete(false);
  }

  useEffect(() => {
    if (!menuOpen) return;

    const mq = window.matchMedia("(min-width: 640px)");
    const prevOverflow = document.body.style.overflow;

    if (!mq.matches) {
      document.body.style.overflow = "hidden";
    }

    function onClickOutside(e: MouseEvent) {
      if (!mq.matches) return;
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    }

    document.addEventListener("mousedown", onClickOutside);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("mousedown", onClickOutside);
    };
  }, [menuOpen]);

  const menuProps = {
    item,
    confirmDelete,
    onClose: closeMenu,
    onConfirmDelete: () => {
      onDelete();
      closeMenu();
    },
    onRequestDelete: () => setConfirmDelete(true),
    onCancelDelete: () => setConfirmDelete(false),
    onEditNotes,
    onEditPrice,
  };

  return (
    <>
      <div
        className={`group relative flex flex-col rounded-xl bg-white transition-all duration-200 ${
          selected
            ? "ring-2 ring-indigo-500 shadow-md shadow-indigo-100"
            : "shadow-sm hover:shadow-md border border-slate-200/80"
        } ${menuOpen ? "z-30" : ""}`}
      >
        {/* ── Image ── */}
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-xl bg-slate-50">
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
              onClick={() => {
                setMenuOpen((open) => !open);
                setConfirmDelete(false);
              }}
              aria-expanded={menuOpen}
              aria-haspopup="menu"
              className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/80 text-slate-500 shadow-sm backdrop-blur-sm transition hover:bg-white hover:text-slate-800 sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>

            {/* Desktop dropdown */}
            {menuOpen && (
              <div className="absolute right-0 top-full z-20 mt-1 hidden w-52 overflow-hidden rounded-xl border border-slate-100 bg-white shadow-xl shadow-slate-200/60 sm:block">
                <ItemActionMenu {...menuProps} variant="dropdown" />
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
        <div className="flex flex-1 flex-col gap-2 rounded-b-xl p-3">
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
              className="flex items-start gap-1.5 rounded-lg bg-amber-50 px-2 py-1.5 text-left text-[11px] text-amber-800 transition-colors hover:bg-amber-100"
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
                <p className="text-sm font-bold text-slate-900">{formatMMK(item.price_mmk)}</p>
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

      {/* Mobile bottom action sheet */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 sm:hidden">
          <button
            type="button"
            aria-label="Close menu"
            className="absolute inset-0 bg-black/45 backdrop-blur-[1px]"
            onClick={closeMenu}
          />
          <div
            role="menu"
            className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white pb-[calc(0.75rem+env(safe-area-inset-bottom))] shadow-2xl"
          >
            <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-200" />
            <ItemActionMenu {...menuProps} variant="sheet" />
          </div>
        </div>
      )}
    </>
  );
}
