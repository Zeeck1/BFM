// src/types/index.ts

export type OrderStatus =
  | "pending"
  | "paid"
  | "processing"
  | "purchasing"
  | "received_at_bkk"
  | "warehouse_bkk"
  | "in_transit"
  | "delivered";

/** Metadata returned by the server after fetching a URL. */
export interface ProductPreview {
  url: string;
  title?: string;
  description?: string;
  image_url?: string;
  price_thb?: number;
  site_name?: string;
  shop_name?: string;
  review_count?: number;
  average_score?: number;
  sold_count?: number;
  product_colors?: string[];
  product_sizes?: string[];
}

export interface ProductSearchResult extends ProductPreview {
  source_id?: string;
}

/** A saved link row from Supabase. */
export interface SavedLink {
  id: string;
  user_id?: string;
  url: string;
  title?: string;
  description?: string;
  image_url?: string;
  price_thb?: number;
  price_mmk?: number;
  site_name?: string;
  shop_name?: string;
  review_count?: number;
  average_score?: number;
  sold_count?: number;
  product_colors?: string[];
  product_sizes?: string[];
  notes?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  email?: string | null;
  username?: string | null;
  role?: "admin" | "user";
  full_name: string | null;
  phone: string | null;
  address: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  user_id: string;
  product_title: string;
  original_url: string;
  platform?: string;
  price_thb: number;
  price_mmk: number;
  cargo_fee_mmk: number;
  status: OrderStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}
