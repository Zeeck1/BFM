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
  ownerLabel,
  toLocalInput,
} from "../../components/admin/AdminUi";
import { updateAdminSharedList } from "../../lib/admin";
import { runAdminSave } from "../../lib/adminSave";

export function AdminSharedListsPage() {
  const { data, error, setError, refresh } = useAdminData();
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState("");

  if (!data) return null;
  const items = filterRows(data.sharedLists, query);

  return (
    <div>
      <AdminPageHeader
        title="Shared lists"
        description="Public share links and expiry controls."
        action={<AdminSearchField value={query} onChange={setQuery} placeholder="Filter shared lists…" />}
      />
      <AdminErrorNotice message={error} />

      <div className="space-y-3">
        {items.map((item) => (
          <form
            key={item.id}
            onSubmit={(event) => {
              event.preventDefault();
              void runAdminSave(
                item.id,
                setSavingId,
                setError,
                () => updateAdminSharedList(item.id, new FormData(event.currentTarget).get("expires_at") as string),
                refresh,
              );
            }}
            className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-slate-900">{item.owner_name || ownerLabel(item.user_id, data.profiles)}</p>
                <p className="text-xs text-slate-500">
                  Owner:{" "}
                  <Link to={`/adminteam/users/${item.user_id}`} className="font-semibold text-indigo-600 hover:underline">
                    {ownerLabel(item.user_id, data.profiles)}
                  </Link>{" "}
                  · Share ID: {item.id} · {item.items.length} item{item.items.length === 1 ? "" : "s"}
                </p>
              </div>
              <span className="text-xs text-slate-400">Created {dateLabel(item.created_at)}</span>
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
        ))}
        {items.length === 0 && <AdminEmptyState />}
      </div>
    </div>
  );
}
