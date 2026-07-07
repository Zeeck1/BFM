import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookmarkPlus,
  Globe2,
  MessageCircle,
  Package,
  QrCode,
  Receipt,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { buildBuyForMeMessengerUrl } from "../lib/messenger";

function openMessengerChat() {
  window.open(buildBuyForMeMessengerUrl([]), "_blank", "noopener,noreferrer");
}

const SERVICES = [
  {
    icon: BookmarkPlus,
    title: "Save product links",
    description:
      "Paste any product URL from Lazada, Shopee, Amazon and more. We fetch the image, title, and price when possible.",
  },
  {
    icon: Globe2,
    title: "Thailand → Myanmar shopping",
    description:
      "Shop from Thai online stores with prices shown in THB and estimated MMK using live exchange rates.",
  },
  {
    icon: MessageCircle,
    title: "Buy For Me on Messenger",
    description:
      "Send your selected items directly to us on Messenger with one tap — no copy-paste needed.",
  },
  {
    icon: QrCode,
    title: "Share with QR code",
    description:
      "Generate a QR code for your favourite picks. Friends and family can view the list and order through us.",
  },
  {
    icon: Receipt,
    title: "Link slip download",
    description:
      "Create a clean image slip of your selected products — handy for sharing in chats or groups.",
  },
  {
    icon: Truck,
    title: "Order & delivery support",
    description:
      "We purchase on your behalf and help coordinate delivery from Thailand to Myanmar.",
  },
] as const;

const STEPS = [
  { step: "1", title: "Paste a link", text: "Copy a product URL from any supported shop." },
  { step: "2", title: "Save to wishlist", text: "Preview details and save items you want." },
  { step: "3", title: "Send to us", text: "Tap Buy For Me on Messenger with your list ready." },
  { step: "4", title: "We handle the rest", text: "We confirm, purchase, and arrange delivery." },
] as const;

export function OurServicePage() {
  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.28),transparent_55%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
            Buy For Me · Myanmar · Thailand
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
            Our Service
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            Buy For Me helps Myanmar customers shop from Thailand easily. Save links, share wishlists,
            and order through Messenger — we take care of purchasing and delivery.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-500"
            >
              <BookmarkPlus className="h-4 w-4" />
              Start saving links
            </Link>
            <button
              type="button"
              onClick={openMessengerChat}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4" />
              Chat on Messenger
            </button>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900">What we offer</h2>
          <p className="mt-2 text-sm text-slate-500">
            Everything you need to shop cross-border with confidence.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map(({ icon: Icon, title, description }) => (
            <article
              key={title}
              className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
            >
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50">
                <Icon className="h-5 w-5 text-indigo-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200/80 bg-white px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900">How it works</h2>
            <p className="mt-2 text-sm text-slate-500">Four simple steps from link to delivery.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {STEPS.map(({ step, title, text }) => (
              <div
                key={step}
                className="flex gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
                  {step}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">{title}</h3>
                  <p className="mt-1 text-sm text-slate-500">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust + CTA */}
      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-white p-6 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
                <ShieldCheck className="h-3.5 w-3.5" />
                Trusted cross-border service
              </div>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                Ready to order from Thailand?
              </h2>
              <p className="max-w-lg text-sm leading-relaxed text-slate-600">
                Save your favourite product links, share them with QR codes, or send your list straight
                to us on Messenger. We&apos;ll guide you through the rest.
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2">
              <Link
                to="/wishlist"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
              >
                <Package className="h-4 w-4" />
                Open wishlist
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={openMessengerChat}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0084FF] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0078eb]"
              >
                <MessageCircle className="h-4 w-4" />
                Contact us
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
