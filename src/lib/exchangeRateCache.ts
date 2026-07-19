// src/lib/exchangeRateCache.ts
// Module-level cache: one DB query per browser session, reused everywhere.

import { supabase } from "./supabase";

const FALLBACK = 110;
const TTL_MS = 10 * 60 * 1000; // 10 minutes

let cached: number = FALLBACK;
let fetchedAt: number = 0;
let inFlight: Promise<number> | null = null;

export const EXCHANGE_RATE_UPDATED_EVENT = "bfm:exchange-rate-updated";

export async function getExchangeRate(): Promise<number> {
  const now = Date.now();
  if (now - fetchedAt < TTL_MS) return cached;
  if (inFlight) return inFlight;

  inFlight = supabase
    .from("exchange_rates")
    .select("thb_to_mmk")
    .order("id", { ascending: false })
    .limit(1)
    .single()
    .then(({ data }) => {
      cached = data?.thb_to_mmk ?? FALLBACK;
      fetchedAt = Date.now();
      inFlight = null;
      return cached;
    })
    .then(undefined, () => {
      inFlight = null;
      return cached;
    }) as Promise<number>;

  return inFlight;
}

export function getCachedRate(): number {
  return cached;
}

export function setCachedExchangeRate(rate: number): void {
  cached = rate;
  fetchedAt = Date.now();
  window.dispatchEvent(new CustomEvent(EXCHANGE_RATE_UPDATED_EVENT, { detail: rate }));
}
