import { Link, Outlet } from "react-router-dom";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { SavedItemsProvider, useSavedItems } from "../contexts/SavedItemsProvider";
import { AppTabs } from "./AppTabs";
import { Navbar } from "./Navbar";

export interface AppOutletContext {
  user: SupabaseUser | null;
  onSignIn: () => void;
}

interface AppLayoutProps {
  user: SupabaseUser | null;
  onSignIn: () => void;
}

function AppLayoutShell({ user, onSignIn }: AppLayoutProps) {
  const { items } = useSavedItems();

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900 antialiased">
      <Navbar user={user} onAuthClick={onSignIn} wishlistCount={items.length} />
      <main>
        <Outlet context={{ user, onSignIn } satisfies AppOutletContext} />
      </main>
      <footer className="border-t border-slate-200 bg-white px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 lg:py-5">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 text-center text-xs text-slate-500 sm:flex-row sm:text-left">
          <p>© {new Date().getFullYear()} Buy For Me. Thailand → Myanmar shopping service.</p>
          <div className="flex items-center gap-4">
            <Link to="/our-service" className="transition hover:text-indigo-600">
              Our Service
            </Link>
            <Link to="/privacy" className="font-semibold transition hover:text-indigo-600">
              Privacy Policy
            </Link>
          </div>
        </div>
      </footer>
      <AppTabs wishlistCount={items.length} variant="mobile" />
    </div>
  );
}

export function AppLayout({ user, onSignIn }: AppLayoutProps) {
  return (
    <SavedItemsProvider userId={user?.id ?? null}>
      <AppLayoutShell user={user} onSignIn={onSignIn} />
    </SavedItemsProvider>
  );
}
