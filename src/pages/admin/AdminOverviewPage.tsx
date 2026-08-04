import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Banknote,
  BarChart3,
  Heart,
  Link2,
  Loader2,
  Package,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";
import { useAdminData } from "../../contexts/AdminDataProvider";
import { AdminErrorNotice, AdminPageHeader, dateLabel, ownerLabel } from "../../components/admin/AdminUi";
import { AdminUserAvatar } from "../../components/admin/AdminUserAvatar";
import { buildTopSearchChartItems, buildTopWishlistChartItems } from "../../lib/adminCharts";
import {
  fetchLazadaCatalogStats,
  syncLazadaCatalog,
  type LazadaCatalogStats,
} from "../../lib/lazadaCatalogAdmin";
import { parseSearchHistoryQuery } from "../../lib/searchHistory";
import { ORDER_STATUS_META } from "../../lib/utils";

const CARDS = [
  { to: "/adminteam/charts", label: "Charts", key: "charts" as const, icon: BarChart3, tone: "from-fuchsia-500 to-purple-600" },
  { to: "/adminteam/users", label: "Users", key: "users" as const, icon: Users, tone: "from-sky-500 to-blue-600" },
  { to: "/adminteam/wishlist", label: "Wishlist", key: "products" as const, icon: Heart, tone: "from-rose-500 to-pink-600" },
  { to: "/adminteam/searches", label: "Searches", key: "searches" as const, icon: Search, tone: "from-violet-500 to-indigo-600" },
  { to: "/adminteam/shared", label: "Shared lists", key: "shared" as const, icon: Link2, tone: "from-emerald-500 to-teal-600" },
  { to: "/adminteam/orders", label: "Orders", key: "orders" as const, icon: Package, tone: "from-amber-500 to-orange-600" },
];

