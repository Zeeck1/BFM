import { useEffect, useState, type FormEvent } from "react";
import { ArrowRight, Banknote, CheckCircle2, Loader2 } from "lucide-react";
import {
  AdminErrorNotice,
  AdminPageHeader,
  dateLabel,
} from "../../components/admin/AdminUi";
import {
  loadAdminExchangeRate,
  saveAdminExchangeRate,
  type AdminExchangeRate,
} from "../../lib/admin";
import { setCachedExchangeRate } from "../../lib/exchangeRateCache";
import { formatMMK, formatTHB } from "../../lib/utils";

export function AdminExchangeRatePage() {
  const [record, setRecord] = useState<AdminExchangeRate | null>(null);
  const [rateInput, setRateInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadAdminExchangeRate()
      .then((value) => {
        if (cancelled) return;
        setRecord(value);
        setRateInput(value ? String(value.thb_to_mmk) : "110");
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the rate.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const previewRate = Number(rateInput);
  const validPreview = Number.isFinite(previewRate) && previewRate > 0;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const updated = await saveAdminExchangeRate(previewRate);
      setRecord(updated);
      setRateInput(String(updated.thb_to_mmk));
      setCachedExchangeRate(updated.thb_to_mmk);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the rate.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <AdminPageHeader
        title="Currency rate"
        description="Set the THB to MMK conversion rate used across BuyForMe."
      />
      <AdminErrorNotice message={error} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-7"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900">THB to MMK rate</h2>
              <p className="text-xs text-slate-500">Enter the value of 1 Thai Baht in Myanmar Kyat.</p>
            </div>
          </div>

          {loading ? (
            <div className="mt-8 flex min-h-32 items-center justify-center gap-2 text-sm text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading current rate…
            </div>
          ) : (
            <>
              <label className="mt-8 block">
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  1 THB equals
                </span>
                <div className="mt-2 flex overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-500/10">
                  <input
                    type="number"
                    min="0.0001"
                    max="1000000"
                    step="0.0001"
                    required
                    value={rateInput}
                    onChange={(event) => {
                      setRateInput(event.target.value);
                      setSaved(false);
                    }}
                    className="min-w-0 flex-1 bg-transparent px-4 py-4 text-2xl font-bold text-slate-900 outline-none"
                    placeholder="110"
                  />
                  <span className="flex items-center border-l border-slate-200 bg-white px-4 text-sm font-bold text-slate-500">
                    MMK
                  </span>
                </div>
              </label>

              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="submit"
                  disabled={saving || !validPreview}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Banknote className="h-4 w-4" />}
                  {saving ? "Saving…" : "Save currency rate"}
                </button>
                {saved && (
                  <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Rate updated
                  </span>
                )}
              </div>
            </>
          )}
        </form>

        <aside className="space-y-4">
          <section className="rounded-3xl bg-slate-900 p-5 text-white shadow-lg shadow-slate-900/15">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live preview</p>
            <div className="mt-5 space-y-3">
              <Conversion thb={1} rate={validPreview ? previewRate : 0} />
              <Conversion thb={100} rate={validPreview ? previewRate : 0} />
              <Conversion thb={1_000} rate={validPreview ? previewRate : 0} />
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Current database value</p>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {record ? `${record.thb_to_mmk.toLocaleString()} MMK` : "Not set"}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Last updated {record ? dateLabel(record.updated_at) : "—"}
            </p>
            <p className="mt-4 text-xs leading-5 text-slate-500">
              New calculations use this rate immediately in this browser. Other open devices refresh their cached rate within 10 minutes.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}

function Conversion({ thb, rate }: { thb: number; rate: number }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/10 px-3.5 py-3">
      <span className="text-sm font-semibold">{formatTHB(thb)}</span>
      <ArrowRight className="h-4 w-4 text-slate-500" />
      <span className="text-sm font-bold">{formatMMK(thb * rate)}</span>
    </div>
  );
}
