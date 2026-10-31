import { useCallback, useEffect, useState } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Coins,
  History,
  RefreshCw,
} from "lucide-react";
import { useUserPoints, USER_POINTS_UPDATED_EVENT } from "../../hooks/useUserPoints";
import { formatPoints, type PointAdjustmentKind } from "../../lib/points";
import { supabase } from "../../lib/supabase";

interface UserPointTransaction {
  id: string;
  kind: PointAdjustmentKind;
  amount: number;
  delta: number;
  balance_before: number;
  balance_after: number;
  reason: string;
  created_at: string;
}

interface ProfilePointsSectionProps {
  user: SupabaseUser;
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function ProfilePointsSection({ user }: ProfilePointsSectionProps) {
  const { points, loading: pointsLoading } = useUserPoints(user);
  const [transactions, setTransactions] = useState<UserPointTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [showHistory, setShowHistory] = useState(false);

  const fetchTransactions = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("point_transactions")
        .select("id,kind,amount,delta,balance_before,balance_after,reason,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) {
        setTransactions([]);
      } else {
        setTransactions(
          (data || []).map((row) => ({
            ...row,
            amount: Number(row.amount),
            delta: Number(row.delta),
            balance_before: Number(row.balance_before),
            balance_after: Number(row.balance_after),
          })),
        );
      }
    } catch {
      setTransactions([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void fetchTransactions();

    function onPointsUpdated(event: Event) {
      const detail = (event as CustomEvent<{ userId?: string }>).detail;
      if (detail?.userId === user.id) {
        void fetchTransactions();
      }
    }

    window.addEventListener(USER_POINTS_UPDATED_EVENT, onPointsUpdated);
    return () => {
      window.removeEventListener(USER_POINTS_UPDATED_EVENT, onPointsUpdated);
    };
  }, [user, fetchTransactions]);

  return (
    <section className="mb-6 overflow-hidden rounded-3xl border border-amber-200/70 bg-gradient-to-b from-amber-500/[0.03] via-white to-slate-50/50 p-5 shadow-sm sm:p-6">
      {/* Top Title */}
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-400 text-white shadow-md shadow-amber-500/25">
          <Coins className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-bold tracking-tight text-slate-900">BFM Points</h2>
          <p className="text-[11px] font-medium text-slate-500">Your reward points balance</p>
        </div>
      </div>

      {/* Luxury Points Display Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 p-6 text-white shadow-xl shadow-amber-950/20 ring-1 ring-white/10">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-amber-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 h-36 w-36 rounded-full bg-indigo-500/15 blur-2xl" />

        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-amber-300/90">
            Total Available Points
          </p>

          <div className="mt-2 flex items-baseline gap-2.5">
            {pointsLoading ? (
              <div className="h-12 w-40 animate-pulse rounded-xl bg-white/20" />
            ) : (
              <>
                <span className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
                  {formatPoints(points)}
                </span>
                <span className="text-sm font-bold uppercase tracking-wider text-amber-400">
                  Points
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Activity History Toggle */}
      <div className="mt-4">
        <button
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          className="flex w-full items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900"
        >
          <span className="flex items-center gap-2">
            <History className="h-3.5 w-3.5 text-amber-500" />
            {showHistory ? "Hide Points History" : "View Points History"}
            {transactions.length > 0 && (
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                {transactions.length}
              </span>
            )}
          </span>
          <span className="text-[11px] font-bold text-indigo-600">
            {showHistory ? "Collapse" : "Expand"}
          </span>
        </button>

        {showHistory && (
          <div className="mt-3 space-y-2 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Recent Activity
              </p>
              <button
                type="button"
                onClick={() => void fetchTransactions()}
                disabled={historyLoading}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 transition hover:text-slate-900 disabled:opacity-50"
              >
                <RefreshCw className={`h-3 w-3 ${historyLoading ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>

            {historyLoading ? (
              <div className="space-y-2 py-2">
                <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-11 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">
                <Coins className="mx-auto mb-1.5 h-6 w-6 text-slate-300" />
                No points history yet. Points activity will appear here.
              </div>
            ) : (
              <div className="space-y-2">
                {transactions.map((tx) => {
                  const isPositive = tx.delta >= 0;
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5 transition hover:bg-slate-50"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            isPositive
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}
                        >
                          {isPositive ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-bold text-slate-800">
                            {tx.reason || (isPositive ? "Points Added" : "Points Deducted")}
                          </p>
                          <p className="text-[10px] text-slate-400">{formatDate(tx.created_at)}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p
                          className={`text-xs font-extrabold ${
                            isPositive ? "text-emerald-600" : "text-rose-600"
                          }`}
                        >
                          {isPositive ? "+" : "−"}
                          {formatPoints(Math.abs(tx.delta))} Points
                        </p>
                        <p className="text-[10px] font-medium text-slate-400">
                          Balance: {formatPoints(tx.balance_after)}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
