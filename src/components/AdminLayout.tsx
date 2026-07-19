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
      <div className="mx-auto flex min-h-screen max-w-[1440px]">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200/80 bg-white/80 backdrop-blur-xl lg:flex lg:flex-col">
          <AdminBrand />
          <AdminNav onNavigate={() => setMobileOpen(false)} />
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
            <aside className="relative z-50 flex h-full w-72 flex-col bg-white shadow-2xl">
              <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                <AdminBrand compact />
                <button
                  type="button"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <AdminNav onNavigate={() => setMobileOpen(false)} />
              <AdminSidebarFooter loading={loading} onRefresh={() => void refresh()} />
            </aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-slate-200/80 bg-white/80 px-4 py-3 backdrop-blur-xl sm:px-6 lg:hidden">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setMobileOpen(true)}
                className="rounded-xl border border-slate-200 bg-white p-2 text-slate-700"
              >
                <Menu className="h-5 w-5" />
              </button>
              <div>
                <p className="text-sm font-bold text-slate-900">Admin Dashboard</p>
                <p className="text-[11px] text-slate-500">Admin</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
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

function AdminBrand({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`border-b border-slate-100 ${compact ? "" : "px-5 py-6"}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-lg shadow-slate-900/10 ring-1 ring-slate-200">
          <BrandLogo className="h-9 w-9" />
        </div>
        <div>
          <p className="text-sm font-bold tracking-tight text-slate-900">Admin Dashboard</p>
          <p className="text-[11px] font-medium text-slate-500">Admin</p>
        </div>
      </div>
    </div>
  );
}

function AdminNav({ onNavigate }: { onNavigate: () => void }) {
  return (
    <nav className="flex-1 space-y-1 px-3 py-4">
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
    <div className="space-y-2 border-t border-slate-100 p-4">
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
