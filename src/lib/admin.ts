import { supabase } from "./supabase";
import type { OrderStatus, SavedLink } from "../types";

const PAGE_SIZE = 100;

export interface AdminProfile {
  id: string;
  email?: string | null;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  phone?: string | null;
  address?: string | null;
  role: "admin" | "user";
  created_at: string;
}

export interface AdminOrder {
  id: string;
  user_id: string;
  product_title: string;
  original_url: string;
  platform?: string | null;
  price_thb: number;
  price_mmk: number;
  cargo_fee_mmk: number;
  status: OrderStatus;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AdminSharedList {
  id: string;
  user_id: string;
  owner_name?: string | null;
  items: unknown[];
  created_at: string;
  expires_at?: string | null;
}

export interface AdminSearchEvent {
  id: string;
  user_id: string;
  query: string;
  created_at: string;
}

function asError(error: { message?: string } | null, fallback: string): Error {
  return new Error(error?.message || fallback);
}

export async function isCurrentUserAdmin(userId: string): Promise<boolean> {
  const { data: isAdmin, error: adminCheckError } = await supabase.rpc("is_admin");
  if (!adminCheckError) return isAdmin === true;

  const { data, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();
  if (error) return false;
  return data?.role === "admin";
}

export async function loadAdminDashboard() {
  const [profilesWithAvatarResult, savedLinksResult, sharedListsResult, ordersResult, searchEventsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id,email,username,full_name,avatar_url,phone,address,role,created_at")
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1),
    supabase
      .from("saved_links")
      .select("id,user_id,url,title,description,image_url,price_thb,price_mmk,site_name,shop_name,review_count,average_score,sold_count,product_colors,product_sizes,notes,created_at")
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1),
    supabase
      .from("shared_lists")
      .select("id,user_id,owner_name,items,created_at,expires_at")
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1),
    supabase
      .from("orders")
      .select("id,user_id,product_title,original_url,platform,price_thb,price_mmk,cargo_fee_mmk,status,notes,created_at,updated_at")
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1),
    supabase
      .from("search_events")
      .select("id,user_id,query,created_at")
      .order("created_at", { ascending: false })
      .range(0, PAGE_SIZE - 1),
  ]);

  // Migration 020 adds avatar_url. Keep the Admin Dashboard usable for
  // environments where that migration has not been applied yet.
  const profilesResult = profilesWithAvatarResult.error?.code === "42703"
    ? await supabase
        .from("profiles")
        .select("id,email,username,full_name,phone,address,role,created_at")
        .order("created_at", { ascending: false })
        .range(0, PAGE_SIZE - 1)
    : profilesWithAvatarResult;

  const firstError =
    profilesResult.error || savedLinksResult.error || sharedListsResult.error || ordersResult.error || searchEventsResult.error;
  if (firstError) throw asError(firstError, "Could not load admin data.");

  return {
    profiles: (profilesResult.data ?? []) as AdminProfile[],
    savedLinks: (savedLinksResult.data ?? []) as SavedLink[],
    sharedLists: (sharedListsResult.data ?? []) as AdminSharedList[],
    orders: (ordersResult.data ?? []) as AdminOrder[],
    searchEvents: (searchEventsResult.data ?? []) as AdminSearchEvent[],
  };
}

export async function updateAdminProfile(
  id: string,
  patch: Pick<AdminProfile, "full_name" | "phone" | "address" | "role">,
) {
  const { error } = await supabase.from("profiles").update(patch).eq("id", id);
  if (error) throw asError(error, "Could not update user.");
}

export async function updateAdminSavedLink(
  id: string,
  patch: Pick<SavedLink, "title" | "price_thb" | "price_mmk" | "notes">,
) {
  const { error } = await supabase.from("saved_links").update(patch).eq("id", id);
  if (error) throw asError(error, "Could not update wishlist product.");
}

export async function updateAdminOrder(
  id: string,
  patch: Pick<AdminOrder, "status" | "price_thb" | "price_mmk" | "cargo_fee_mmk" | "notes">,
) {
  const { error } = await supabase.from("orders").update(patch).eq("id", id);
  if (error) throw asError(error, "Could not update order.");
}

export async function updateAdminSharedList(id: string, expires_at: string) {
  const { error } = await supabase.from("shared_lists").update({ expires_at }).eq("id", id);
  if (error) throw asError(error, "Could not update shared list.");
}
