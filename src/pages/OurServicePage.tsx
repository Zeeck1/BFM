import { useState } from "react";
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

type Lang = "en" | "my";

const TRANSLATIONS = {
  en: {
    badge: "Buy For Me · Myanmar · Thailand",
    title: "Our Service",
    heroDesc:
      "Buy For Me helps Myanmar customers shop from Thailand easily. Save links, share wishlists, and order through Messenger — we take care of purchasing and delivery.",
    btnSave: "Start saving links",
    btnChat: "Chat on Messenger",
    offerTitle: "What we offer",
    offerSubtitle: "Everything you need to shop cross-border with confidence.",
    howTitle: "How it works",
    howSubtitle: "Four simple steps from link to delivery.",
    trustBadge: "Trusted cross-border service",
    ctaTitle: "Ready to order from Thailand?",
    ctaDesc:
      "Save your favourite product links, share them with QR codes, or send your list straight to us on Messenger. We'll guide you through the rest.",
    ctaBtnWishlist: "Open wishlist",
    ctaBtnContact: "Contact us",
    services: [
      {
        title: "Save product links",
        description:
          "Paste any product URL from Lazada, Shopee, Amazon and more. We fetch the image, title, and price when possible.",
      },
      {
        title: "Thailand → Myanmar shopping",
        description:
          "Shop from Thai online stores with prices shown in THB and estimated MMK using live exchange rates.",
      },
      {
        title: "Buy For Me on Messenger",
        description:
          "Send your selected items directly to us on Messenger with one tap — no copy-paste needed.",
      },
      {
        title: "Share with QR code",
        description:
          "Generate a QR code for your favourite picks. Friends and family can view the list and order through us.",
      },
      {
        title: "Link slip download",
        description:
          "Create a clean image slip of your selected products — handy for sharing in chats or groups.",
      },
      {
        title: "Order & delivery support",
        description:
          "We purchase on your behalf and help coordinate delivery from Thailand to Myanmar.",
      },
    ],
    steps: [
      { step: "1", title: "Paste a link", text: "Copy a product URL from any supported shop." },
      { step: "2", title: "Save to wishlist", text: "Preview details and save items you want." },
      { step: "3", title: "Send to us", text: "Tap Buy For Me on Messenger with your list ready." },
      { step: "4", title: "We handle the rest", text: "We confirm, purchase, and arrange delivery." },
    ],
  },
  my: {
    badge: "Buy For Me · မြန်မာ · ထိုင်း",
    title: "ကျွန်ုပ်တို့၏ ဝန်ဆောင်မှု",
    heroDesc:
      "Buy For Me သည် ထိုင်းနိုင်ငံမှ ပစ္စည်းများကို မြန်မာနိုင်ငံမှ လွယ်ကူစွာ ဝယ်ယူနိုင်ရန် ကူညီပေးပါသည်။ လင့်ခ်များကို သိမ်းဆည်းရန်၊ ဝတ်ရှ်လစ်(Wishlist)များ မျှဝေရန်နှင့် Messenger မှတစ်ဆင့် မှာယူရန် - ကျွန်ုပ်တို့မှ ဝယ်ယူပေးခြင်းနှင့် ပို့ဆောင်ပေးခြင်းကို ဆောင်ရွက်ပေးပါသည်။",
    btnSave: "လင့်ခ်များ စတင်သိမ်းဆည်းရန်",
    btnChat: "Messenger တွင် ဆက်သွယ်ရန်",
    offerTitle: "ကျွန်ုပ်တို့ ကူညီပေးနိုင်သည့် ဝန်ဆောင်မှုများ",
    offerSubtitle: "နယ်စပ်ဖြတ်ကျော်ပြီး ယုံကြည်စိတ်ချစွာ စျေးဝယ်ရန် လိုအပ်သမျှ အားလုံး။",
    howTitle: "မည်သို့ လုပ်ဆောင်သလဲ",
    howSubtitle: "လင့်ခ်တစ်ခုမှ ပို့ဆောင်သည်အထိ ရိုးရှင်းသော အဆင့် ၄ ဆင့်။",
    trustBadge: "ယုံကြည်စိတ်ချရသော နယ်စပ်ဖြတ်ကျော် ဝန်ဆောင်မှု",
    ctaTitle: "ထိုင်းနိုင်ငံမှ မှာယူရန် အဆင်သင့်ဖြစ်ပြီလား?",
    ctaDesc:
      "သင်နှစ်သက်သော ကုန်ပစ္စည်းလင့်ခ်များကို သိမ်းဆည်းပါ၊ QR ကုဒ်များဖြင့် မျှဝေပါ သို့မဟုတ် သင့်စာရင်းကို Messenger မှတစ်ဆင့် ကျွန်ုပ်တို့ထံ တိုက်ရိုက်ပေးပို့ပါ။ ကျန်ရှိသည်များကို ကျွန်ုပ်တို့ လမ်းညွှန်ပေးပါမည်။",
    ctaBtnWishlist: "ဝတ်ရှ်လစ် ဖွင့်ရန်",
    ctaBtnContact: "ဆက်သွယ်ရန်",
    services: [
      {
        title: "ကုန်ပစ္စည်းလင့်ခ်များ သိမ်းဆည်းရန်",
        description:
          "Lazada, Shopee, Amazon နှင့် အခြား ဝဘ်ဆိုက်များမှ ကုန်ပစ္စည်း လင့်ခ်များကို ကူးယူထည့်သွင်းပါ။ ဖြစ်နိုင်ပါက ပုံ၊ အမည်နှင့် စျေးနှုန်းများကို အလိုအလျောက် ရယူပေးပါမည်။",
      },
      {
        title: "ထိုင်း → မြန်မာ စျေးဝယ်ယူမှု",
        description:
          "ထိုင်းအွန်လိုင်းစတိုးများမှ စျေးဝယ်ယူနိုင်ပြီး လက်ရှိငွေလဲနှုန်းများကို အသုံးပြု၍ စျေးနှုန်းများကို ထိုင်းဘတ် (THB) နှင့် ခန့်မှန်းခြေ မြန်မာကျပ် (MMK) ဖြင့် ပြသပေးပါသည်။",
      },
      {
        title: "Messenger မှတစ်ဆင့် ဝယ်ယူခြင်း",
        description:
          "သင်ရွေးချယ်ထားသော ပစ္စည်းများကို တစ်ချက်နှိပ်ရုံဖြင့် Messenger မှတစ်ဆင့် ကျွန်ုပ်တို့ထံ တိုက်ရိုက်ပေးပို့ပါ - ကော်ပီကူးယူထည့်သွင်းရန် မလိုပါ။",
      },
      {
        title: "QR ကုဒ်ဖြင့် မျှဝေခြင်း",
        description:
          "သင်နှစ်သက်ရာ ပစ္စည်းများအတွက် QR ကုဒ်တစ်ခု ထုတ်လုပ်ပါ။ သူငယ်ချင်းများနှင့် မိသားစုဝင်များက စာရင်းကို ကြည့်ရှုနိုင်ပြီး ကျွန်ုပ်တို့မှတစ်ဆင့် မှာယူနိုင်ပါသည်။",
      },
      {
        title: "လင့်ခ်ပြေစာ (Slip) ဒေါင်းလုဒ်လုပ်ရန်",
        description:
          "သင်ရွေးချယ်ထားသော ကုန်ပစ္စည်းများ၏ ရှင်းလင်းသပ်ရပ်သော ပြေစာပုံရိပ်ကို ဖန်တီးပါ - ချက်တင်များ သို့မဟုတ် ဂရုများတွင် မျှဝေရန် အဆင်ပြေပါသည်။",
      },
      {
        title: "မှာယူမှုနှင့် ပို့ဆောင်မှု ကူညီပံ့ပိုးမှု",
        description:
          "ကျွန်ုပ်တို့က သင့်ကိုယ်စား ဝယ်ယူပေးပြီး ထိုင်းနိုင်ငံမှ မြန်မာနိုင်ငံသို့ ပို့ဆောင်မှုများကို ကူညီဆောင်ရွက်ပေးပါသည်။",
      },
    ],
    steps: [
      { step: "1", title: "လင့်ခ်တစ်ခု ထည့်သွင်းပါ", text: "ပံ့ပိုးထားသော မည်သည့်ဆိုင်မှမဆို ကုန်ပစ္စည်းလင့်ခ်ကို ကူးယူပါ။" },
      { step: "2", title: "ဝတ်ရှ်လစ်ထဲ သိမ်းဆည်းပါ", text: "အသေးစိတ်အချက်အလက်များကို အစမ်းကြည့်ရှုပြီး သင်လိုချင်သော ပစ္စည်းများကို သိမ်းဆည်းပါ။" },
      { step: "3", title: "ကျွန်ုပ်တို့ထံ ပေးပို့ပါ", text: "သင့်စာရင်း အဆင်သင့်ဖြစ်ပါက Messenger ရှိ Buy For Me ကို နှိပ်ပါ။" },
      { step: "4", title: "ကျန်တာ ကျွန်ုပ်တို့ ဆောင်ရွက်ပါမည်", text: "ကျွန်ုပ်တို့မှ အတည်ပြုခြင်း၊ ဝယ်ယူခြင်းနှင့် ပို့ဆောင်ခြင်းတို့ကို စီစဉ်ပေးပါမည်။" },
    ],
  },
} as const;

