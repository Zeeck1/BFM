import { useState } from "react";
import { useAdminData } from "../../contexts/AdminDataProvider";
import {
  AdminEmptyState,
  AdminErrorNotice,
  AdminPageHeader,
  AdminSaveButton,
  AdminSearchField,
  filterRows,
  numberOrUndefined,
  ownerLabel,
} from "../../components/admin/AdminUi";
import { AdminWishlistProductCard } from "../../components/admin/AdminWishlistProductCard";
import { updateAdminSavedLink } from "../../lib/admin";
import { runAdminSave } from "../../lib/adminSave";

export function AdminWishlistPage() {
  const { data, error, setError, refresh } = useAdminData();
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState("");

  if (!data) return null;
  const items = filterRows(data.savedLinks, query);

  return (
    <div>
      <AdminPageHeader
        title="Wishlist"
        description="Saved products across all signed-in members."
        action={<AdminSearchField value={query} onChange={setQuery} placeholder="Filter wishlist…" />}
      />
      <AdminErrorNotice message={error} />

      <div className="space-y-3">
        {items.map((item) => (
          <AdminWishlistProductCard
            key={item.id}
            item={item}
            owner={ownerLabel(item.user_id, data.profiles)}
          >
            <form
              onSubmit={(event) => {
                event.preventDefault();
                const form = new FormData(event.currentTarget);
                void runAdminSave(
                  item.id,
                  setSavingId,
                  setError,
                  () =>
                    updateAdminSavedLink(item.id, {
                      title: String(form.get("title") || "") || undefined,
                      price_thb: numberOrUndefined(form.get("price_thb")),
                      price_mmk: numberOrUndefined(form.get("price_mmk")),
                      notes: String(form.get("notes") || "") || undefined,
                    }),
                  refresh,
                );
              }}
            >
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Admin edit</p>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <input name="title" defaultValue={item.title ?? ""} placeholder="Product title" className="admin-input lg:col-span-2" />
                <input name="price_thb" type="number" step="0.01" defaultValue={item.price_thb ?? ""} placeholder="THB price" className="admin-input" />
                <input name="price_mmk" type="number" step="1" defaultValue={item.price_mmk ?? ""} placeholder="MMK price" className="admin-input" />
                <input name="notes" defaultValue={item.notes ?? ""} placeholder="Notes" className="admin-input lg:col-span-4" />
              </div>
              <div className="mt-3">
                <AdminSaveButton saving={savingId === item.id} />
              </div>
            </form>
          </AdminWishlistProductCard>
        ))}
        {items.length === 0 && <AdminEmptyState />}
      </div>
    </div>
  );
}
