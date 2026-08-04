import type { AdminSearchEvent } from "./admin";
import type { SavedLink } from "../types";
import { formatSearchHistoryQuery, parseSearchHistoryQuery } from "./searchHistory";

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
    const parsed = parseSearchHistoryQuery(event.query);
    if (!parsed.display) return groups;

    // Group by mode + term so legacy Affiliate:/Lazada: merge with Search:/Smart Search:
    const key = `${parsed.mode}:${normalizeKey(parsed.term)}`;
    const existing = groups[key];
    if (existing) {
      existing.count += 1;
      existing.users.add(event.user_id);
      return groups;
    }

    groups[key] = {
      label: parsed.display,
      count: 1,
      users: new Set([event.user_id]),
    };
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

export function buildWishlistSiteChartItems(links: SavedLink[], limit = 6): ChartRankItem[] {
  const grouped = links.reduce<Record<string, number>>((groups, link) => {
    const site = link.site_name?.trim() || "Unknown";
    groups[site] = (groups[site] ?? 0) + 1;
    return groups;
  }, {});

  return Object.entries(grouped)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([label, count]) => ({ label, count }));
}

export function summarizeSearchEvents(events: AdminSearchEvent[]) {
  const uniqueQueries = new Set(
    events
      .map((event) => {
        const parsed = parseSearchHistoryQuery(event.query);
        return parsed.display ? `${parsed.mode}:${normalizeKey(parsed.term)}` : "";
      })
      .filter(Boolean),
  );
  const uniqueUsers = new Set(events.map((event) => event.user_id).filter(Boolean));
  const top = buildTopSearchChartItems(events, 1)[0];
  return {
    total: events.length,
    uniqueQueries: uniqueQueries.size,
    uniqueUsers: uniqueUsers.size,
    topQuery: top?.label ?? (events[0] ? formatSearchHistoryQuery(events[0].query) : null),
    topCount: top?.count ?? 0,
  };
}

export function summarizeWishlistItems(links: SavedLink[]) {
  const uniqueProducts = new Set(
    links
      .map((link) =>
        link.url.trim() ? normalizeKey(link.url) : normalizeKey(link.title ?? ""),
      )
      .filter(Boolean),
  );
  const uniqueUsers = new Set(links.map((link) => link.user_id).filter(Boolean));
  const withPrice = links.filter((link) => link.price_thb != null || link.price_mmk != null).length;
  const top = buildTopWishlistChartItems(links, 1)[0];
  return {
    total: links.length,
    uniqueProducts: uniqueProducts.size,
    uniqueUsers: uniqueUsers.size,
    withPrice,
    topProduct: top?.label ?? null,
    topCount: top?.count ?? 0,
  };
}
