import { supabase } from "./supabase";
import type { SavedLink } from "../types";

function nanoid(size = 8): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const arr = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(arr, (b) => chars[b % chars.length]).join("");
}

/** Deterministic hash from a sorted list of item IDs. */
async function itemsHash(itemIds: string[]): Promise<string> {
  const sorted = [...itemIds].sort().join(",");
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(sorted));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, 16);
}

export interface SharedList {
  id: string;
  user_id: string;
  items: SavedLink[];
  items_hash?: string;
  owner_name?: string;
  created_at: string;
  expires_at: string;
}

const EXPIRY_DAYS = 2;

function expiresAt(): string {
  const d = new Date();
  d.setDate(d.getDate() + EXPIRY_DAYS);
  return d.toISOString();
}

function toSharedList(row: Record<string, unknown>): SharedList {
  return { ...row, items: (row.items ?? []) as SavedLink[] } as SharedList;
}

/**
 * Find an existing non-expired shared list with the exact same items for this user,
 * or create a new one if none exists.
 */
export async function getOrCreateSharedList(
  userId: string,
  ownerName: string,
  items: SavedLink[],
): Promise<SharedList | null> {
  const hash = await itemsHash(items.map((i) => i.id));

  // Look for an existing non-expired list with the same hash
  const { data: existing } = await supabase
    .from("shared_lists")
    .select("*")
    .eq("user_id", userId)
    .eq("items_hash", hash)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) {
    return toSharedList(existing as Record<string, unknown>);
  }

  // None found — create new
  const id = nanoid();
  const snapshot = items.map((item) => toSnapshot(item));

  const { data, error } = await supabase
    .from("shared_lists")
    .insert({
      id,
      user_id: userId,
      items: snapshot,
      items_hash: hash,
      owner_name: ownerName,
      expires_at: expiresAt(),
    })
    .select()
    .single();

  if (error) {
    console.error("[shareList] insert failed:", error.message);
    return null;
  }

  return toSharedList(data as Record<string, unknown>);
}

export async function fetchSharedList(id: string): Promise<SharedList | null> {
  const { data, error } = await supabase
    .from("shared_lists")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) return null;

  return toSharedList(data as Record<string, unknown>);
}

function toSnapshot(item: SavedLink) {
  return {
    id: item.id,
    url: item.url,
    title: item.title ?? null,
    image_url: item.image_url ?? null,
    price_thb: item.price_thb ?? null,
    price_mmk: item.price_mmk ?? null,
    site_name: item.site_name ?? null,
    notes: item.notes ?? null,
  };
}

/**
 * Push fresh saved-link data into every shared list that already contains this item.
 */
export async function syncSavedItemInSharedLists(
  userId: string,
  item: SavedLink,
): Promise<void> {
  const { data: lists, error } = await supabase
    .from("shared_lists")
    .select("id, items")
    .eq("user_id", userId);

  if (error || !lists?.length) return;

  const snapshot = toSnapshot(item);

  for (const list of lists) {
    const items = list.items as SavedLink[];
    const index = items.findIndex((entry) => entry.id === item.id);
    if (index === -1) continue;

    const nextItems = [...items];
    nextItems[index] = snapshot as SavedLink;

    const { error: updateError } = await supabase
      .from("shared_lists")
      .update({ items: nextItems })
      .eq("id", list.id);

    if (updateError) {
      console.error(`[shareList] sync item ${item.id} in ${list.id} failed:`, updateError.message);
    }
  }
}

/**
 * Live-remove items from all shared lists that contain them.
 * - If items remain → update the JSONB snapshot + clear the hash (so dedup creates a fresh one).
 * - If the list becomes empty → delete it entirely.
 */
export async function removeItemsFromSharedLists(
  userId: string,
  removedItemIds: string[],
): Promise<void> {
  if (removedItemIds.length === 0) return;

  const removeSet = new Set(removedItemIds);

  const { data: lists, error } = await supabase
    .from("shared_lists")
    .select("id, items")
    .eq("user_id", userId);

  if (error || !lists?.length) return;

  const toUpdate: { id: string; items: unknown[] }[] = [];
  const toDelete: string[] = [];

  for (const list of lists) {
    const items = list.items as { id?: string }[];
    const hasAffected = items.some((item) => item.id && removeSet.has(item.id));
    if (!hasAffected) continue;

    const remaining = items.filter((item) => !item.id || !removeSet.has(item.id));
    if (remaining.length === 0) {
      toDelete.push(list.id as string);
    } else {
      toUpdate.push({ id: list.id as string, items: remaining });
    }
  }

  for (const { id, items } of toUpdate) {
    const { error: e } = await supabase
      .from("shared_lists")
      .update({ items, items_hash: null })
      .eq("id", id);
    if (e) console.error(`[shareList] update ${id} failed:`, e.message);
  }

  if (toDelete.length > 0) {
    const { error: e } = await supabase
      .from("shared_lists")
      .delete()
      .in("id", toDelete);
    if (e) console.error("[shareList] delete empty lists failed:", e.message);
  }
}

export function shareUrl(id: string): string {
  return `${window.location.origin}/s/${id}`;
}

export function isExpired(list: SharedList): boolean {
  return new Date(list.expires_at) <= new Date();
}

export function timeRemaining(list: SharedList): string {
  const ms = new Date(list.expires_at).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / 3_600_000);
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return remainingHours > 0 ? `${days}d ${remainingHours}h left` : `${days}d left`;
  }
  if (hours > 0) return `${hours}h left`;
  const mins = Math.ceil(ms / 60_000);
  return `${mins}m left`;
}
