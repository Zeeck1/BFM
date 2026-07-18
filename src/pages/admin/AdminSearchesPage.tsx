import { useState } from "react";
import { Link } from "react-router-dom";
import { useAdminData } from "../../contexts/AdminDataProvider";
import {
  AdminEmptyState,
  AdminErrorNotice,
  AdminPageHeader,
  AdminSearchField,
  dateLabel,
  filterRows,
  ownerLabel,
} from "../../components/admin/AdminUi";

export function AdminSearchesPage() {
  const { data, error } = useAdminData();
  const [query, setQuery] = useState("");

  if (!data) return null;
  const items = filterRows(data.searchEvents, query);

  const grouped = Object.entries(
    items.reduce<Record<string, { query: string; userId: string; count: number; latest: string }>>((groups, item) => {
      const key = `${item.user_id}:${item.query.trim().toLowerCase()}`;
      const existing = groups[key];
      groups[key] = existing
        ? { ...existing, count: existing.count + 1, latest: item.created_at > existing.latest ? item.created_at : existing.latest }
        : { query: item.query, userId: item.user_id, count: 1, latest: item.created_at };
      return groups;
    }, {}),
  )
    .map(([, value]) => value)
    .sort((a, b) => b.count - a.count || b.latest.localeCompare(a.latest));

  return (
    <div>
      <AdminPageHeader
        title="Searches"
        description="Signed-in Lazada searches recorded in Supabase."
        action={<AdminSearchField value={query} onChange={setQuery} placeholder="Filter searches…" />}
      />
      <AdminErrorNotice message={error} />

      <div className="space-y-3">
        {grouped.map((item) => (
          <div
            key={`${item.userId}:${item.query}`}
            className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="min-w-0">
              <p className="font-semibold text-slate-900">{item.query}</p>
              <p className="text-xs text-slate-500">
                Searched by:{" "}
                <Link to={`/adminteam/users/${item.userId}`} className="font-semibold text-indigo-600 hover:underline">
                  {ownerLabel(item.userId, data.profiles)}
                </Link>{" "}
                · Latest: {dateLabel(item.latest)}
              </p>
            </div>
            <span className="rounded-xl bg-indigo-50 px-3 py-2 text-sm font-bold text-indigo-700">
              {item.count} search{item.count === 1 ? "" : "es"}
            </span>
          </div>
        ))}
        {grouped.length === 0 && (
          <AdminEmptyState message="No search history yet. Apply migration 019, then run a signed-in search." />
        )}
      </div>
    </div>
  );
}
