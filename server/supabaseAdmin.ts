// server/supabaseAdmin.ts
// Service-role Supabase client for server-only catalog sync/search.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./config/env.js";

let client: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient | null {
  if (client) return client;
  if (!env.supabaseUrl || !env.supabaseServiceRoleKey) return null;
  client = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return client;
}

export function isSupabaseAdminConfigured(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
}
