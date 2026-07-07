// src/components/ProductNotesModal.tsx

import { useEffect, useState } from "react";
import { Loader2, StickyNote, X } from "lucide-react";
import type { SavedLink } from "../types";

interface ProductNotesModalProps {
  item: SavedLink | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, notes: string) => Promise<boolean>;
}

export function ProductNotesModal({
  item,
  open,
  onClose,
  onSave,
}: ProductNotesModalProps) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open && item) {
      setNotes(item.notes ?? "");
      setError("");
    }
  }, [open, item]);

  if (!open || !item) return null;

  async function handleSubmit() {
    setSaving(true);
    setError("");
    const ok = await onSave(item!.id, notes);
    setSaving(false);
    if (ok) onClose();
    else setError("Could not save notes. Try again.");
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <StickyNote className="h-5 w-5 text-amber-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Product notes</h2>
              <p className="line-clamp-1 text-xs text-slate-500">
                {item.title ?? item.url}
              </p>
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

        <div className="p-5">
          <label className="mb-1.5 block text-xs font-medium text-slate-600">
            Your notes (size, color, quantity, etc.)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="e.g. Size M, black color, need 2 pieces…"
            className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save notes"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
