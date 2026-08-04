import { supabase } from "./supabase";

export type SearchHistoryMode = "search" | "smart" | "unknown";

export interface ParsedSearchHistoryQuery {
  mode: SearchHistoryMode;
  /** User-facing mode label: Search | Smart Search */
  modeLabel: string;
  /** Keyword without the mode prefix */
  term: string;
  /** Display string for admin lists/charts */
  display: string;
}

/**
 * Normalize stored search_events.query into Search / Smart Search labels.
 * Accepts current and legacy prefixes (Affiliate:, Lazada:).
 */
export function parseSearchHistoryQuery(raw: string): ParsedSearchHistoryQuery {
  const query = raw.trim();
  if (!query) {
    return { mode: "unknown", modeLabel: "Search", term: "", display: "" };
  }

  const patterns: Array<{ re: RegExp; mode: SearchHistoryMode; modeLabel: string }> = [
    { re: /^(smart\s*search|lazada)\s*:\s*/i, mode: "smart", modeLabel: "Smart Search" },
    { re: /^(search|affiliate)\s*:\s*/i, mode: "search", modeLabel: "Search" },
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern.re);
    if (match) {
      const term = query.slice(match[0].length).trim() || query;
      return {
        mode: pattern.mode,
        modeLabel: pattern.modeLabel,
        term,
        display: `${pattern.modeLabel}: ${term}`,
      };
    }
  }

  return {
    mode: "unknown",
    modeLabel: "Search",
    term: query,
    display: query,
  };
}

export function formatSearchHistoryQuery(raw: string): string {
  return parseSearchHistoryQuery(raw).display;
}

/** Records a successful signed-in product search without blocking search results. */
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
