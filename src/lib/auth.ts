// src/lib/auth.ts

import { supabase } from "./supabase";

/** Redirect back to the current page after Google OAuth. */
export async function signInWithGoogle() {
  const redirectTo = `${window.location.origin}${window.location.pathname}`;

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo,
      queryParams: {
        access_type: "offline",
        prompt: "select_account",
      },
    },
  });

  return { error };
}

/** Display name from Supabase user (Google profile or email). */
export function userDisplayName(user: {
  user_metadata?: Record<string, unknown>;
  email?: string | null;
}): string {
  const meta = user.user_metadata ?? {};
  const fullName = meta.full_name ?? meta.name;
  if (typeof fullName === "string" && fullName.trim()) return fullName.trim();
  if (user.email) return user.email.split("@")[0];
  return "User";
}

/** Avatar URL from Google OAuth metadata. */
export function userAvatarUrl(user: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  const url = user.user_metadata?.avatar_url ?? user.user_metadata?.picture;
  return typeof url === "string" && url.trim() ? url : null;
}
