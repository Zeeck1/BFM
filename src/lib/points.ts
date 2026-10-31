/** BFM points: 1 point = 1 Thai Baht (THB), up to 2 decimals. */

export type PointAdjustmentKind = "add" | "deduct" | "set";

export const POINTS_MAX_ADJUSTMENT = 1_000_000;
export const POINTS_MAX_BALANCE = 1_000_000_000;
export const POINTS_REASON_MIN = 3;
export const POINTS_REASON_MAX = 500;

export function toPointsNumber(value: unknown): number {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) return 0;
  return Math.round(number * 100) / 100;
}

export function formatPoints(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

/** Strictly parse an admin-entered amount. Returns null when invalid. */
export function parsePointsAmount(raw: string): number | null {
  const value = raw.trim().replace(/,/g, "");
  if (!/^\d{1,10}(\.\d{1,2})?$/.test(value)) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function previewPointsBalance(current: number, kind: PointAdjustmentKind, amount: number): number {
  const next = kind === "add" ? current + amount : kind === "deduct" ? current - amount : amount;
  return Math.round(next * 100) / 100;
}

/** Client-side validation mirroring public.admin_adjust_points(). The database is the authority. */
export function validatePointAdjustment(
  current: number,
  kind: PointAdjustmentKind,
  amount: number | null,
  reason: string,
): string | null {
  if (amount === null) return "Enter a valid amount (max 2 decimals).";
  if (kind !== "set" && (amount <= 0 || amount > POINTS_MAX_ADJUSTMENT)) {
    return `Amount must be between 0.01 and ${formatPoints(POINTS_MAX_ADJUSTMENT)}.`;
  }
  const next = previewPointsBalance(current, kind, amount);
  if (next < 0) return "Cannot deduct more than the current balance.";
  if (next > POINTS_MAX_BALANCE) return `Balance cannot exceed ${formatPoints(POINTS_MAX_BALANCE)}.`;
  if (next === current) return "The balance would not change.";
  const trimmed = reason.trim();
  if (trimmed.length < POINTS_REASON_MIN || trimmed.length > POINTS_REASON_MAX) {
    return `A reason of ${POINTS_REASON_MIN}–${POINTS_REASON_MAX} characters is required.`;
  }
  return null;
}

