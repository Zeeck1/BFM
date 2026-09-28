import { Link, Outlet, useLocation } from "react-router-dom";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { SavedItemsProvider, useSavedItems } from "../contexts/SavedItemsProvider";
import { AppTabs } from "./AppTabs";
import { BrandLogo } from "./BrandLogo";
import { Navbar } from "./Navbar";
import { LinkSearchPage } from "../pages/LinkSearchPage";
import { AppShellContext, type AppOutletContext } from "./appShell";

export type { AppOutletContext };

/** Paste your social profile URLs here. */
const FACEBOOK_URL = "https://www.facebook.com/profile.php?id=61590415064744";
const TIKTOK_URL = "https://www.tiktok.com/@buyformeworld";

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M13.5 21v-7.2h2.4l.36-2.8H13.5V9.2c0-.8.22-1.35 1.38-1.35H16.4V5.35C16.08 5.3 15.05 5.2 13.85 5.2c-2.5 0-4.2 1.53-4.2 4.33v1.47H7.4v2.8h2.25V21H13.5Z" />
    </svg>
  );
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M16.6 5.82A4.83 4.83 0 0 1 19.4 5.2V8.3a8.2 8.2 0 0 1-2.8.5 4.83 4.83 0 0 1-4.1-2.17v7.62a5.25 5.25 0 1 1-5.25-5.25c.27 0 .53.03.79.07v2.97a2.3 2.3 0 1 0 1.51 2.16V3.5h2.95a4.84 4.84 0 0 0 4.1 2.32Z" />
    </svg>
  );
}

const FOOTER_LINKS = [
  { to: "/our-service", label: "Our Service" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
] as const;

interface AppLayoutProps {
  user: SupabaseUser | null;
  onSignIn: () => void;
}

function AppLayoutShell({ user, onSignIn }: AppLayoutProps) {
  const { items } = useSavedItems();
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const outletContext = { user, onSignIn } satisfies AppOutletContext;

  return (
    <AppShellContext.Provider value={outletContext}>
      <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 antialiased">
        <Navbar user={user} onAuthClick={onSignIn} wishlistCount={items.length} />
        <main>
          <div className={isHome ? "" : "hidden"} aria-hidden={!isHome}>
            <LinkSearchPage />
          </div>
          {!isHome && <Outlet context={outletContext} />}
        </main>
        <footer className="relative overflow-hidden border-t border-slate-800 bg-slate-950 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-10 text-slate-300 lg:pb-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(99,102,241,0.18),_transparent_55%)]" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent" />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between lg:gap-12">
              <div className="max-w-sm">
                <Link to="/" className="inline-flex items-center gap-3">
                  <BrandLogo className="h-11 w-11 rounded-xl ring-1 ring-white/10" />
                  <div>
                    <p className="text-base font-bold tracking-tight text-white">Buy For Me</p>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-indigo-300">
                      Thailand · Myanmar
                    </p>
                  </div>
                </Link>
                <p className="mt-4 text-sm leading-relaxed text-slate-400">
                  Shop from Thailand, save product links, and order through Messenger. We handle buying and delivery support.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-8 sm:grid-cols-[auto_auto] sm:gap-16">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Company
                  </p>
                  <nav className="mt-3 flex flex-col gap-2.5">
                    {FOOTER_LINKS.map((item) => (
                      <Link
                        key={item.to}
                        to={item.to}
                        className="text-sm font-medium text-slate-300 transition hover:text-white"
                      >
                        {item.label}
                      </Link>
                    ))}
                  </nav>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    Follow us
                  </p>
                  <div className="mt-3 flex items-center gap-2.5">
                    <a
                      href={FACEBOOK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="Facebook"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:border-[#1877F2]/40 hover:bg-[#1877F2] hover:shadow-lg hover:shadow-[#1877F2]/25"
                    >
                      <FacebookIcon className="h-5 w-5" />
                    </a>
                    <a
                      href={TIKTOK_URL}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label="TikTok"
                      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white transition hover:border-white/30 hover:bg-white hover:text-slate-950 hover:shadow-lg hover:shadow-white/10"
                    >
                      <TikTokIcon className="h-5 w-5" />
                    </a>
                  </div>
                  <p className="mt-3 max-w-[11rem] text-xs leading-relaxed text-slate-500">
                    Updates, offers, and shopping tips from BFM.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/10 py-5 text-center sm:flex-row sm:text-left">
              <p className="text-xs text-slate-500">
                © {new Date().getFullYear()} Buy For Me. All rights reserved.
              </p>
              <p className="text-xs text-slate-500">Thailand → Myanmar shopping service</p>
            </div>
          </div>
        </footer>
        <AppTabs wishlistCount={items.length} variant="mobile" />
      </div>
    </AppShellContext.Provider>
  );
}

export function AppLayout({ user, onSignIn }: AppLayoutProps) {
  return (
    <SavedItemsProvider userId={user?.id ?? null}>
      <AppLayoutShell user={user} onSignIn={onSignIn} />
    </SavedItemsProvider>
  );
}
