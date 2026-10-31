import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Coins, History, Loader2, Minus, PencilLine, Plus, ShieldCheck } from "lucide-react";
import { adjustUserPoints, loadUserPointTransactions, type AdminProfile, type PointTransaction } from "../../lib/admin";
import {
  formatPoints,
  parsePointsAmount,
  POINTS_REASON_MAX,
  previewPointsBalance,
  validatePointAdjustment,
  type PointAdjustmentKind,
} from "../../lib/points";
import { supabase } from "../../lib/supabase";
import { AdminEmptyState, dateLabel } from "./AdminUi";

const KIND_OPTIONS: { value: PointAdjustmentKind; label: string; icon: typeof Plus }[] = [
  { value: "add", label: "Add", icon: Plus },
  { value: "deduct", label: "Deduct", icon: Minus },
  { value: "set", label: "Set balance", icon: PencilLine },
];

const KIND_LABEL: Record<PointAdjustmentKind, string> = {
  add: "Added",
  deduct: "Deducted",
  set: "Set",
};

interface AdminUserPointsPanelProps {
  user: AdminProfile;
  onChanged: () => Promise<void>;
}

export function AdminUserPointsPanel({ user, onChanged }: AdminUserPointsPanelProps) {
  const balance = user.points ?? 0;
  const [kind, setKind] = useState<PointAdjustmentKind>("add");
  const [amountRaw, setAmountRaw] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [history, setHistory] = useState<PointTransaction[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null);

  const isSelf = currentAdminId === user.id;
  const amount = parsePointsAmount(amountRaw);
  const preview = amount === null ? null : previewPointsBalance(balance, kind, amount);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      setHistory(await loadUserPointTransactions(user.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load point history.");
    } finally {
      setHistoryLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => setCurrentAdminId(data.user?.id ?? null));
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;
    setError("");
    setSuccess("");

    if (isSelf) {
      setError("Admins cannot change their own points.");
      return;
    }

    const validation = validatePointAdjustment(balance, kind, amount, reason);
    if (validation || amount === null || preview === null) {
      setError(validation ?? "Enter a valid amount.");
      return;
    }

    const who = user.full_name || user.username || user.email || user.id;
    const confirmed = window.confirm(
      `Confirm points change for ${who}\n\n` +
        `${formatPoints(balance)} → ${formatPoints(preview)} points (฿${formatPoints(preview)})\n` +
        `Reason: ${reason.trim()}\n\nThis is recorded in the audit log and cannot be undone.`,
    );
    if (!confirmed) return;

    setSaving(true);
    try {
      const result = await adjustUserPoints({
        userId: user.id,
        kind,
        amount,
        reason,
        expectedBalance: balance,
      });
      setAmountRaw("");
      setReason("");
      setSuccess(`Balance updated to ${formatPoints(result.balance)} points.`);
      await Promise.all([onChanged(), loadHistory()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update points.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm lg:col-span-2">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <Coins className="h-4 w-4 text-amber-500" />
          Points
        </h2>
        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
          Admin-only · audited · 1 point = ฿1
        </span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Current balance</p>
          <p className="mt-1 text-3xl font-bold text-slate-900">{formatPoints(balance)}</p>
          <p className="mt-0.5 text-xs text-slate-500">≈ ฿{formatPoints(balance)} THB</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {KIND_OPTIONS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setKind(value)}
                disabled={saving || isSelf}
                className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                  kind === value
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="grid gap-2 sm:grid-cols-[10rem_minmax(0,1fr)]">
            <input
              value={amountRaw}
              onChange={(event) => setAmountRaw(event.target.value)}
              inputMode="decimal"
              autoComplete="off"
              placeholder={kind === "set" ? "New balance" : "Amount"}
              disabled={saving || isSelf}
              className="admin-input"
              aria-label="Points amount"
            />
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={POINTS_REASON_MAX}
              autoComplete="off"
              placeholder="Reason (required, saved in audit log)"
              disabled={saving || isSelf}
              className="admin-input"
              aria-label="Reason"
            />
          </div>

          {preview !== null && preview !== balance && (
            <p className={`text-xs ${preview < 0 ? "text-red-600" : "text-slate-500"}`}>
              New balance: <strong>{formatPoints(balance)}</strong> → <strong>{formatPoints(preview)}</strong>
            </p>
          )}
          {isSelf && <p className="text-xs text-amber-700">You cannot change your own points. Ask another admin.</p>}
          {error && <p className="text-xs font-medium text-red-600">{error}</p>}
          {success && <p className="text-xs font-medium text-emerald-600">{success}</p>}

          <button
            type="submit"
            disabled={saving || isSelf}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Coins className="h-3.5 w-3.5" />}
            Apply change
          </button>
        </form>
      </div>

      <div className="mt-5">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <History className="h-4 w-4 text-slate-400" />
          History
        </h3>
        {historyLoading ? (
          <div className="h-16 animate-pulse rounded-2xl bg-slate-100" />
        ) : history.length === 0 ? (
          <AdminEmptyState message="No point changes yet." />
        ) : (
          <div className="space-y-2">
            {history.map((tx) => (
              <div key={tx.id} className="flex flex-wrap items-start justify-between gap-2 rounded-2xl bg-slate-50 px-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {KIND_LABEL[tx.kind]}{" "}
                    <span className={tx.delta >= 0 ? "text-emerald-600" : "text-red-600"}>
                      {tx.delta >= 0 ? "+" : "−"}
                      {formatPoints(Math.abs(tx.delta))}
                    </span>
                    <span className="ml-2 text-xs font-normal text-slate-500">
                      {formatPoints(tx.balance_before)} → {formatPoints(tx.balance_after)}
                    </span>
                  </p>
                  <p className="mt-0.5 break-words text-xs text-slate-600">{tx.reason}</p>
                </div>
                <div className="shrink-0 text-right text-[11px] text-slate-400">
                  <p>{dateLabel(tx.created_at)}</p>
                  <p>{tx.admin_email || "admin"}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

