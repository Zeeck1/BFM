// src/components/Navbar.tsx

import { Link } from "react-router-dom";
import { LogOut } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { userAvatarUrl, userDisplayName } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { AppTabs } from "./AppTabs";
import { BrandLogo } from "./BrandLogo";
import { ExchangeRateWidget } from "./ExchangeRateWidget";

interface NavbarProps {
  user: SupabaseUser | null;
  onAuthClick: () => void;
  wishlistCount?: number;
}

export function Navbar({ user, onAuthClick, wishlistCount = 0 }: NavbarProps) {
  async function handleSignOut() {
    await supabase.auth.signOut();
  }

  const avatarUrl = user ? userAvatarUrl(user) : null;
  const displayName = user ? userDisplayName(user) : "";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 shadow-[0_8px_30px_rgba(15,23,42,0.04)] backdrop-blur-xl">
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-indigo-300/70 to-transparent" />
      <div className="relative mx-auto flex h-16 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-4 lg:px-6">
        <Link
          to="/"
          className="group flex min-w-0 shrink-0 items-center gap-2.5 select-none lg:justify-self-start"
        >
          <span className="relative">
            <span className="absolute -inset-1 rounded-2xl bg-indigo-500/10 opacity-0 blur-md transition group-hover:opacity-100" />
            <BrandLogo className="relative h-9 w-9 rounded-xl ring-1 ring-slate-200/80 shadow-sm sm:h-10 sm:w-10" />
          </span>
          <div className="hidden min-w-0 leading-none sm:block">
            <p className="truncate text-[15px] font-extrabold tracking-tight text-slate-950">
              Buy For Me
            </p>
            <p className="mt-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-indigo-500">
              Thailand · Myanmar
            </p>
          </div>
        </Link>

        <AppTabs wishlistCount={wishlistCount} variant="desktop" className="lg:justify-self-center" />

        <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:hidden">
          <ExchangeRateWidget className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/80 px-2.5 py-1 shadow-sm" />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2.5 lg:justify-self-end">
          <ExchangeRateWidget />

          {user ? (
            <div className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/80 p-0.5 pl-1 sm:gap-1.5 sm:pl-1.5">
              <Link
                to="/profile"
                title="Edit profile"
                className="flex min-w-0 items-center gap-1.5 rounded-full py-0.5 pr-1 transition hover:bg-white"
              >
                <span className="hidden max-w-[100px] truncate text-xs font-semibold text-slate-700 xl:inline xl:max-w-[120px]">
                  {displayName}
                </span>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white shadow-sm"
                  />
                ) : (
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-[11px] font-bold text-white shadow-sm">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-700"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onAuthClick}
              className="flex items-center gap-1.5 rounded-full bg-slate-950 px-3 py-2 text-xs font-bold text-white shadow-lg shadow-slate-950/15 transition hover:bg-indigo-600 sm:px-3.5"
            >
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#EA4335" d="M5.26 12c0-.7.12-1.37.32-2H1.28A10.94 10.94 0 001 12c0 1.73.42 3.36 1.16 4.79L5.4 13.9A6.18 6.18 0 015.26 12z" />
                <path fill="#4285F4" d="M12 5.26c1.62 0 3.07.56 4.22 1.48l3.15-3.15A10.96 10.96 0 0012 1C7.7 1 4 3.47 2.18 7.07l4.14 3.22A6.56 6.56 0 0112 5.26z" />
                <path fill="#FBBC05" d="M12 18.74a6.56 6.56 0 01-5.68-3.29L2.18 18.7A10.96 10.96 0 0012 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77A6.56 6.56 0 0112 18.74z" />
                <path fill="#34A853" d="M22.74 12c0-.75-.07-1.47-.2-2.18H12v4.26h5.92a5.29 5.29 0 01-2.21 3.31l3.57 2.77C21.54 18.1 22.74 15.28 22.74 12z" />
              </svg>
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
