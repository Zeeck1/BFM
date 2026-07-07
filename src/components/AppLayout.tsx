import { Outlet } from "react-router-dom";
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
      <main className="pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        <Outlet context={{ user, onSignIn } satisfies AppOutletContext} />
      </main>
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
