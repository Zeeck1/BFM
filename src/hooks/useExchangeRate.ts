// src/hooks/useExchangeRate.ts
// Uses the module-level cache — fires at most one DB query every 10 minutes
// regardless of how many components call this hook.

import { useEffect, useState } from "react";
import {
  EXCHANGE_RATE_UPDATED_EVENT,
  getCachedRate,
  getExchangeRate,
} from "../lib/exchangeRateCache";

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
    function handleRateUpdate(event: Event) {
      const rate = (event as CustomEvent<number>).detail;
      if (Number.isFinite(rate)) setState({ rate, loading: false });
    }

    window.addEventListener(EXCHANGE_RATE_UPDATED_EVENT, handleRateUpdate);
    getExchangeRate().then((rate) => {
      if (!cancelled) setState({ rate, loading: false });
    });
    return () => {
      cancelled = true;
      window.removeEventListener(EXCHANGE_RATE_UPDATED_EVENT, handleRateUpdate);
    };
  }, []);

  return state;
}
