// scripts/test-lazada-seller-products.ts
// Test Lazada Seller In-house APP → GetProducts (/products/get).
//
// This returns products from an AUTHORIZED SELLER SHOP only — not the full marketplace.
//
// Setup (.env):
//   LAZADA_SELLER_APP_KEY=...
//   LAZADA_SELLER_APP_SECRET=...
//   LAZADA_SELLER_CALLBACK_URL=https://buyforme.world/callback
//   LAZADA_SELLER_ACCESS_TOKEN=...   (after OAuth)
//
// Steps:
//   1) npx tsx scripts/test-lazada-seller-products.ts
//      → prints authorize URL (open as the Lazada seller)
//   2) After redirect, copy ?code=... from the callback URL
//   3) npx tsx scripts/test-lazada-seller-products.ts --code=THE_CODE
//      → exchanges code for access_token and calls GetProducts
//   4) Or set LAZADA_SELLER_ACCESS_TOKEN and re-run step 1 to list products

import { createHmac } from "node:crypto";
import "dotenv/config";

const APP_KEY = process.env.LAZADA_SELLER_APP_KEY?.trim() ?? "";
const APP_SECRET = process.env.LAZADA_SELLER_APP_SECRET?.trim() ?? "";
const CALLBACK =
  process.env.LAZADA_SELLER_CALLBACK_URL?.trim() ||
  "https://buyforme.world/callback";
const BASE =
  process.env.LAZADA_SELLER_BASE_URL?.trim() || "https://api.lazada.co.th/rest";
const AUTH_BASE = "https://auth.lazada.com/rest";

function sign(apiPath: string, params: Record<string, string>, secret: string): string {
  const keys = Object.keys(params).sort();
  let payload = apiPath;
  for (const key of keys) payload += `${key}${params[key]}`;
  return createHmac("sha256", secret).update(payload, "utf8").digest("hex").toUpperCase();
}

function authUrl(): string {
  const u = new URL("https://auth.lazada.com/oauth/authorize");
  u.searchParams.set("response_type", "code");
  u.searchParams.set("force_auth", "true");
  u.searchParams.set("redirect_uri", CALLBACK);
  u.searchParams.set("client_id", APP_KEY);
  return u.toString();
}

async function createAccessToken(code: string): Promise<{
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  raw: unknown;
}> {
  const path = "/auth/token/create";
  const params: Record<string, string> = {
    app_key: APP_KEY,
    timestamp: String(Date.now()),
    sign_method: "sha256",
    code,
  };
  params.sign = sign(path, params, APP_SECRET);

  const url = new URL(`${AUTH_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  const raw = await res.json().catch(async () => ({ text: await res.text() }));
  const row = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return {
    access_token: typeof row.access_token === "string" ? row.access_token : undefined,
    refresh_token: typeof row.refresh_token === "string" ? row.refresh_token : undefined,
    expires_in: typeof row.expires_in === "number" ? row.expires_in : undefined,
    raw,
  };
}

async function getProducts(accessToken: string, page = 1, limit = 20) {
  const path = "/products/get";
  const params: Record<string, string> = {
    app_key: APP_KEY,
    access_token: accessToken,
    timestamp: String(Date.now()),
    sign_method: "sha256",
    filter: "all",
    offset: String(Math.max(0, (page - 1) * limit)),
    limit: String(limit),
  };
  params.sign = sign(path, params, APP_SECRET);

  const url = new URL(`${BASE.replace(/\/$/, "")}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(25_000),
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Non-JSON response (${res.status}): ${text.slice(0, 240)}`);
  }
  return { status: res.status, json };
}

function argValue(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : undefined;
}

async function main() {
  if (!APP_KEY || !APP_SECRET) {
    console.error(
      "Missing LAZADA_SELLER_APP_KEY / LAZADA_SELLER_APP_SECRET in .env\n" +
        "Add your Seller In-house APP credentials from isvconsole.lazada.com",
    );
    process.exit(1);
  }

  console.log("BFM Lazada Seller GetProducts test");
  console.log("App key:", APP_KEY);
  console.log("Callback:", CALLBACK);
  console.log("API base:", BASE);
  console.log(
    "\nNOTE: This API returns products from the AUTHORIZED SELLER SHOP only,\n" +
      "not every product on Lazada marketplace.\n",
  );

  const code = argValue("code");
  let accessToken = process.env.LAZADA_SELLER_ACCESS_TOKEN?.trim() ?? "";

  if (code) {
    console.log("Exchanging OAuth code for access_token…");
    const token = await createAccessToken(code);
    console.log(JSON.stringify(token.raw, null, 2));
    if (!token.access_token) {
      console.error("\nNo access_token in response. Check app key/secret/callback/code.");
      process.exit(1);
    }
    accessToken = token.access_token;
    console.log("\nSave this in .env:");
    console.log(`LAZADA_SELLER_ACCESS_TOKEN=${accessToken}`);
    if (token.refresh_token) {
      console.log(`LAZADA_SELLER_REFRESH_TOKEN=${token.refresh_token}`);
    }
  }

  if (!accessToken) {
    console.log("No access token yet. Authorize a Lazada seller account:\n");
    console.log(authUrl());
    console.log(
      "\nAfter login, you will be redirected to your callback URL with ?code=...\n" +
        "Then run:\n" +
        "  npx tsx scripts/test-lazada-seller-products.ts --code=PASTE_CODE_HERE\n" +
        "Do NOT put that short ?code= into LAZADA_SELLER_ACCESS_TOKEN.\n" +
        "Save only the long access_token printed after the exchange.\n",
    );
    console.log(
      "Tip: you can also use ISV Console → API Explorer with a Loan Test Account\n" +
        "to call /products/get without wiring OAuth first.",
    );
    return;
  }

  // OAuth codes are short; real Lazada access tokens are much longer.
  if (accessToken.length < 40) {
    console.error(
      "LAZADA_SELLER_ACCESS_TOKEN looks like an OAuth code (too short), not an access token.\n" +
        "Clear it, open the authorize URL, copy ?code= from the callback, then run:\n" +
        "  npx tsx scripts/test-lazada-seller-products.ts --code=PASTE_CODE_HERE\n" +
        "Then put the printed access_token into .env.",
    );
    process.exit(1);
  }

  console.log("Calling /products/get …");
  const { status, json } = await getProducts(accessToken, 1, 20);
  console.log("HTTP", status);
  console.log(JSON.stringify(json, null, 2));

  const root = json && typeof json === "object" ? (json as Record<string, unknown>) : {};
  const data = root.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : {};
  const products = Array.isArray(data.products) ? data.products : [];
  console.log(`\nParsed products on this page: ${products.length}`);
  if (products[0] && typeof products[0] === "object") {
    const p = products[0] as Record<string, unknown>;
    console.log("First item sample keys:", Object.keys(p).slice(0, 20).join(", "));
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
