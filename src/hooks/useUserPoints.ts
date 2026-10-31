import { useCallback, useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { toPointsNumber } from "../lib/points";

export const USER_POINTS_UPDATED_EVENT = "bfm:user-points-updated";

export function notifyUserPointsUpdated(userId: string, points: number) {
  window.dispatchEvent(
    new CustomEvent(USER_POINTS_UPDATED_EVENT, { detail: { userId, points } }),
  );
}

/** Read-only view of the signed-in user's points (1 point = 1 THB). */
export function useUserPoints(user: SupabaseUser | null) {
  const userId = user?.id ?? null;
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(Boolean(userId));

  const load = useCallback(async (id: string, isCancelled: () => boolean) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("points")
      .eq("id", id)
      .maybeSingle();
    if (isCancelled()) return;
    // 42703 = column missing (migration not applied yet).
    setPoints(error ? 0 : toPointsNumber(data?.points));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!userId) {
      setPoints(0);
      setLoading(false);
      return;
    }

    let cancelled = false;
    const isCancelled = () => cancelled;
    setLoading(true);
    void load(userId, isCancelled);

    function handleUpdate(event: Event) {
      const detail = (event as CustomEvent<{ userId?: string; points?: number }>).detail;
      if (detail?.userId !== userId) return;
      if (Number.isFinite(detail.points)) setPoints(toPointsNumber(detail.points));
    }

    // Refresh when the tab regains focus so admin changes show up without a reload.
    function handleVisibility() {
      if (document.visibilityState === "visible" && userId) void load(userId, isCancelled);
    }

    window.addEventListener(USER_POINTS_UPDATED_EVENT, handleUpdate);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancelled = true;
      window.removeEventListener(USER_POINTS_UPDATED_EVENT, handleUpdate);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [userId, load]);

  return { points, loading };
}
