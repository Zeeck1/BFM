import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: Record<string, unknown>[];
  }
}

const SCRIPT_ID = "bfm-adsense-script";
const CLIENT_ID_PATTERN = /^ca-pub-\d+$/;
const SLOT_ID_PATTERN = /^\d+$/;

function loadAdSenseScript(clientId: string) {
  if (document.getElementById(SCRIPT_ID)) return;

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.async = true;
  script.crossOrigin = "anonymous";
  script.src =
    `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(clientId)}`;
  document.head.appendChild(script);
}

interface AdSenseUnitProps {
  slotId: string;
  className?: string;
}

export function AdSenseUnit({ slotId, className = "" }: AdSenseUnitProps) {
  const adRef = useRef<HTMLModElement>(null);
  const clientId = (import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined)?.trim() ?? "";
  const normalizedSlotId = slotId.trim();
  const configured =
    CLIENT_ID_PATTERN.test(clientId) && SLOT_ID_PATTERN.test(normalizedSlotId);

  useEffect(() => {
    const adElement = adRef.current;
    if (!configured || !adElement || adElement.dataset.bfmAdInitialized === "true") return;

    loadAdSenseScript(clientId);
    adElement.dataset.bfmAdInitialized = "true";

    try {
      window.adsbygoogle = window.adsbygoogle ?? [];
      window.adsbygoogle.push({});
    } catch (error) {
      // Ad blockers and pending AdSense accounts can reject initialization.
      console.warn("AdSense unit could not be initialized.", error);
    }
  }, [clientId, configured]);

  if (!configured) return null;

  return (
    <aside
      className={`overflow-hidden rounded-2xl border border-slate-100 bg-white px-3 py-3 sm:px-4 ${className}`}
      aria-label="Advertisement"
    >
      <p className="mb-2 text-center text-[9px] font-medium uppercase tracking-[0.16em] text-slate-400">
        Advertisement
      </p>
      <ins
        ref={adRef}
        className="adsbygoogle block min-h-[90px] w-full"
        data-ad-client={clientId}
        data-ad-slot={normalizedSlotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
