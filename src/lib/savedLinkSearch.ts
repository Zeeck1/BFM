import type { SavedLink } from "../types";

export function matchesSavedLinkSearch(item: SavedLink, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const haystack = [item.title, item.url, item.site_name, item.description, item.notes]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(q);
}