export function OurServicePage() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("bfm_service_lang");
    return saved === "en" ? "en" : "my";
  });

  const t = TRANSLATIONS[lang];

  function toggleLang(newLang: Lang) {
    setLang(newLang);
    localStorage.setItem("bfm_service_lang", newLang);
  }

  const SERVICE_ICONS = [BookmarkPlus, Globe2, MessageCircle, QrCode, Receipt, Truck];

  return (
    <div className="min-h-[calc(100vh-3.5rem)]">
      {/* Language Switch Bar */}
      <div className="bg-slate-950 px-4 py-2 text-center text-slate-400">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <span className="text-[11px] font-medium tracking-wide">Select Language / ဘာသာစကား ရွေးချယ်ရန်</span>
          <div className="inline-flex rounded-lg bg-slate-900 p-0.5 ring-1 ring-white/10">
            <button
              type="button"
              onClick={() => toggleLang("en")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                lang === "en"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => toggleLang("my")}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-all ${
                lang === "my"
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              မြန်မာ
            </button>
          </div>
        </div>
      </div>

      {/* Hero */}
      <section className="relative overflow-hidden bg-slate-900 px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.28),transparent_55%)]" />
        <div className="relative mx-auto max-w-3xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300">
            <Sparkles className="h-3.5 w-3.5 text-indigo-300" />
            {t.badge}
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl">
            {t.title}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-slate-400 sm:text-base">
            {t.heroDesc}
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-500"
            >
              <BookmarkPlus className="h-4 w-4" />
              {t.btnSave}
            </Link>
            <button
              type="button"
              onClick={openMessengerChat}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/10"
            >
              <MessageCircle className="h-4 w-4" />
              {t.btnChat}
            </button>
          </div>
        </div>
      </section>

      {/* Services grid */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold text-slate-900">{t.offerTitle}</h2>
          <p className="mt-2 text-sm text-slate-500">
            {t.offerSubtitle}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {t.services.map(({ title, description }, idx) => {
            const Icon = SERVICE_ICONS[idx] || BookmarkPlus;
            return (
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
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200/80 bg-white px-4 py-10 sm:px-6 sm:py-14">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold text-slate-900">{t.howTitle}</h2>
            <p className="mt-2 text-sm text-slate-500">{t.howSubtitle}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {t.steps.map(({ step, title, text }) => (
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
                {t.trustBadge}
              </div>
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                {t.ctaTitle}
              </h2>
              <p className="max-w-lg text-sm leading-relaxed text-slate-600">
                {t.ctaDesc}
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-2">
              <Link
                to="/wishlist"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
              >
                <Package className="h-4 w-4" />
                {t.ctaBtnWishlist}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={openMessengerChat}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0084FF] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#0078eb]"
              >
                <MessageCircle className="h-4 w-4" />
                {t.ctaBtnContact}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
