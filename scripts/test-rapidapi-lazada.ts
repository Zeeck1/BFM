// scripts/test-rapidapi-lazada.ts
import "dotenv/config";
import { searchLazadaProducts } from "../server/lazadaProduct.ts";

const query = process.argv[2] ?? "nike";
const t0 = Date.now();
const result = await searchLazadaProducts(query, 1, 12);
console.log(
  JSON.stringify(
    {
      query,
      ms: Date.now() - t0,
      count: result.results.length,
      hasMore: result.has_more,
      blocked: result.blocked ?? false,
      first: result.results[0] ?? null,
    },
    null,
    2,
  ),
);
