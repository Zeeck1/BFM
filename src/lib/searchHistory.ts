import { supabase } from "./supabase";

/** Records a successful signed-in Lazada search without blocking search results. */
export async function recordSearchHistory(userId: string, query: string): Promise<void> {
  const cleaned = query.trim().slice(0, 120);
  if (!cleaned) return;

  const { error } = await supabase.from("search_events").insert({
    user_id: userId,
    query: cleaned,
  });
  if (error) {
    // The migration can be deployed after the client; search itself must keep working.
    console.warn("[searchHistory] Could not record search:", error.message);
  }
}
