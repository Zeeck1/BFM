// scripts/test-lazada-search.ts
// Quick smoke test for Lazada search (run: npx tsx scripts/test-lazada-search.ts [query])

import { searchLazadaProducts } from "../server/lazadaProduct.ts";

const query = process.argv[2] ?? "bag";

const page1 = await searchLazadaProducts(query, 1, 12);
console.log(
  JSON.stringify(
    {
      query,
      count: page1.results.length,
      hasMore: page1.has_more,
      blocked: page1.blocked ?? false,
      first: page1.results[0] ?? null,
    },
    null,
    2,
  ),
);
