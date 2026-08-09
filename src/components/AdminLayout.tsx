import { useEffect, useState } from "react";
import { NavLink, Outlet, Link } from "react-router-dom";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  ArrowLeft,
  BarChart3,
  Banknote,
  Heart,
  LayoutDashboard,
  Link2,
  Loader2,
  Menu,
  Package,
  RefreshCw,
  Search,
  Users,
  X,
} from "lucide-react";
import { isCurrentUserAdmin } from "../lib/admin";
import { AdminDataProvider, useAdminData } from "../contexts/AdminDataProvider";
import { AdminBlocked } from "./admin/AdminUi";
import { BrandLogo } from "./BrandLogo";

const NAV = [
  { to: "/adminteam", end: true, label: "Overview", icon: LayoutDashboard },
  { to: "/adminteam/charts", end: false, label: "Charts", icon: BarChart3 },
  { to: "/adminteam/rate", end: false, label: "Currency rate", icon: Banknote },
  { to: "/adminteam/users", end: false, label: "Users", icon: Users },
  { to: "/adminteam/wishlist", end: false, label: "Wishlist", icon: Heart },
  { to: "/adminteam/searches", end: false, label: "Searches", icon: Search },
  { to: "/adminteam/shared", end: false, label: "Shared lists", icon: Link2 },
  { to: "/adminteam/orders", end: false, label: "Orders", icon: Package },
] as const;

export interface AdminLayoutProps {
  user: SupabaseUser | null;
  onSignIn: () => void;
}

export default function AdminLayout({ user, onSignIn }: AdminLayoutProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    if (!user) {
      setAllowed(false);
      return;
    }
    let cancelled = false;
    setAllowed(null);
    void isCurrentUserAdmin(user.id).then((isAdmin) => {
      if (!cancelled) setAllowed(isAdmin);
    });
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return <AdminBlocked onSignIn={onSignIn} />;
  }

  if (allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-sm text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Checking access…
      </div>
    );
  }

  if (!allowed) {
    return <AdminBlocked />;
  }

  return (
    <AdminDataProvider>
      <AdminShell />
    </AdminDataProvider>
  );
}

function AdminShell() {
  const { data, loading, refresh } = useAdminData();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top_left,_#eef2ff_0%,_#f8fafc_40%,_#f1f5f9_100%)] text-slate-900">
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white/90 backdrop-blur-xl lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col">
          <AdminBrand />
          <div className="min-h-0 flex-1 overflow-y-auto">
            <AdminNav onNavigate={() => setMobileOpen(false)} />
          </div>
          <AdminSidebarFooter loading={loading} onRefresh={() => void refresh()} />
        </aside>

        {mobileOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-slate-900/40"
              onClick={() => setMobileOpen(false)}
            />
            <aside className="relative z-50 flex h-full w-[min(18rem,100%)] flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-3 py-3 sm:px-4 sm:py-4">
                <AdminBrand compact />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <AdminNav onNavigate={() => setMobileOpen(false)} />
              </div>
              <AdminSidebarFooter loading={loading} onRefresh={() => void refresh()} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex w-full items-center justify-between gap-2 border-b border-slate-200/80 bg-white/90 px-3 py-2 backdrop-blur-xl sm:gap-3 sm:px-4 sm:py-2.5 lg:hidden">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="shrink-0 rounded-xl border border-slate-200 bg-white p-2 text-slate-700"
                aria-label="Open menu"
              >
                <Menu className="h-5 w-5" />
              </button>
              <AdminBrand compact header />
            </div>
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <button
                type="button"
                onClick={() => void refresh()}
                disabled={loading}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-700 disabled:opacity-60 sm:px-3 sm:py-2"
                aria-label="Refresh data"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">Refresh</span>
              </button>
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-700 sm:px-3 sm:py-2"
                aria-label="Back to app"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">App</span>
              </Link>
            </div>
          </header>

          <main className="w-full flex-1 px-3 py-4 sm:px-4 sm:py-5 lg:px-6 lg:py-6">
            {loading && !data ? (
              <div className="flex min-h-[50vh] items-center justify-center gap-2 text-sm font-medium text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading protected workspace…
              </div>
            ) : (
              <Outlet />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function AdminBrand({
  compact = false,
  header = false,
}: {
  compact?: boolean;
  header?: boolean;
}) {
  return (
    <div
      className={
        header
          ? "min-w-0"
          : `border-b border-slate-100 ${compact ? "" : "px-3 py-4 sm:px-4 sm:py-5"}`
      }
    >
      <div className={`flex min-w-0 items-center ${header ? "gap-2" : "gap-2 sm:gap-2.5"}`}>
        <div
          className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-slate-200 sm:rounded-2xl ${
            header ? "h-9 w-9 sm:h-10 sm:w-10" : compact ? "h-10 w-10" : "h-10 w-10 sm:h-11 sm:w-11"
          }`}
        >
          <BrandLogo className="h-full w-full !object-cover" />
        </div>
        <div className="min-w-0">
          <p
            className={`truncate font-bold tracking-tight text-slate-900 ${
              header ? "text-xs sm:text-sm" : "text-sm"
            }`}
          >
            Admin Dashboard
          </p>
          <p
            className={`truncate font-medium text-slate-500 ${
              header ? "text-[10px] sm:text-[11px]" : "text-[11px]"
            }`}
          >
            Admin
          </p>
        </div>
      </div>
    </div>
  );
}

function AdminNav({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav className="space-y-1 px-3 py-4">
      {NAV.map(({ to, end, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
              isActive
                ? "bg-slate-900 text-white shadow-md shadow-slate-900/15"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`
          }
        >
          <Icon className="h-4 w-4 shrink-0 opacity-90" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function AdminSidebarFooter({ loading, onRefresh }: { loading: boolean; onRefresh: () => void }) {
  return (
    <div className="shrink-0 space-y-2 border-t border-slate-100 bg-white/95 p-4">
      <button
        type="button"
        onClick={onRefresh}
        disabled={loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
      >
        <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        Refresh data
      </button>
      <Link
        to="/"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to app
      </Link>
    </div>
  );
}
