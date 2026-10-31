import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Coins } from "lucide-react";
import { useUserPoints } from "../hooks/useUserPoints";
import { formatPoints } from "../lib/points";

interface UserPointsWidgetProps {
  user: SupabaseUser | null;
  className?: string;
}

export function UserPointsWidget({
  user,
  className = "hidden items-center gap-1.5 rounded-full border border-amber-200/80 bg-amber-50 px-3 py-1.5 shadow-sm sm:flex",
}: UserPointsWidgetProps) {
  const { points, loading } = useUserPoints(user);

  if (!user) return null;

  return (
    <div
      className={className}
      title={`Your BFM points (1 point = ฿1). Only the BFM team can add or edit points.`}
    >
      <Coins className="h-3.5 w-3.5 text-amber-500" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-600">Pts</span>
      {loading ? (
        <span className="h-3 w-8 animate-pulse rounded-full bg-amber-200/80" />
      ) : (
        <span className="text-xs font-bold text-slate-800">{formatPoints(points)}</span>
      )}
    </div>
  );
}
