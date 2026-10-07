import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookmarkPlus,
  Check,
  Globe2,
  MessageCircle,
  Package,
  Plane,
  QrCode,
  Receipt,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import { buildBuyForMeMessengerUrl } from "../lib/messenger";
import cargoHero from "../assets/images/bfm-cargo-hero.jpg";
import cargoPlane from "../assets/images/bfm-cargo-plane.jpg";
import cargoTruck from "../assets/images/bfm-cargo-truck.jpg";

function openMessengerChat() {
  window.open(buildBuyForMeMessengerUrl([]), "_blank", "noopener,noreferrer");
}

type Lang = "en" | "my";
type CargoMode = "plane" | "truck";

const TRANSLATIONS = {
  en: {
    badge: "Air + road cargo across the border",
    title: "Myanmar and Thailand, connected.",
    heroDesc:
      "Shop, send, and receive with one team. From online purchases to two-way cargo by plane and truck, Buy For Me keeps every step simple.",
    btnSave: "Explore products",
    btnChat: "Talk to our team",
    heroPoints: ["Cargo plane", "Cargo truck", "Shopping support"],
    offerEyebrow: "Shopping made easier",
    offerTitle: "Everything you need, in one place",
    offerSubtitle: "Tools and hands-on support for shopping confidently between Thailand and Myanmar.",
    cargoEyebrow: "Two-way cargo",
    cargoTitle: "Send cargo by plane or truck",
    cargoSubtitle:
      "Move parcels in either direction. We coordinate air and road cargo so the journey from pickup to delivery stays clear.",
    cargoRoutes: [
      {
        mode: "plane" as const,
        modeLabel: "Cargo plane",
        from: "Thailand",
        to: "Myanmar",
        title: "Thailand to Myanmar",
        description:
          "Send online purchases, personal parcels, and eligible goods from Thailand to Myanmar with air cargo support from our team.",
        features: ["Air coordination", "Purchase consolidation", "Delivery support"],
      },
      {
        mode: "truck" as const,
        modeLabel: "Cargo truck",
        from: "Myanmar",
        to: "Thailand",
        title: "Myanmar to Thailand",
        description:
          "Need to send a parcel back to Thailand? Share the item details and we will guide you through available road cargo options.",
        features: ["Item review", "Route guidance", "Status assistance"],
      },
    ],
    cargoNote: "Cargo acceptance, timing, and fees depend on the item, size, weight, and destination.",
    cargoCta: "Ask about cargo",
    howTitle: "How it works",
    howSubtitle: "A clear path from finding an item to receiving it.",
    trustBadge: "Trusted cross-border service",
    ctaTitle: "Ready to move something across the border?",
    ctaDesc:
      "Send us your shopping list or cargo details on Messenger. Our team will review your request and guide you through the next steps.",
    ctaBtnWishlist: "Open wishlist",
    ctaBtnContact: "Contact us",
    services: [
      {
        title: "BFM Search Engine",
        description:
          "Search Lazada Thailand products by keyword inside Buy For Me. See product images, titles, and THB/MMK prices, then save items to your wishlist in one tap.",
      },
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
    badge: "လေယာဉ်နှင့် ကုန်ကားဖြင့် နယ်စပ်ဖြတ်ကျော် ပို့ဆောင်ခြင်း",
    title: "မြန်မာနှင့် ထိုင်းကို ချိတ်ဆက်ပေးထားပါသည်။",
    heroDesc:
      "စျေးဝယ်ခြင်း၊ ပစ္စည်းပို့ခြင်းနှင့် လက်ခံခြင်းတို့ကို အဖွဲ့တစ်ဖွဲ့တည်းဖြင့် လွယ်ကူစွာ ဆောင်ရွက်နိုင်ပါသည်။ အွန်လိုင်းဝယ်ယူမှုမှ လေယာဉ်နှင့် ကုန်ကားဖြင့် နှစ်နိုင်ငံ ကုန်ပို့ခြင်းအထိ Buy For Me က ကူညီပေးပါသည်။",
    btnSave: "ပစ္စည်းများ ရှာဖွေရန်",
    btnChat: "ကျွန်ုပ်တို့နှင့် ဆက်သွယ်ရန်",
    heroPoints: ["ကုန်တင်လေယာဉ်", "ကုန်ကား", "စျေးဝယ် ကူညီမှု"],
    offerEyebrow: "စျေးဝယ်ခြင်း ပိုမိုလွယ်ကူစေရန်",
    offerTitle: "လိုအပ်သမျှကို တစ်နေရာတည်းတွင်",
    offerSubtitle: "ထိုင်းနှင့် မြန်မာကြား ယုံကြည်စိတ်ချစွာ စျေးဝယ်နိုင်ရန် ကိရိယာများနှင့် ဝန်ဆောင်မှုများ။",
    cargoEyebrow: "အသွားအပြန် ကုန်ပို့ခြင်း",
    cargoTitle: "လေယာဉ် သို့မဟုတ် ကုန်ကားဖြင့် ပို့ဆောင်နိုင်ပါသည်",
    cargoSubtitle:
      "နှစ်ဖက်စလုံးသို့ ပါဆယ်ပို့နိုင်ပါသည်။ လေကြောင်းနှင့် ကုန်ကားပို့ဆောင်မှုများကို ကျွန်ုပ်တို့က စီစဉ်ပေးပြီး အဆင့်တိုင်းကို ရှင်းလင်းစေပါသည်။",
    cargoRoutes: [
      {
        mode: "plane" as const,
        modeLabel: "ကုန်တင်လေယာဉ်",
        from: "ထိုင်း",
        to: "မြန်မာ",
        title: "ထိုင်းမှ မြန်မာသို့",
        description:
          "အွန်လိုင်းဝယ်ယူထားသော ပစ္စည်းများ၊ ကိုယ်ပိုင်ပါဆယ်များနှင့် ပို့ဆောင်ခွင့်ရှိသော ကုန်ပစ္စည်းများကို လေယာဉ်ဖြင့် မြန်မာနိုင်ငံသို့ ပို့ဆောင်နိုင်ပါသည်။",
        features: ["လေကြောင်း စီစဉ်ပေးခြင်း", "ပစ္စည်းများ စုစည်းပေးခြင်း", "ပို့ဆောင်မှု အကူအညီ"],
      },
      {
        mode: "truck" as const,
        modeLabel: "ကုန်ကား",
        from: "မြန်မာ",
        to: "ထိုင်း",
        title: "မြန်မာမှ ထိုင်းသို့",
        description:
          "ထိုင်းနိုင်ငံသို့ ပစ္စည်းပို့လိုပါသလား။ ပစ္စည်းအချက်အလက်များကို ပေးပို့ပါ၊ ကုန်ကားဖြင့် ပို့နိုင်သော နည်းလမ်းများကို ကျွန်ုပ်တို့ လမ်းညွှန်ပေးပါမည်။",
        features: ["ပစ္စည်း စစ်ဆေးပေးခြင်း", "ပို့ဆောင်လမ်းညွှန်မှု", "အခြေအနေ အကူအညီ"],
      },
    ],
    cargoNote: "ပို့ဆောင်နိုင်မှု၊ ကြာချိန်နှင့် ကုန်ကျစရိတ်သည် ပစ္စည်းအမျိုးအစား၊ အရွယ်အစား၊ အလေးချိန်နှင့် ပို့မည့်နေရာပေါ် မူတည်ပါသည်။",
    cargoCta: "ကုန်ပို့ခြင်းအကြောင်း မေးမြန်းရန်",
    howTitle: "မည်သို့ လုပ်ဆောင်သလဲ",
    howSubtitle: "ပစ္စည်းရှာဖွေခြင်းမှ လက်ခံရရှိသည်အထိ ရှင်းလင်းသော လုပ်ငန်းစဉ်။",
    trustBadge: "ယုံကြည်စိတ်ချရသော နယ်စပ်ဖြတ်ကျော် ဝန်ဆောင်မှု",
    ctaTitle: "နယ်စပ်ဖြတ်ကျော် ပို့ဆောင်ရန် အဆင်သင့်ဖြစ်ပြီလား?",
    ctaDesc:
      "သင်၏ စျေးဝယ်စာရင်း သို့မဟုတ် ကုန်ပို့အချက်အလက်များကို Messenger မှတစ်ဆင့် ပေးပို့ပါ။ ကျွန်ုပ်တို့က စစ်ဆေးပြီး နောက်တစ်ဆင့်ကို လမ်းညွှန်ပေးပါမည်။",
    ctaBtnWishlist: "ဝတ်ရှ်လစ် ဖွင့်ရန်",
    ctaBtnContact: "ဆက်သွယ်ရန်",
    services: [
      {
        title: "BFM ရှာဖွေရေး အင်ဂျင် (Search Engine)",
        description:
          "Buy For Me ထဲမှာ Lazada Thailand ကုန်ပစ္စည်းများကို သော့ချက်စာလုံးဖြင့် ရှာဖွေနိုင်ပါသည်။ ပစ္စည်းပုံ၊ အမည်နှင့် ထိုင်းဘတ်/မြန်မာကျပ် စျေးနှုန်းများကို ကြည့်ရှုပြီး တစ်ချက်နှိပ်ရုံဖြင့် ဝတ်ရှ်လစ်ထဲ သိမ်းဆည်းနိုင်ပါသည်။",
      },
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

const CARGO_MEDIA: Record<CargoMode, { src: string; alt: string }> = {
  plane: { src: cargoPlane, alt: "Cargo plane loading parcels" },
  truck: { src: cargoTruck, alt: "Cargo truck on the highway" },
};

const SERVICE_ICONS = [Search, BookmarkPlus, Globe2, MessageCircle, QrCode, Receipt, Truck];

export function OurServicePage() {
  const [lang, setLang] = useState<Lang>(() => {
    const saved = localStorage.getItem("bfm_service_lang");
    return saved === "en" ? "en" : "my";
  });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  const t = TRANSLATIONS[lang];

  function toggleLang(newLang: Lang) {
    setLang(newLang);
    localStorage.setItem("bfm_service_lang", newLang);
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-hidden bg-slate-50">
      <section className="relative isolate min-h-[88vh] overflow-hidden bg-slate-950">
        <img
          src={cargoHero}
          alt="Cargo plane flying above a cargo truck on a cross-border highway"
          className="bfm-kenburns absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/78 to-slate-950/25" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/40" />

        <div className="relative z-10 mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <span className="truncate text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70 sm:text-xs">
            English / မြန်မာ
          </span>
          <div className="inline-flex shrink-0 rounded-full bg-black/30 p-1 ring-1 ring-white/15 backdrop-blur-md">
            <button
              type="button"
              onClick={() => toggleLang("en")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                lang === "en" ? "bg-white text-slate-950 shadow-sm" : "text-white/70 hover:text-white"
              }`}
            >
              English
            </button>
            <button
              type="button"
              onClick={() => toggleLang("my")}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition-all ${
                lang === "my" ? "bg-white text-slate-950 shadow-sm" : "text-white/70 hover:text-white"
              }`}
            >
              မြန်မာ
            </button>
          </div>
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl items-end gap-10 px-4 pb-12 pt-10 sm:px-6 lg:grid-cols-[1.15fr_.85fr] lg:pb-16 lg:pt-20">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
              {t.badge}
            </div>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[1.08] tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
              {t.title}
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-slate-200 sm:text-lg">{t.heroDesc}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                to="/"
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-slate-950 shadow-xl shadow-slate-950/40 transition hover:-translate-y-0.5 hover:bg-indigo-50"
              >
                <Search className="h-4 w-4" />
                {t.btnSave}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={openMessengerChat}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 py-3.5 text-sm font-bold text-white backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-white/20"
              >
                <MessageCircle className="h-4 w-4" />
                {t.btnChat}
              </button>
            </div>
            <div className="mt-9 flex flex-wrap gap-x-6 gap-y-3">
              {t.heroPoints.map((point) => (
                <span key={point} className="inline-flex items-center gap-2 text-xs font-semibold text-white sm:text-sm">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                  {point}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            {t.cargoRoutes.map((route) => {
              const media = CARGO_MEDIA[route.mode];
              const Icon = route.mode === "plane" ? Plane : Truck;
              return (
                <a
                  key={route.title}
                  href="#cargo-routes"
                  className="group relative overflow-hidden rounded-3xl border border-white/15 bg-white/10 shadow-2xl shadow-slate-950/40 backdrop-blur-md"
                >
                  <img
                    src={media.src}
                    alt={media.alt}
                    className="h-36 w-full object-cover transition duration-700 group-hover:scale-105 sm:h-40 lg:h-44"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-white/70">{route.modeLabel}</p>
                      <p className="mt-1 text-sm font-extrabold text-white">{route.title}</p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-950">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                </a>
              );
            })}
          </div>
        </div>
      </section>

      <section id="cargo-routes" className="bg-slate-950 px-4 py-16 sm:px-6 sm:py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-300">{t.cargoEyebrow}</p>
            <h2 className="mt-3 text-3xl font-black tracking-tight text-white sm:text-4xl">{t.cargoTitle}</h2>
            <p className="mt-4 text-base leading-7 text-slate-300">{t.cargoSubtitle}</p>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {t.cargoRoutes.map((route) => {
              const media = CARGO_MEDIA[route.mode];
              const Icon = route.mode === "plane" ? Plane : Truck;
              return (
                <article key={route.title} className="group relative min-h-[32rem] overflow-hidden rounded-[2rem]">
                  <img
                    src={media.src}
                    alt={media.alt}
                    className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/55 to-slate-950/10" />
                  <div className="relative flex h-full min-h-[32rem] flex-col justify-end p-6 sm:p-8">
                    <div className="mb-auto flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-bold text-white backdrop-blur-md">
                        <Icon className="h-3.5 w-3.5" />
                        {route.modeLabel}
                      </span>
                      <span className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-white/80">
                        {route.from}
                        <ArrowRight className="h-3.5 w-3.5" />
                        {route.to}
                      </span>
                    </div>
                    <h3 className="mt-16 text-3xl font-black tracking-tight text-white">{route.title}</h3>
                    <p className="mt-3 max-w-lg text-sm leading-6 text-slate-200">{route.description}</p>
                    <div className="mt-6 grid gap-2 sm:grid-cols-3">
                      {route.features.map((feature) => (
                        <div
                          key={feature}
                          className="flex items-center gap-2 rounded-xl bg-white/12 px-3 py-2.5 text-xs font-bold text-white backdrop-blur-md"
                        >
                          <Check className="h-3.5 w-3.5 shrink-0 text-emerald-300" strokeWidth={3} />
                          {feature}
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={openMessengerChat}
                      className="mt-7 inline-flex w-fit items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-slate-950 transition hover:bg-indigo-50"
                    >
                      {t.cargoCta}
                      <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <p className="mt-6 max-w-2xl text-xs leading-5 text-slate-500">{t.cargoNote}</p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-10 max-w-2xl">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-600">{t.offerEyebrow}</p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t.offerTitle}</h2>
          <p className="mt-4 text-base leading-7 text-slate-600">{t.offerSubtitle}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {t.services.map(({ title, description }, idx) => {
            const Icon = SERVICE_ICONS[idx] || BookmarkPlus;
            return (
              <article
                key={title}
                className={`group rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm transition duration-300 hover:-translate-y-1 hover:border-indigo-200 hover:shadow-xl hover:shadow-slate-200/60 ${
                  idx === 0 ? "sm:col-span-2 lg:col-span-2" : ""
                }`}
              >
                <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white transition group-hover:bg-indigo-600">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-extrabold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="border-y border-slate-200/70 bg-slate-100/70 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 text-center">
            <h2 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">{t.howTitle}</h2>
            <p className="mt-3 text-sm text-slate-500 sm:text-base">{t.howSubtitle}</p>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            {t.steps.map(({ step, title, text }) => (
              <div key={step} className="relative rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <div className="mb-6 flex items-center justify-between">
                  <span className="text-4xl font-black tracking-tighter text-slate-200">0{step}</span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
                <h3 className="font-extrabold text-slate-950">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6 sm:py-20">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2rem] bg-slate-950 shadow-2xl">
          <img src={cargoHero} alt="" className="absolute inset-0 h-full w-full object-cover opacity-35" />
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/55" />
          <div className="relative flex flex-col gap-8 p-7 sm:p-12 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold text-indigo-200">
                <ShieldCheck className="h-3.5 w-3.5" />
                {t.trustBadge}
              </div>
              <h2 className="mt-5 max-w-2xl text-2xl font-black tracking-tight text-white sm:text-4xl">{t.ctaTitle}</h2>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">{t.ctaDesc}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                to="/wishlist"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/10 px-6 py-3.5 text-sm font-bold text-white transition hover:bg-white/15"
              >
                <Package className="h-4 w-4" />
                {t.ctaBtnWishlist}
              </Link>
              <button
                type="button"
                onClick={openMessengerChat}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-slate-950 transition hover:bg-indigo-50"
              >
                <MessageCircle className="h-4 w-4" />
                {t.ctaBtnContact}
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
