import { useState } from "react";
import { Link } from "react-router-dom";
import { useAdminData } from "../../contexts/AdminDataProvider";
import {
  AdminEmptyState,
  AdminErrorNotice,
  AdminPageHeader,
  AdminSaveButton,
  AdminSearchField,
  dateLabel,
  filterRows,
  numberOrZero,
  ownerLabel,
} from "../../components/admin/AdminUi";
import { updateAdminOrder } from "../../lib/admin";
import { runAdminSave } from "../../lib/adminSave";
import { ORDER_STATUS_META, formatMMK, formatTHB } from "../../lib/utils";
import type { OrderStatus } from "../../types";

const ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "paid",
  "processing",
  "purchasing",
  "received_at_bkk",
  "warehouse_bkk",
  "in_transit",
  "delivered",
];

export function AdminOrdersPage() {
  const { data, error, setError, refresh } = useAdminData();
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState("");

  if (!data) return null;
  const items = filterRows(data.orders, query);

  return (
    <div>
      <AdminPageHeader
        title="Orders"
        description="Update fulfillment status, pricing, and notes."
        action={<AdminSearchField value={query} onChange={setQuery} placeholder="Filter orders…" />}
      />
      <AdminErrorNotice message={error} />

      <div className="space-y-3">
        {items.map((item) => (
          <form
            key={item.id}
            onSubmit={(event) => {
              event.preventDefault();
              const form = new FormData(event.currentTarget);
              void runAdminSave(
                item.id,
                setSavingId,
                setError,
                () =>
                  updateAdminOrder(item.id, {
                    status: String(form.get("status")) as OrderStatus,
                    price_thb: numberOrZero(form.get("price_thb")),
                    price_mmk: numberOrZero(form.get("price_mmk")),
                    cargo_fee_mmk: numberOrZero(form.get("cargo_fee_mmk")),
                    notes: String(form.get("notes") || "") || null,
                  }),
                refresh,
              );
            }}
            className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">{item.product_title}</p>
                <p className="truncate text-xs text-slate-500">
                  Customer:{" "}
                  <Link to={`/adminteam/users/${item.user_id}`} className="font-semibold text-indigo-600 hover:underline">
                    {ownerLabel(item.user_id, data.profiles)}
                  </Link>
                </p>
              </div>
              <span className={`rounded-md px-2 py-1 text-xs font-semibold ${ORDER_STATUS_META[item.status]?.color || "bg-slate-100 text-slate-600"}`}>
                {ORDER_STATUS_META[item.status]?.label || item.status}
              </span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <select name="status" defaultValue={item.status} className="admin-input">
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_META[status]?.label || status}
                  </option>
                ))}
              </select>
              <input name="price_thb" type="number" step="0.01" defaultValue={item.price_thb} className="admin-input" />
              <input name="price_mmk" type="number" step="1" defaultValue={item.price_mmk} className="admin-input" />
              <input name="cargo_fee_mmk" type="number" step="1" defaultValue={item.cargo_fee_mmk} className="admin-input" />
              <input name="notes" defaultValue={item.notes ?? ""} placeholder="Notes" className="admin-input" />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              {formatTHB(item.price_thb)} · {formatMMK(item.price_mmk)} · Updated {dateLabel(item.updated_at)}
            </p>
            <div className="mt-4">
              <AdminSaveButton saving={savingId === item.id} />
            </div>
          </form>
        ))}
        {items.length === 0 && <AdminEmptyState />}
      </div>
    </div>
  );
}
