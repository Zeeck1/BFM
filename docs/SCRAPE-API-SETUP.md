# BFM Scrape API Setup (Hybrid)

Product search uses a **hybrid** provider:

| Marketplace | Provider | Why |
|-------------|----------|-----|
| **Shopee TH** | [Apify](https://apify.com) (`xtracto/shopee-scraper`) | Scrape.do blocks Shopee without special permission |
| **Lazada TH** | [Scrape.do](https://scrape.do) | Fast proxy; falls back to Apify if Scrape.do fails |

---

## 1. Get your tokens

### Apify (required for Shopee)

1. Sign up at [console.apify.com](https://console.apify.com)
2. Copy your **API token**
3. Add to `.env`:

```env
APIFY_TOKEN=apify_api_...
```

### Scrape.do (recommended for Lazada)

1. Sign up at [scrape.do](https://scrape.do)
2. Copy your **API Token**
3. Add to `.env`:

```env
SCRAPE_DO_TOKEN=your_token_here
```

### Enable hybrid mode

```env
SEARCH_PROVIDER=hybrid
```

---

## 2. Local dev

```powershell
npm run dev
```

Search hits `/api/search` — tokens stay server-side.

---

## 3. Production (Supabase Edge Function)

```powershell
npm run scrape-api:secrets SCRAPE_DO_TOKEN=your_token APIFY_TOKEN=your_apify_token SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
npm run scrape-api:deploy
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Shopee.** needs special permission` | Expected on Scrape.do — use hybrid mode with `APIFY_TOKEN` |
| `APIFY_TOKEN is required` | Add Apify token to `.env` |
| Apify actor failed | Check credits at console.apify.com |
| Empty Lazada results | Verify `SCRAPE_DO_TOKEN` and credits; Apify fallback runs automatically |
| Slow search | Normal — Apify sync runs can take 15–60s per platform |

---

## Optional: Scrape.do-only (Lazada only)

If you only search Lazada and don't need Shopee:

```env
SEARCH_PROVIDER=scrapedo
SCRAPE_DO_TOKEN=your_token
```

Shopee searches will return a clear error directing you to hybrid mode.
