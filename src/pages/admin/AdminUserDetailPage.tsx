import { type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAdminData } from "../../contexts/AdminDataProvider";
import {
  AdminEmptyState,
  AdminErrorNotice,
  AdminPageHeader,
  dateLabel,
} from "../../components/admin/AdminUi";
import { AdminWishlistProductCard } from "../../components/admin/AdminWishlistProductCard";
import { ORDER_STATUS_META } from "../../lib/utils";

export function AdminUserDetailPage() {
  const { userId = "" } = useParams();
  const { data, error } = useAdminData();
  if (!data) return null;

  const user = data.profiles.find((item) => item.id === userId);
  if (!user) {
    return (
      <div>
        <AdminPageHeader title="User not found" description="This profile is not in the current admin dataset." />
        <Link to="/adminteam/users" className="text-sm font-semibold text-indigo-600 hover:underline">
          Back to users
        </Link>
      </div>
    );
  }

  const savedLinks = data.savedLinks.filter((item) => item.user_id === user.id);
  const sharedLists = data.sharedLists.filter((item) => item.user_id === user.id);
  const orders = data.orders.filter((item) => item.user_id === user.id);
  const searchEvents = data.searchEvents.filter((item) => item.user_id === user.id);

  const topSearches = Object.entries(
    searchEvents.reduce<Record<string, number>>((counts, event) => {
      const query = event.query.trim();
      counts[query] = (counts[query] ?? 0) + 1;
      return counts;
    }, {}),
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  return (
    <div>
      <Link
        to="/adminteam/users"
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to users
      </Link>

      <AdminPageHeader
        title={user.full_name || user.username || "Unnamed user"}
        description={`${user.email || user.id} · Joined ${dateLabel(user.created_at)} · Role: ${user.role}`}
      />
      <AdminErrorNotice message={error} />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Wishlist" count={savedLinks.length} />
        <StatCard label="Searches" count={searchEvents.length} />
        <StatCard label="Shared lists" count={sharedLists.length} />
        <StatCard label="Orders" count={orders.length} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Wishlist products">
          {savedLinks.length === 0 && <AdminEmptyState message="No saved products." />}
          <div className="space-y-3">
            {savedLinks.map((item) => (
              <AdminWishlistProductCard key={item.id} item={item} />
            ))}
          </div>
        </Panel>

        <Panel title="Most searched">
          {topSearches.length === 0 && <AdminEmptyState message="No recorded searches yet." />}
          <div className="space-y-2">
            {topSearches.map(([query, count]) => (
              <div key={query} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3">
                <p className="truncate text-sm font-semibold text-slate-900">{query}</p>
                <span className="shrink-0 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700">
                  {count}×
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Shared lists">
          {sharedLists.length === 0 && <AdminEmptyState message="No shared lists." />}
          <div className="space-y-2">
            {sharedLists.map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                <p className="text-sm font-semibold text-slate-900">
                  {item.items.length} item{item.items.length === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-slate-500">
                  Expires {dateLabel(item.expires_at)} · Created {dateLabel(item.created_at)}
                </p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Orders">
          {orders.length === 0 && <AdminEmptyState message="No orders." />}
          <div className="space-y-2">
            {orders.map((item) => (
              <div key={item.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.product_title}</p>
                  <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${ORDER_STATUS_META[item.status]?.color || "bg-slate-100 text-slate-600"}`}>
                    {ORDER_STATUS_META[item.status]?.label || item.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-500">{dateLabel(item.updated_at)}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

function StatCard({ label, count }: { label: string; count: number }) {
  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <p className="text-2xl font-bold text-slate-900">{count}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{label}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <h2 className="mb-4 font-bold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}
