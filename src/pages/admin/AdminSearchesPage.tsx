import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users, Hash, Trophy } from "lucide-react";
import { AdminBarChart } from "../../components/admin/AdminBarChart";
import {
  AdminEmptyState,
  AdminErrorNotice,
  AdminPageHeader,
  AdminSearchField,
  dateLabel,
  filterRows,
  ownerLabel,
} from "../../components/admin/AdminUi";
import { useAdminData } from "../../contexts/AdminDataProvider";
import { buildTopSearchChartItems, summarizeSearchEvents } from "../../lib/adminCharts";
import { parseSearchHistoryQuery } from "../../lib/searchHistory";

export function AdminSearchesPage() {
  const { data, error } = useAdminData();
  const [query, setQuery] = useState("");

  const items = useMemo(
    () => (data ? filterRows(data.searchEvents, query) : []),
    [data, query],
  );

  const summary = useMemo(() => summarizeSearchEvents(items), [items]);
  const chartItems = useMemo(() => buildTopSearchChartItems(items, 8), [items]);

  const grouped = useMemo(
    () =>
      Object.entries(
        items.reduce<
          Record<string, { query: string; userId: string; count: number; latest: string }>
        >((groups, item) => {
          const key = `${item.user_id}:${item.query.trim().toLowerCase()}`;
          const existing = groups[key];
          groups[key] = existing
            ? {
                ...existing,
                count: existing.count + 1,
                latest: item.created_at > existing.latest ? item.created_at : existing.latest,
              }
            : {
                query: item.query,
                userId: item.user_id,
                count: 1,
                latest: item.created_at,
              };
          return groups;
        }, {}),
      )
        .map(([, value]) => value)
        .sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest)),
    [items],
  );

  if (!data) return null;

  return (
    <div>
      <AdminPageHeader
        title="Searches"
        description="Summary of signed-in Search and Smart Search activity across all users."
        action={<AdminSearchField value={query} onChange={setQuery} placeholder="Filter searches…" />}
      />
      <AdminErrorNotice message={error} />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard icon={Search} label="Total searches" value={summary.total} />
        <SummaryCard icon={Hash} label="Unique queries" value={summary.uniqueQueries} />
        <SummaryCard icon={Users} label="Searching users" value={summary.uniqueUsers} />
        <SummaryCard
          icon={Trophy}
          label="Top query"
          value={summary.topCount}
          detail={summary.topQuery ?? "No searches yet"}
        />
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <AdminBarChart
          title="Top search terms"
          description="Most searched names from Search and Smart Search, ranked by frequency."
          items={chartItems}
          emptyMessage="No search history yet. Apply migration 019, then run a signed-in Search or Smart Search."
          accent="indigo"
        />

        <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">Search summary</h2>
          <p className="mt-1 text-xs text-slate-500">
            Compact ranking of Search / Smart Search + user pairs in the current filter.
          </p>
          <div className="mt-4 space-y-2.5">
            {grouped.slice(0, 8).map((item, index) => {
              const parsed = parseSearchHistoryQuery(item.query);
              return (
              <div
                key={`${item.userId}:${item.query}`}
                className="flex items-start justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3.5 py-3"
              >
                <div className="min-w-0 flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-white text-[11px] font-bold text-slate-500 shadow-sm">
                    {index + 1}
                  </span>
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
                      <p className="truncate text-sm font-semibold text-slate-900" title={parsed.display}>
                        {parsed.term || parsed.display}
                      </p>
                    </div>
                    <p className="truncate text-[11px] text-slate-500">
                      <Link
                        to={`/adminteam/users/${item.userId}`}
                        className="font-semibold text-indigo-600 hover:underline"
                      >
                        {ownerLabel(item.userId, data.profiles)}
                      </Link>
                      {" · "}
                      {dateLabel(item.latest)}
                    </p>
                  </div>
                </div>
                <span className="shrink-0 rounded-lg bg-indigo-50 px-2 py-1 text-xs font-bold text-indigo-700">
                  {item.count}×
                </span>
              </div>
              );
            })}
            {grouped.length === 0 && (
              <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No matching searches.
              </p>
            )}
          </div>
        </section>
      </div>

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">All search pairs</h2>
            <p className="text-xs text-slate-500">
              Full summarized list ({grouped.length} row{grouped.length === 1 ? "" : "s"}).
            </p>
          </div>
        </div>
        <div className="space-y-2.5">
          {grouped.map((item) => {
            const parsed = parseSearchHistoryQuery(item.query);
            return (
            <div
              key={`all:${item.userId}:${item.query}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white px-4 py-3.5 shadow-sm"
            >
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
                  <p className="truncate font-semibold text-slate-900" title={parsed.display}>
                    {parsed.term || parsed.display}
                  </p>
                </div>
                <p className="text-xs text-slate-500">
                  Searched by:{" "}
                  <Link
                    to={`/adminteam/users/${item.userId}`}
                    className="font-semibold text-indigo-600 hover:underline"
                  >
                    {ownerLabel(item.userId, data.profiles)}
                  </Link>{" "}
                  · Latest: {dateLabel(item.latest)}
                </p>
              </div>
              <span className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">
                {item.count} search{item.count === 1 ? "" : "es"}
              </span>
            </div>
            );
          })}
          {grouped.length === 0 && (
            <AdminEmptyState message="No search history yet. Apply migration 019, then run a signed-in Search or Smart Search." />
          )}
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
  icon: typeof Search;
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
