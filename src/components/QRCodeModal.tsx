import { useEffect, useRef, useState } from "react";
import { Check, Clock, Copy, Download, QrCode, X } from "lucide-react";
import QRCode from "qrcode";

interface QRCodeModalProps {
  open: boolean;
  onClose: () => void;
  shareUrl: string;
  ownerName: string;
  itemCount: number;
  expiresIn?: string;
}

export function QRCodeModal({ open, onClose, shareUrl, ownerName, itemCount, expiresIn }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !canvasRef.current || !shareUrl) return;

    QRCode.toCanvas(canvasRef.current, shareUrl, {
      width: 280,
      margin: 2,
      color: { dark: "#1e293b", light: "#ffffff" },
    });
  }, [open, shareUrl]);

  if (!open) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  }

  function handleDownload() {
    if (!canvasRef.current) return;

    const tempCanvas = document.createElement("canvas");
    const padding = 48;
    const qrSize = 280;
    const footerHeight = 80;
    const totalW = qrSize + padding * 2;
    const totalH = qrSize + padding * 2 + footerHeight;

    tempCanvas.width = totalW;
    tempCanvas.height = totalH;
    const ctx = tempCanvas.getContext("2d")!;

    ctx.fillStyle = "#ffffff";
    ctx.roundRect(0, 0, totalW, totalH, 16);
    ctx.fill();

    ctx.drawImage(canvasRef.current, padding, padding, qrSize, qrSize);

    ctx.fillStyle = "#0f172a";
    ctx.font = "bold 16px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${ownerName}'s Favourites`, totalW / 2, qrSize + padding + 30);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "13px Inter, system-ui, sans-serif";
    const subtitle = expiresIn
      ? `${itemCount} item${itemCount !== 1 ? "s" : ""} · Expires in ${expiresIn}`
      : `${itemCount} item${itemCount !== 1 ? "s" : ""} · Scan to view`;
    ctx.fillText(subtitle, totalW / 2, qrSize + padding + 52);

    const link = document.createElement("a");
    link.download = `bfm-qr-${Date.now()}.png`;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-900">Share via QR Code</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* QR canvas */}
        <div className="flex flex-col items-center gap-4 px-5 py-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <canvas ref={canvasRef} />
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-slate-800">{ownerName}&apos;s Favourites</p>
            <p className="text-xs text-slate-500">
              {itemCount} item{itemCount !== 1 ? "s" : ""} &middot; Scan to view &amp; buy
            </p>
            {expiresIn && (
              <p className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                <Clock className="h-3 w-3" />
                Expires in {expiresIn}
              </p>
            )}
          </div>

          {/* Share URL */}
          <div className="flex w-full items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <p className="min-w-0 flex-1 truncate text-xs text-slate-500">{shareUrl}</p>
            <button
              type="button"
              onClick={handleCopy}
              className="flex shrink-0 items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownload}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
          >
            <Download className="h-4 w-4" />
            Download QR
          </button>
        </div>
      </div>
    </div>
  );
}
