import type { ProductPreview } from "../types";

export async function fetchPreview(url: string): Promise<ProductPreview> {
  const res = await fetch("/api/fetch-preview", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error ?? "Failed to fetch preview");
  }
  return res.json() as Promise<ProductPreview>;
}
