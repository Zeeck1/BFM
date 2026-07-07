// src/components/ImageLightbox.tsx

import { useEffect, useState } from "react";
import { X, ZoomIn, ZoomOut } from "lucide-react";

interface ImageLightboxProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function ImageLightbox({ src, alt, onClose }: ImageLightboxProps) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`${alt} — full size preview`}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
        aria-label="Close image preview"
      >
        <X className="h-5 w-5" />
      </button>

      <div
        className={`relative flex max-h-[90vh] max-w-[90vw] items-center justify-center overflow-auto ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          onClick={() => setZoomed((z) => !z)}
          className={`max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl transition-transform duration-200 ${
            zoomed ? "scale-150" : "scale-100"
          }`}
        />
        <p className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/50 px-3 py-1 text-xs text-white/90">
          {zoomed ? <ZoomOut className="h-3.5 w-3.5" /> : <ZoomIn className="h-3.5 w-3.5" />}
          {zoomed ? "Click to zoom out" : "Click image to zoom in"} · Esc to close
        </p>
      </div>
    </div>
  );
}
