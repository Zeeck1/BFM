import { useMemo, useState } from "react";
import { Heart, Package, Store, Trophy, Users } from "lucide-react";
import { AdminBarChart } from "../../components/admin/AdminBarChart";
import { AdminWishlistProductCard } from "../../components/admin/AdminWishlistProductCard";
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
import { useAdminData } from "../../contexts/AdminDataProvider";
import { updateAdminSavedLink } from "../../lib/admin";
import {
  buildTopWishlistChartItems,
  buildWishlistSiteChartItems,
  summarizeWishlistItems,
} from "../../lib/adminCharts";
import { runAdminSave } from "../../lib/adminSave";

export function AdminWishlistPage() {
  const { data, error, setError, refresh } = useAdminData();
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState("");

  const items = useMemo(
    () => (data ? filterRows(data.savedLinks, query) : []),
    [data, query],
  );

  const summary = useMemo(() => summarizeWishlistItems(items), [items]);
  const topProducts = useMemo(() => buildTopWishlistChartItems(items, 8), [items]);
  const siteBreakdown = useMemo(() => buildWishlistSiteChartItems(items, 6), [items]);

  if (!data) return null;

  return (
    <div>
      <AdminPageHeader
        title="Wishlist"
        description="Summary charts and saved products across all signed-in members."
        action={<AdminSearchField value={query} onChange={setQuery} placeholder="Filter wishlist…" />}
      />
      <AdminErrorNotice message={error} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Heart} label="Total saves" value={summary.total} />
        <SummaryCard icon={Package} label="Unique products" value={summary.uniqueProducts} />
        <SummaryCard icon={Users} label="Saving users" value={summary.uniqueUsers} />
        <SummaryCard
          icon={Trophy}
          label="Top product saves"
          value={summary.topCount}
          detail={summary.topProduct ?? "No wishlist items yet"}
        />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-2">
        <AdminBarChart
          title="Most saved products"
          description="Top wishlist items ranked by how often they were saved."
          items={topProducts}
          emptyMessage="No wishlist products saved yet."
          accent="rose"
        />
        <AdminBarChart
          title="Saves by platform"
          description="Wishlist volume grouped by store or site name."
          items={siteBreakdown}
          emptyMessage="No platform data yet."
          accent="indigo"
        />
      </div>

      <section className="mb-6 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Store className="h-4 w-4 text-slate-500" />
          <div>
            <h2 className="font-bold text-slate-900">Wishlist summary</h2>
            <p className="text-xs text-slate-500">
              Compact ranking of popular products in the current filter.
            </p>
          </div>
        </div>

        {topProducts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wide text-slate-400">
                  <th className="px-2 py-2 font-semibold">#</th>
                  <th className="px-2 py-2 font-semibold">Product</th>
                  <th className="px-2 py-2 font-semibold">Detail</th>
                  <th className="px-2 py-2 text-right font-semibold">Saves</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((item, index) => (
                  <tr key={`${item.label}-${index}`} className="border-b border-slate-50 last:border-0">
                    <td className="px-2 py-3 text-xs font-bold text-slate-400">{index + 1}</td>
                    <td className="max-w-[18rem] truncate px-2 py-3 font-semibold text-slate-900" title={item.label}>
                      {item.label}
                    </td>
                    <td className="max-w-[12rem] truncate px-2 py-3 text-xs text-slate-500" title={item.hint}>
                      {item.hint || "—"}
                    </td>
                    <td className="px-2 py-3 text-right">
                      <span className="rounded-lg bg-rose-50 px-2 py-1 text-xs font-bold text-rose-700">
                        {item.count}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
            No matching wishlist items.
          </p>
        )}

        <p className="mt-4 text-xs text-slate-500">
          {summary.withPrice} of {summary.total} saves include a price.
        </p>
      </section>

      <section>
        <div className="mb-3">
          <h2 className="font-bold text-slate-900">All wishlist items</h2>
          <p className="text-xs text-slate-500">
            Full product cards with admin edit ({items.length} item{items.length === 1 ? "" : "s"}).
          </p>
        </div>

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
      </section>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Heart;
  label: string;
  value: number;
  detail?: string;
}) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-1.5 text-2xl font-bold text-slate-900">{value}</p>
          {detail && (
            <p className="mt-1 truncate text-xs text-slate-500" title={detail}>
              {detail}
            </p>
          )}
        </div>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}
