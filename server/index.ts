// server/index.ts
// BFM Node.js API entry — Express backend (link preview + metadata).

import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { isLazadaAffiliateConfigured } from "./lazadaAffiliate.js";
import {
  getLazadaCatalogStats,
  syncExpandedFeedToDatabase,
} from "./lazadaCatalog.js";
import { isSupabaseAdminConfigured } from "./supabaseAdmin.js";

const app = createApp();

let liveSyncTimer: ReturnType<typeof setInterval> | null = null;

async function shouldSkipBootSync(): Promise<{ skip: boolean; reason: string }> {
  const stats = await getLazadaCatalogStats();
  if (stats.product_count < 100) {
    return { skip: false, reason: "catalog empty or small" };
  }
  if (stats.last_sync?.status !== "success" || !stats.last_sync.finished_at) {
    return { skip: false, reason: "no successful sync yet" };
  }
  const ageMs = Date.now() - new Date(stats.last_sync.finished_at).getTime();
  // Reuse live-sync interval as freshness window (fallback 20 minutes).
  const ttlMs = Math.max(env.lazadaFeedLiveSyncMinutes || 20, 1) * 60_000;
  if (ageMs < ttlMs) {
    const ageMin = Math.max(1, Math.round(ageMs / 60_000));
    return {
      skip: true,
      reason: `DB already has ${stats.product_count} products (synced ${ageMin}m ago)`,
    };
  }
  return { skip: false, reason: "last sync is stale" };
}

async function syncAffiliateCatalogToDatabase(
  reason: "boot" | "live" | string,
  options?: { force?: boolean },
) {
  if (!isLazadaAffiliateConfigured()) return;
  if (!isSupabaseAdminConfigured()) {
    console.warn("[BFM] Skipping DB sync — SUPABASE_SERVICE_ROLE_KEY not set");
    return;
  }

  if (reason === "boot" && !options?.force) {
    const check = await shouldSkipBootSync();
    if (check.skip) {
      console.log(`[BFM] Skipping boot sync — ${check.reason}`);
      console.log("[BFM] Use Feed → Sync from API for a manual refresh");
      return;
    }
  }

  console.log(`[BFM] Affiliate catalog sync starting (${reason})…`);
  const sync = await syncExpandedFeedToDatabase();
  if (!sync.ok) {
    console.warn(`[BFM] DB sync failed (${reason}):`, sync.error_message);
    return;
  }
  console.log(
    `[BFM] Database ready: ${sync.products_upserted} affiliate products (full API data in raw)`,
  );
}

function startLiveAffiliateSync() {
  const minutes = env.lazadaFeedLiveSyncMinutes;
  if (minutes <= 0) {
    console.log("[BFM] Live Affiliate sync disabled (LAZADA_FEED_LIVE_SYNC_MINUTES=0)");
    return;
  }
  if (liveSyncTimer) clearInterval(liveSyncTimer);
  const ms = minutes * 60_000;
  liveSyncTimer = setInterval(() => {
    void syncAffiliateCatalogToDatabase(`live every ${minutes}m`);
  }, ms);
  console.log(`[BFM] Live Affiliate sync enabled: every ${minutes} minute(s)`);
}

const server = app.listen(env.port, () => {
  console.log(`[BFM] API listening on http://localhost:${env.port}`);
  console.log(`[BFM] Vite dev proxy: http://localhost:5173 → http://localhost:${env.port}/api`);
  if (isLazadaAffiliateConfigured()) {
    void syncAffiliateCatalogToDatabase("boot").finally(() => {
      startLiveAffiliateSync();
    });
  }
});

server.on("error", (err: NodeJS.ErrnoException) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[BFM] Port ${env.port} is already in use. Stop the old server:\n` +
        `  netstat -ano | findstr :${env.port}\n` +
        `  taskkill /PID <pid> /F\n` +
        `Then run npm run dev again.`,
    );
    process.exit(1);
  }
  throw err;
});
