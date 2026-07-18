import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Heart, Search } from "lucide-react";
import { AdminBarChart } from "../../components/admin/AdminBarChart";
import { AdminErrorNotice, AdminPageHeader } from "../../components/admin/AdminUi";
import { useAdminData } from "../../contexts/AdminDataProvider";
import { buildTopSearchChartItems, buildTopWishlistChartItems } from "../../lib/adminCharts";

export function AdminChartsPage() {
  const { data, error } = useAdminData();

  const topSearches = useMemo(
    () => (data ? buildTopSearchChartItems(data.searchEvents) : []),
    [data],
  );
  const topWishlistItems = useMemo(
    () => (data ? buildTopWishlistChartItems(data.savedLinks) : []),
    [data],
  );

  if (!data) return null;

  const totalSearchQueries = topSearches.reduce((sum, item) => sum + item.count, 0);
  const totalWishlistSaves = topWishlistItems.reduce((sum, item) => sum + item.count, 0);

  return (
    <div>
      <AdminPageHeader
        title="Charts"
        description="Top 5 searched product names and top 5 saved wishlist items across all users."
      />
      <AdminErrorNotice message={error} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2">
        <StatCard
          icon={Search}
          label="Search events"
          value={data.searchEvents.length}
          detail={`Top ${topSearches.length} of 5 search names`}
          to="/adminteam/searches"
        />
        <StatCard
          icon={Heart}
          label="Wishlist saves"
          value={data.savedLinks.length}
          detail={`Top ${topWishlistItems.length} of 5 wishlist products`}
          to="/adminteam/wishlist"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <AdminBarChart
          title="Most searched names"
          description={`Top 5 search terms by how often users searched them. Total in chart: ${totalSearchQueries || 0}.`}
          items={topSearches}
          emptyMessage="No search history yet. Apply migration 019, then run signed-in Lazada searches."
          accent="indigo"
        />
        <AdminBarChart
          title="Most wishlist items"
          description={`Top 5 products by how many times they were saved. Total in chart: ${totalWishlistSaves || 0}.`}
          items={topWishlistItems}
          emptyMessage="No wishlist products saved yet."
          accent="rose"
        />
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
  to,
}: {
  icon: typeof Search;
  label: string;
  value: number;
  detail: string;
  to: string;
}) {
  return (
    <Link
      to={to}
      className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{value}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Link>
  );
}
