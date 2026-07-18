import type { AdminSearchEvent } from "./admin";
import type { SavedLink } from "../types";

export interface ChartRankItem {
  label: string;
  count: number;
  hint?: string;
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}

export function buildTopSearchChartItems(events: AdminSearchEvent[], limit = 5): ChartRankItem[] {
  const grouped = events.reduce<
    Record<string, { label: string; count: number; users: Set<string> }>
  >((groups, event) => {
    const query = event.query.trim();
    if (!query) return groups;

    const key = normalizeKey(query);
    const existing = groups[key];
    if (existing) {
      existing.count += 1;
      existing.users.add(event.user_id);
      return groups;
    }

    groups[key] = { label: query, count: 1, users: new Set([event.user_id]) };
    return groups;
  }, {});

  return Object.values(grouped)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((item) => ({
      label: item.label,
      count: item.count,
      hint: `${item.users.size} user${item.users.size === 1 ? "" : "s"}`,
    }));
}

export function buildTopWishlistChartItems(links: SavedLink[], limit = 5): ChartRankItem[] {
  const grouped = links.reduce<
    Record<string, { label: string; count: number; site?: string; users: Set<string> }>
  >((groups, link) => {
    const label = link.title?.trim() || link.url.trim();
    if (!label) return groups;

    const key = link.url.trim() ? normalizeKey(link.url) : normalizeKey(label);
    const existing = groups[key];
    if (existing) {
      existing.count += 1;
      if (link.user_id) existing.users.add(link.user_id);
      return groups;
    }

    groups[key] = {
      label,
      count: 1,
      site: link.site_name ?? undefined,
      users: new Set(link.user_id ? [link.user_id] : []),
    };
    return groups;
  }, {});

  return Object.values(grouped)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, limit)
    .map((item) => ({
      label: item.label,
      count: item.count,
      hint: [item.site, `${item.users.size} user${item.users.size === 1 ? "" : "s"}`]
        .filter(Boolean)
        .join(" · "),
    }));
}
