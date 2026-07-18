import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { useAdminData } from "../../contexts/AdminDataProvider";
import {
  AdminEmptyState,
  AdminErrorNotice,
  AdminPageHeader,
  AdminSaveButton,
  AdminSearchField,
  dateLabel,
  filterRows,
} from "../../components/admin/AdminUi";
import { AdminUserAvatar } from "../../components/admin/AdminUserAvatar";
import { updateAdminProfile } from "../../lib/admin";
import { runAdminSave } from "../../lib/adminSave";

export function AdminUsersPage() {
  const { data, error, setError, refresh } = useAdminData();
  const [query, setQuery] = useState("");
  const [savingId, setSavingId] = useState("");

  if (!data) return null;
  const items = filterRows(data.profiles, query);

  return (
    <div>
      <AdminPageHeader
        title="Users"
        description="Edit profiles and open each member’s activity page."
        action={<AdminSearchField value={query} onChange={setQuery} placeholder="Filter users…" />}
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
                  updateAdminProfile(item.id, {
                    full_name: String(form.get("full_name") || "") || null,
                    phone: String(form.get("phone") || "") || null,
                    address: String(form.get("address") || "") || null,
                    role: String(form.get("role")) as "admin" | "user",
                  }),
                refresh,
              );
            }}
            className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm"
          >
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <AdminUserAvatar user={item} />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-slate-900">{item.full_name || item.username || "Unnamed user"}</p>
                  <p className="truncate text-xs text-slate-500">{item.email || item.id}</p>
                </div>
              </div>
              <span className="text-xs text-slate-400">{dateLabel(item.created_at)}</span>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <input name="full_name" defaultValue={item.full_name ?? ""} placeholder="Full name" className="admin-input" />
              <input name="phone" defaultValue={item.phone ?? ""} placeholder="Phone" className="admin-input" />
              <input name="address" defaultValue={item.address ?? ""} placeholder="Address" className="admin-input" />
              <select name="role" defaultValue={item.role} className="admin-input">
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <AdminSaveButton saving={savingId === item.id} />
              <Link
                to={`/adminteam/users/${item.id}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-700"
              >
                View activity
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </form>
        ))}
        {items.length === 0 && <AdminEmptyState message="No users match this filter." />}
      </div>
    </div>
  );
}
