# Buy For Me (BFM)

Cross-border proxy-shopping platform for Myanmar customers buying from **Lazada Thailand**.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript + Tailwind |
| Backend | Node.js + Express + TypeScript |
| Scraping | [Crawlee](https://crawlee.dev) `HttpCrawler` |
| Database | Supabase (cache, orders, exchange rates) |

## Quick start

```powershell
npm install
cp .env.example .env
# Fill in Supabase URL, anon key, and service role key

# Run migrations in Supabase SQL Editor:
#   001_initial_schema.sql
#   002_crawlee_foundation.sql

npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001/api/search

## Search

Lazada TH is scraped via Crawlee:

```
GET https://www.lazada.co.th/catalog/?ajax=true&q=…
```

```
GET /api/search?keyword=nike
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Vite + Express concurrently |
| `npm run dev:server` | Crawlee API only |
| `npm start` | Run compiled server |
