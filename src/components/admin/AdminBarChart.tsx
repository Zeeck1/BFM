export interface AdminBarChartItem {
  label: string;
  count: number;
  hint?: string;
}

export function AdminBarChart({
  title,
  description,
  items,
  emptyMessage,
  accent = "indigo",
}: {
  title: string;
  description: string;
  items: AdminBarChartItem[];
  emptyMessage: string;
  accent?: "indigo" | "rose";
}) {
  const max = Math.max(...items.map((item) => item.count), 0);
  const barClass = accent === "rose" ? "bg-rose-500" : "bg-indigo-500";
  const chipClass =
    accent === "rose" ? "bg-rose-50 text-rose-700" : "bg-indigo-50 text-indigo-700";

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="mb-5">
        <h2 className="font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
          {emptyMessage}
        </p>
      ) : (
        <div className="space-y-3.5">
          {items.map((item, index) => {
            const width = max > 0 ? Math.max((item.count / max) * 100, 6) : 0;
            return (
              <div key={`${item.label}-${index}`}>
                <div className="mb-1.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex items-start gap-2.5">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-slate-100 text-[11px] font-bold text-slate-500">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-800" title={item.label}>
                        {item.label}
                      </p>
                    {item.hint && (
                      <p className="truncate text-[11px] text-slate-400" title={item.hint}>
                        {item.hint}
                      </p>
                    )}
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-lg px-2 py-1 text-xs font-bold ${chipClass}`}>
                    {item.count}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${barClass}`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
