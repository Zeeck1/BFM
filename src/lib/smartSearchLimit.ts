const SMART_SEARCH_USED_KEY = "bfm_smart_search_free_used";

function storageKey(userId: string): string {
  return `${SMART_SEARCH_USED_KEY}:${userId}`;
}

/** One free Smart Search per signed-in account. */
export function hasUsedFreeSmartSearch(userId?: string | null): boolean {
  if (!userId) return false;
  try {
    return localStorage.getItem(storageKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markFreeSmartSearchUsed(userId?: string | null): void {
  if (!userId) return;
  try {
    localStorage.setItem(storageKey(userId), "1");
  } catch {
    /* ignore quota / private mode */
  }
}
