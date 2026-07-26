import type { ProductPreview } from "../types";
import { BFM_ERRORS, toBfmUserError } from "./bfmMessages";

export async function fetchPreview(url: string): Promise<ProductPreview> {
  let res: Response;
  try {
    res = await fetch("/api/fetch-preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: AbortSignal.timeout(20_000),
    });
  } catch {
    throw new Error(BFM_ERRORS.previewFailed);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(toBfmUserError((err as { error?: string }).error, BFM_ERRORS.previewFailed));
  }
  return res.json() as Promise<ProductPreview>;
}
