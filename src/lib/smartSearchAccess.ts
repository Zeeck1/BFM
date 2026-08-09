import { supabase } from "./supabase";

/** True when signed-in user is admin or was granted Smart Search by an admin. */
export async function fetchCanUseSmartSearch(): Promise<boolean> {
  const { data, error } = await supabase.rpc("can_use_smart_search");
  if (!error) return data === true;

  // Fallback if migration not applied yet: only treat profiles.role admin as allowed.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, smart_search_enabled")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return false;
  if (profile.role === "admin") return true;
  return profile.smart_search_enabled === true;
}
