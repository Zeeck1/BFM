import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Clock3 } from "lucide-react";
import { useAdminData } from "../../contexts/AdminDataProvider";
import {
  AdminEmptyState,
  AdminErrorNotice,
  AdminPageHeader,
  AdminSaveButton,
  AdminSearchField,
  dateLabel,
  filterRows,
  ownerLabel,
  toLocalInput,
} from "../../components/admin/AdminUi";
import type { AdminSharedList } from "../../lib/admin";
import { updateAdminSharedList } from "../../lib/admin";
import { runAdminSave } from "../../lib/adminSave";

type SharedTab = "active" | "inactive";

function isSharedListActive(item: AdminSharedList) {
  if (!item.expires_at) return false;
  return new Date(item.expires_at).getTime() > Date.now();
}

export function AdminSharedListsPage() {
  const { data, error, setError, refresh } = useAdminData();
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState("");
  const [tab, setTab] = useState<SharedTab>("active");

  const filtered = useMemo(
    () => (data ? filterRows(data.sharedLists, query) : []),
    [data, query],
  );

  const activeItems = useMemo(
    () =>
      filtered
        .filter(isSharedListActive)
        .sort((a, b) => (b.expires_at ?? "").localeCompare(a.expires_at ?? "")),
    [filtered],
  );

  const inactiveItems = useMemo(
    () =>
      filtered
        .filter((item) => !isSharedListActive(item))
        .sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? "")),
    [filtered],
  );

  const items = tab === "active" ? activeItems : inactiveItems;

  if (!data) return null;

  return (
    <div>
      <AdminPageHeader
        title="Shared lists"
        description="Public share links split into active and expired lists."
        action={
          <AdminSearchField
            value={query}
            onChange={setQuery}
            placeholder="Filter shared lists…"
          />
        }
      />
      <AdminErrorNotice message={error} />

      <div
        role="tablist"
        aria-label="Shared list status"
        className="mb-5 grid grid-cols-2 gap-1 rounded-2xl border border-slate-200 bg-slate-100/80 p-1"
      >
        <TabButton
          active={tab === "active"}
          onClick={() => {
            setTab("active");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          icon={CheckCircle2}
          label="Active"
          count={activeItems.length}
        />
        <TabButton
          active={tab === "inactive"}
          onClick={() => {
            setTab("inactive");
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          icon={Clock3}
          label="Inactive"
          count={inactiveItems.length}
        />
      </div>

      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Showing{" "}
          <span className="font-semibold text-slate-800">
            {items.length}
          </span>{" "}
          {tab} list{items.length === 1 ? "" : "s"}
          {query.trim() ? " matching your filter" : ""}.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((item) => {
          const active = isSharedListActive(item);
          return (
            <form
              key={item.id}
              onSubmit={(event) => {
                event.preventDefault();
                void runAdminSave(
                  item.id,
                  setSavingId,
                  setError,
                  () =>
                    updateAdminSharedList(
                      item.id,
                      new FormData(event.currentTarget).get("expires_at") as string,
                    ),
                  refresh,
                );
              }}
              className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {active ? (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      ) : (
                        <Clock3 className="h-3.5 w-3.5" />
                      )}
                      {active ? "Active" : "Inactive"}
                    </span>
                    <span className="text-xs text-slate-400">
                      {item.items.length} item{item.items.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-900">
                    {item.owner_name || ownerLabel(item.user_id, data.profiles)}
                  </p>
                  <p className="text-xs text-slate-500">
                    Owner:{" "}
                    <Link
                      to={`/adminteam/users/${item.user_id}`}
                      className="font-semibold text-indigo-600 hover:underline"
                    >
                      {ownerLabel(item.user_id, data.profiles)}
                    </Link>{" "}
                    · Share ID: {item.id}
                  </p>
                </div>
                <div className="text-right text-xs text-slate-400">
                  <p>Created {dateLabel(item.created_at)}</p>
                  <p className="mt-1">
                    {active ? "Expires" : "Expired"} {dateLabel(item.expires_at)}
                  </p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  name="expires_at"
                  type="datetime-local"
                  defaultValue={toLocalInput(item.expires_at)}
                  className="admin-input sm:max-w-xs"
                />
                <AdminSaveButton saving={savingId === item.id}>Update expiry</AdminSaveButton>
              </div>
            </form>
          );
        })}
        {items.length === 0 && (
          <AdminEmptyState
            message={
              tab === "active"
                ? "No active shared lists right now."
                : "No inactive or expired shared lists."
            }
          />
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon: Icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof CheckCircle2;
  label: string;
  count: number;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
        active
          ? "bg-white text-slate-900 shadow-sm"
          : "text-slate-500 hover:text-slate-800"
      }`}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
      <span
        className={`rounded-lg px-2 py-0.5 text-xs font-bold ${
          active ? "bg-slate-900 text-white" : "bg-slate-200/80 text-slate-600"
        }`}
      >
        {count}
      </span>
    </button>
  );
}
