const GUEST_SEARCH_USED_KEY = "bfm_guest_free_search_used";

export function hasGuestUsedFreeSearch(): boolean {
  try {
    return localStorage.getItem(GUEST_SEARCH_USED_KEY) === "1";
  } catch {
    return false;
  }
}

export function markGuestFreeSearchUsed(): void {
  try {
    localStorage.setItem(GUEST_SEARCH_USED_KEY, "1");
  } catch {
    /* ignore quota / private mode */
  }
}

export function clearGuestFreeSearchUsed(): void {
  try {
    localStorage.removeItem(GUEST_SEARCH_USED_KEY);
  } catch {
    /* ignore */
  }
}
