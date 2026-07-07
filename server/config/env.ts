// server/config/env.ts

import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 3001),
  nodeEnv: process.env.NODE_ENV ?? "development",
  /** Optional Cookie from lazada.co.th DevTools — improves price/metadata fetch */
  lazadaCookie: process.env.LAZADA_COOKIE?.trim() ?? "",
};
