import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { AlertCircle, Loader2, Save, ShieldCheck } from "lucide-react";
import type { AdminProfile } from "../../lib/admin";

export function dateLabel(value: string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

export function ownerLabel(userId: string | undefined, profiles: AdminProfile[]) {
  if (!userId) return "Unknown user";
  const profile = profiles.find((item) => item.id === userId);
  return profile?.full_name || profile?.username || profile?.email || userId;
}

export function filterRows<T extends object>(items: T[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return items;
  return items.filter((item) => JSON.stringify(item).toLowerCase().includes(normalized));
}

export function numberOrUndefined(value: FormDataEntryValue | null) {
  const number = Number(value);
  return value === "" || !Number.isFinite(number) ? undefined : number;
}

export function numberOrZero(value: FormDataEntryValue | null) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function toLocalInput(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function AdminErrorNotice({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div className="mb-4 flex items-start gap-2 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </div>
  );
}

export function AdminSaveButton({ saving, children = "Save" }: { saving: boolean; children?: string }) {
  return (
    <button
      type="submit"
      disabled={saving}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
    >
      {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

export function AdminEmptyState({ message = "No matching records." }: { message?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-14 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export function AdminPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function AdminBlocked({ onSignIn }: { onSignIn?: () => void }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_#eef2ff,_#f8fafc_45%,_#f1f5f9)] px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl shadow-slate-200/60">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white">
          <ShieldCheck className="h-7 w-7" />
        </div>
        <h1 className="mt-5 text-xl font-bold text-slate-900">Admin access required</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          The Admin Dashboard is available only to authorized Admin accounts.
        </p>
        {onSignIn ? (
          <button
            type="button"
            onClick={onSignIn}
            className="mt-6 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Sign in
          </button>
        ) : (
          <Link
            to="/"
            className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Return to app
          </Link>
        )}
      </div>
    </div>
  );
}

export function AdminSearchField({
  value,
  onChange,
  placeholder = "Filter results…",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-500/10 sm:w-72"
    />
  );
}
