import { useState } from "react";
import { ChevronDown, ExternalLink } from "lucide-react";
import { PLATFORM_CATEGORIES, type ThailandPlatform } from "../lib/thPlatforms";

function PlatformLogo({ name, logo, color }: { name: string; logo: string; color: string }) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-bold text-white sm:h-11 sm:w-11"
        style={{ backgroundColor: color }}
      >
        {name.charAt(0)}
      </div>
    );
  }

  return (
    <img
      src={logo}
      alt=""
      className="h-10 w-10 rounded-xl bg-white object-contain p-1 sm:h-11 sm:w-11"
      onError={() => setFailed(true)}
    />
  );
}

function PlatformCard({ platform }: { platform: ThailandPlatform }) {
  return (
    <a
      href={platform.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex items-center gap-2.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 transition hover:border-white/20 hover:bg-white/10 sm:flex-col sm:gap-2 sm:px-3 sm:py-3 sm:text-center"
    >
      <PlatformLogo name={platform.name} logo={platform.logo} color={platform.color} />
      <div className="min-w-0 flex-1 sm:flex-none">
        <p className="truncate text-sm font-semibold text-white">{platform.name}</p>
        <p className="hidden items-center gap-0.5 text-[10px] text-slate-400 group-hover:text-slate-300 sm:inline-flex">
          Visit
          <ExternalLink className="h-2.5 w-2.5" />
        </p>
      </div>
    </a>
  );
}

export function PlatformShowcase() {
  const [open, setOpen] = useState(false);
  const [activeCategoryId, setActiveCategoryId] = useState(PLATFORM_CATEGORIES[0].id);

  const activeCategory =
    PLATFORM_CATEGORIES.find((category) => category.id === activeCategoryId) ??
    PLATFORM_CATEGORIES[0];

  return (
    <div className="mt-4 sm:mt-5">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-400 transition hover:text-slate-200"
      >
        <span>{open ? "Hide platforms" : "Show platforms"}</span>
        <ChevronDown
          className={`h-4 w-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm sm:p-4">
            <p className="mb-3 text-left text-xs text-slate-400">
              Popular Thailand shops — pick a category, then tap a shop to browse
            </p>

            {/* Category tabs — single scrollable row */}
            <div
              className="mb-4 flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 [&::-webkit-scrollbar]:hidden"
              role="tablist"
              aria-label="Platform categories"
            >
              {PLATFORM_CATEGORIES.map((category) => {
                const isActive = category.id === activeCategoryId;
                return (
                  <button
                    key={category.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveCategoryId(category.id)}
                    className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold transition sm:px-4 sm:py-2 sm:text-sm ${
                      isActive
                        ? "bg-white text-slate-900 shadow-sm"
                        : "border border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    {category.label}
                  </button>
                );
              })}
            </div>

            {/* Shops for active category */}
            <div role="tabpanel" aria-label={activeCategory.label}>
              <div
                className={`grid gap-2 sm:gap-3 ${
                  activeCategory.platforms.length === 1
                    ? "grid-cols-1 sm:max-w-[160px]"
                    : "grid-cols-2 sm:grid-cols-4"
                }`}
              >
                {activeCategory.platforms.map((platform) => (
                  <PlatformCard key={platform.id} platform={platform} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