export function AdminOverviewPage() {
  const { data, error } = useAdminData();
  const [catalogStats, setCatalogStats] = useState<LazadaCatalogStats | null>(null);
  const [catalogError, setCatalogError] = useState("");
  const [syncing, setSyncing] = useState(false);

  async function loadCatalogStats() {
    try {
      setCatalogError("");
      const stats = await fetchLazadaCatalogStats();
      setCatalogStats(stats);
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : "Could not load catalog stats");
    }
  }

  useEffect(() => {
    void loadCatalogStats();
  }, []);

  async function handleSyncCatalog() {
    setSyncing(true);
    setCatalogError("");
    try {
      await syncLazadaCatalog();
      await loadCatalogStats();
    } catch (e) {
      setCatalogError(e instanceof Error ? e.message : "Catalog sync failed");
    } finally {
      setSyncing(false);
    }
  }

  if (!data) return null;

  const counts = {
    charts: buildTopSearchChartItems(data.searchEvents).length + buildTopWishlistChartItems(data.savedLinks).length,
    users: data.profiles.length,
    products: data.savedLinks.length,
    searches: data.searchEvents.length,
    shared: data.sharedLists.length,
    orders: data.orders.length,
  };

  const recentUsers = data.profiles.slice(0, 5);
  const recentOrders = data.orders.slice(0, 5);
  const recentSearches = data.searchEvents.slice(0, 6);

  return (
    <div>
      <AdminPageHeader
        title="Overview"
        description="Snapshot of BuyForMe activity stored in Supabase."
        action={
          <Link
            to="/adminteam/rate"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            <Banknote className="h-4 w-4" />
            Adjust currency rate
          </Link>
        }
      />
      <AdminErrorNotice message={error} />

      <section className="mb-6 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold text-slate-900">Search product catalog</h2>
            <p className="mt-1 text-sm text-slate-600">
              Sync Lazada Product Offer feed into Supabase for the home page Search tab (Smart Search uses RapidAPI separately).
            </p>
            <p className="mt-2 text-sm text-slate-700">
              <span className="font-semibold">{catalogStats?.product_count ?? "—"}</span> products
              {catalogStats?.last_sync && (
                <>
                  {" "}
                  · last sync{" "}
                  <span className="font-medium capitalize">{catalogStats.last_sync.status}</span>
                  {" "}
                  ({catalogStats.last_sync.products_upserted} upserted
                  {catalogStats.last_sync.finished_at
                    ? ` · ${dateLabel(catalogStats.last_sync.finished_at)}`
                    : ""}
                  )
                </>
              )}
            </p>
            {(catalogError || catalogStats?.last_sync?.error_message) && (
              <p className="mt-2 text-xs text-red-600">
                {catalogError || catalogStats?.last_sync?.error_message}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => void handleSyncCatalog()}
            disabled={syncing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
          >
            {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            {syncing ? "Syncing catalog…" : "Sync Search catalog"}
          </button>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {CARDS.map(({ to, label, key, icon: Icon, tone }) => (
          <Link
            key={key}
            to={to}
            className="group relative overflow-hidden rounded-3xl border border-white/60 bg-white p-5 shadow-sm shadow-slate-200/70 transition hover:-translate-y-0.5 hover:shadow-md"
          >
            <div className={`mb-4 inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br ${tone} text-white shadow-lg`}>
              <Icon className="h-5 w-5" />
            </div>
            <p className="text-3xl font-bold tracking-tight text-slate-900">{counts[key]}</p>
            <div className="mt-1 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-slate-500">{label}</p>
              <ArrowRight className="h-4 w-4 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500" />
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Recent users</h2>
            <Link to="/adminteam/users" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <Link
                key={user.id}
                to={`/adminteam/users/${user.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-3 transition hover:bg-indigo-50"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <AdminUserAvatar user={user} className="h-9 w-9" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {user.full_name || user.username || "Unnamed user"}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user.email || user.id}</p>
                  </div>
                </div>
                <span className="shrink-0 rounded-lg bg-white px-2 py-1 text-[11px] font-semibold capitalize text-slate-600 ring-1 ring-slate-200">
                  {user.role}
                </span>
              </Link>
            ))}
            {recentUsers.length === 0 && <p className="text-sm text-slate-500">No users yet.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Latest orders</h2>
            <Link to="/adminteam/orders" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="rounded-2xl bg-slate-50 px-3 py-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="line-clamp-2 text-sm font-semibold text-slate-900">{order.product_title}</p>
                  <span className={`shrink-0 rounded-md px-2 py-1 text-[11px] font-semibold ${ORDER_STATUS_META[order.status]?.color || "bg-slate-100 text-slate-600"}`}>
                    {ORDER_STATUS_META[order.status]?.label || order.status}
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-slate-500">
                  {ownerLabel(order.user_id, data.profiles)} · {dateLabel(order.created_at)}
                </p>
              </div>
            ))}
            {recentOrders.length === 0 && <p className="text-sm text-slate-500">No orders yet.</p>}
          </div>
        </section>

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm xl:col-span-1">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Recent searches</h2>
            <Link to="/adminteam/searches" className="text-xs font-semibold text-indigo-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-2">
            {recentSearches.map((event) => {
              const parsed = parseSearchHistoryQuery(event.query);
              return (
              <div key={event.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${
                        parsed.mode === "smart"
                          ? "bg-violet-50 text-violet-700"
                          : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      {parsed.modeLabel}
                    </span>
                    <p className="truncate text-sm font-semibold text-slate-900">{parsed.term || parsed.display}</p>
                  </div>
                  <p className="truncate text-xs text-slate-500">{ownerLabel(event.user_id, data.profiles)}</p>
                </div>
                <span className="shrink-0 text-[11px] text-slate-400">{dateLabel(event.created_at)}</span>
              </div>
              );
            })}
            {recentSearches.length === 0 && (
              <p className="text-sm text-slate-500">
                No search history yet. Apply migration 019 and run a signed-in Search or Smart Search.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
