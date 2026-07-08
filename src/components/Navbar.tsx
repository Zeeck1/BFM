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
    <header className="sticky top-0 z-40 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-2 px-3 sm:px-4 lg:grid lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-center lg:gap-3 lg:px-6">
        {/* Logo */}
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2 select-none lg:justify-self-start">
          <BrandLogo className="h-8 w-8 rounded-lg" />
          <div className="hidden min-w-0 leading-none sm:block">
            <p className="truncate text-sm font-bold tracking-tight text-slate-900">Buy For Me</p>
            <p className="text-[9px] font-medium uppercase tracking-[0.15em] text-slate-400">
              Myanmar · Thailand
            </p>
          </div>
        </Link>

        {/* Desktop tabs — center on large screens */}
        <AppTabs wishlistCount={wishlistCount} variant="desktop" className="lg:justify-self-center" />

        {/* Right side */}
        <div className="flex shrink-0 items-center justify-end gap-1.5 sm:gap-2 lg:justify-self-end">
          <ExchangeRateWidget />

          {user ? (
            <div className="flex items-center gap-1 sm:gap-1.5">
              <Link
                to="/profile"
                title="Edit profile"
                className="flex min-w-0 items-center gap-1.5 rounded-full py-0.5 pl-1 pr-1.5 transition hover:bg-slate-100"
              >
                <span className="hidden max-w-[100px] truncate text-xs font-semibold text-slate-700 xl:inline xl:max-w-[120px]">
                  {displayName}
                </span>
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt={displayName}
                    referrerPolicy="no-referrer"
                    className="h-7 w-7 shrink-0 rounded-full object-cover ring-2 ring-indigo-100"
                  />
                ) : (
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
              </Link>
              <button
                onClick={handleSignOut}
                title="Sign out"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={onAuthClick}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-700 sm:px-3"
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
