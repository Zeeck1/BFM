// src/components/OrderPlacementModal.tsx
// Order workflow modal — accepts a SavedLink item.

import { useEffect, useState, type FormEvent } from "react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  MapPin,
  Package,
  Phone,
  ShoppingCart,
  User,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { formatMMK, formatTHB } from "../lib/utils";
import type { SavedLink } from "../types";

const BASE_CARGO_SURCHARGE_MMK = 2_500;
const CARGO_RATE_PER_KG_MMK = 3_500;

interface OrderPlacementModalProps {
  item: SavedLink | null;
  user: SupabaseUser | null;
  onClose: () => void;
  onSuccess: () => void;
}

type SubmitState = "idle" | "loading" | "success" | "error";

export function OrderPlacementModal({
  item,
  user,
  onClose,
  onSuccess,
}: OrderPlacementModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [weightKg, setWeightKg] = useState("0.5");
  const [notes, setNotes] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("full_name, phone, address")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (!data) return;
        setFullName(data.full_name ?? "");
        setPhone(data.phone ?? "");
        setAddress(data.address ?? "");
      });
  }, [user]);

  useEffect(() => {
    setSubmitState("idle");
    setErrorMsg("");
  }, [item]);

  if (!item) return null;

  const weight = parseFloat(weightKg) || 0;
  const cargoFee = BASE_CARGO_SURCHARGE_MMK + Math.round(weight * CARGO_RATE_PER_KG_MMK);
  const priceMmk = item.price_mmk ?? 0;
  const totalMmk = priceMmk + cargoFee;
  const hasPrice = item.price_mmk != null && item.price_mmk > 0;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const current = item;
    if (!current || !user) {
      setErrorMsg("Please sign in to place an order.");
      setSubmitState("error");
      return;
    }

    setSubmitState("loading");
    setErrorMsg("");

    const destination = [address.trim(), city.trim()].filter(Boolean).join(", ");

    const { error } = await supabase.from("orders").insert({
      user_id: user.id,
      product_name: current.title ?? current.url,
      original_url: current.url,
      platform: current.site_name ?? null,
      price_thb: current.price_thb ?? 0,
      price_mmk: priceMmk,
      cargo_fee_mmk: cargoFee,
      status: "pending",
      notes: notes.trim() || `Ship to: ${destination}`,
    });

    if (error) {
      setErrorMsg(error.message);
      setSubmitState("error");
      return;
    }

    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName.trim(),
      phone: phone.trim(),
      address: destination,
    });

    setSubmitState("success");
    setTimeout(() => {
      onSuccess();
      onClose();
    }, 1800);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[95dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-w-lg sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Request to Buy</h2>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Product summary */}
          <div className="flex gap-3 border-b border-slate-100 bg-slate-50 p-4">
            {item.image_url && (
              <img
                src={item.image_url}
                alt={item.title ?? "Product"}
                className="h-16 w-16 flex-shrink-0 rounded-xl bg-slate-200 object-cover"
              />
            )}
            <div className="min-w-0">
              {item.site_name && (
                <span className="mb-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700">
                  {item.site_name}
                </span>
              )}
              <p className="line-clamp-2 text-sm font-semibold text-slate-800">
                {item.title ?? item.url}
              </p>
              {hasPrice ? (
                <p className="mt-1 text-sm font-bold text-indigo-700">
                  {formatMMK(priceMmk)}
                  {item.price_thb != null && (
                    <span className="ml-1.5 text-xs font-normal text-slate-400">
                      ({formatTHB(item.price_thb)})
                    </span>
                  )}
                </p>
              ) : (
                <p className="mt-1 text-xs italic text-slate-400">
                  Price to be confirmed by BFM team
                </p>
              )}
            </div>
          </div>

          {/* Form */}
          <form id="order-form" onSubmit={handleSubmit} className="flex flex-col gap-5 p-5">
            <fieldset className="flex flex-col gap-3">
              <legend className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <MapPin className="h-4 w-4 text-indigo-500" />
                Shipping Destination
              </legend>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  Full Name
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Phone</label>
                <div className="relative">
                  <Phone className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    required
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+95 9 xxx xxx xxx"
                    className="w-full rounded-xl border border-slate-300 py-2.5 pl-9 pr-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">Address</label>
                <textarea
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-600">
                  City / Township
                </label>
                <input
                  required
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </fieldset>

            <div>
              <label className="mb-1 flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                <Package className="h-4 w-4 text-indigo-500" />
                Estimated Weight (kg)
              </label>
              <input
                type="number"
                min="0.1"
                max="30"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {/* Billing estimate — only when price is known */}
            {hasPrice ? (
              <div className="space-y-2 rounded-2xl border border-indigo-100 bg-indigo-50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-700">
                  Billing Estimate
                </h3>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Item Price</span>
                  <span className="font-semibold">{formatMMK(priceMmk)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Base Cargo Surcharge</span>
                  <span className="font-semibold">{formatMMK(BASE_CARGO_SURCHARGE_MMK)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">
                    Weight ({weight} kg × {CARGO_RATE_PER_KG_MMK.toLocaleString()} MMK)
                  </span>
                  <span className="font-semibold">
                    {formatMMK(Math.round(weight * CARGO_RATE_PER_KG_MMK))}
                  </span>
                </div>
                <div className="my-1 h-px bg-indigo-200" />
                <div className="flex justify-between">
                  <span className="text-sm font-bold text-indigo-800">Total Estimate</span>
                  <span className="text-base font-extrabold text-indigo-700">
                    {formatMMK(totalMmk)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
                <p className="text-sm font-semibold text-amber-800">
                  Price not available yet
                </p>
                <p className="mt-1 text-xs text-amber-600">
                  Our team will confirm the item price and contact you before purchasing.
                </p>
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full resize-none rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            {submitState === "error" && (
              <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-5 py-4">
          {submitState === "success" ? (
            <div className="flex items-center justify-center gap-2 py-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-semibold">Order submitted successfully.</span>
            </div>
          ) : (
            <button
              type="submit"
              form="order-form"
              disabled={submitState === "loading"}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitState === "loading" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Placing Order…
                </>
              ) : hasPrice ? (
                <>Confirm Order — {formatMMK(totalMmk)}</>
              ) : (
                <>Submit Order Request</>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
