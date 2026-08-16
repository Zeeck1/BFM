import { createContext, useContext } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export interface AppOutletContext {
  user: SupabaseUser | null;
  onSignIn: () => void;
}

export const AppShellContext = createContext<AppOutletContext | null>(null);

export function useAppShell(): AppOutletContext {
  const ctx = useContext(AppShellContext);
  if (!ctx) {
    throw new Error("useAppShell must be used inside AppLayout");
  }
  return ctx;
}
