// src/lib/utils.ts
// ──────────────────────────────────────────────────────────────
// Shared utility functions.
// ──────────────────────────────────────────────────────────────

/** Format a number as MMK currency string (e.g. "12,500 MMK"). */
export function formatMMK(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} MMK`;
}

/** Format a number as THB currency string (e.g. "฿ 1,250.00"). */
export function formatTHB(amount: number): string {
  return `฿ ${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Compact sold count for Lazada-style product cards (e.g. "1.2k", "15"). */
export function formatSoldCount(count: number): string {
  if (count >= 1_000_000) {
    const value = count / 1_000_000;
    const rounded = value >= 10 ? Math.round(value).toString() : value.toFixed(1).replace(/\.0$/, "");
    return `${rounded}M`;
  }
  if (count >= 1_000) {
    const value = count / 1_000;
    const rounded = value >= 100 ? Math.round(value).toString() : value.toFixed(1).replace(/\.0$/, "");
    return `${rounded}k`;
  }
  return count.toLocaleString("en-US");
}

/** Map an order status slug to a human-readable label and colour. */
export const ORDER_STATUS_META: Record<
  string,
  { label: string; color: string }
> = {
  pending:          { label: "Pending Payment",     color: "text-yellow-600 bg-yellow-50" },
  paid:             { label: "Paid",                 color: "text-blue-600 bg-blue-50" },
  processing:       { label: "Processing",           color: "text-sky-600 bg-sky-50" },
  purchasing:       { label: "Purchasing in TH",     color: "text-indigo-600 bg-indigo-50" },
  received_at_bkk:  { label: "At Bangkok Warehouse", color: "text-purple-600 bg-purple-50" },
  warehouse_bkk:    { label: "Bangkok Warehouse",    color: "text-violet-600 bg-violet-50" },
  in_transit:       { label: "In Transit to MM",     color: "text-orange-600 bg-orange-50" },
  delivered:        { label: "Delivered",            color: "text-green-600 bg-green-50" },
};

/** Clamp a value between min and max. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** True when the string is a complete http(s) URL with a hostname. */
export function isFetchableUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    const host = parsed.hostname;
    return host.length > 0 && (host.includes(".") || host === "localhost");
  } catch {
    return false;
  }
}
