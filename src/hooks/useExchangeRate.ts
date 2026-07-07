// src/hooks/useExchangeRate.ts
// Uses the module-level cache — fires at most one DB query every 10 minutes
// regardless of how many components call this hook.

import { useEffect, useState } from "react";
import { getCachedRate, getExchangeRate } from "../lib/exchangeRateCache";

interface ExchangeRateState {
  rate: number;
  loading: boolean;
}

export function useExchangeRate(): ExchangeRateState {
  const [state, setState] = useState<ExchangeRateState>({
    rate: getCachedRate(),
    loading: getCachedRate() === 110 ? true : false,
  });

  useEffect(() => {
    let cancelled = false;
    getExchangeRate().then((rate) => {
      if (!cancelled) setState({ rate, loading: false });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
