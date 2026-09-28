import { Briefcase, Heart, QrCode, Search } from "lucide-react";
import { NavLink } from "react-router-dom";

export const APP_TABS = [
  { to: "/", label: "Search", shortLabel: "Search", icon: Search, end: true },
  { to: "/wishlist", label: "Wishlist", shortLabel: "Saved", icon: Heart, end: false },
  { to: "/qr-codes", label: "QR Codes", shortLabel: "QR", icon: QrCode, end: false },
  {
    to: "/our-service",
    label: "Our Service",
    shortLabel: "Service",
    icon: Briefcase,
    end: false,
  },
] as const;

function tabClassName(isActive: boolean, compact = false) {
  const base = compact
    ? "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 transition-colors sm:gap-1 sm:px-2 sm:py-2.5"
    : "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-all xl:gap-2 xl:px-4 xl:text-sm";

  if (isActive) {
    return compact ? base : `${base} bg-slate-950 text-white shadow-md shadow-slate-950/15`;
  }

  return compact ? base : `${base} text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm`;
}

function mobileLabelClass(isActive: boolean) {
  return `max-w-full truncate text-[10px] font-semibold leading-none tracking-wide sm:text-xs ${
    isActive ? "text-indigo-600" : "text-slate-600"
  }`;
}

interface AppTabsProps {
  wishlistCount?: number;
  variant?: "desktop" | "mobile";
  className?: string;
}

export function AppTabs({ wishlistCount = 0, variant = "desktop", className = "" }: AppTabsProps) {
  if (variant === "mobile") {
    return (
      <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(15,23,42,0.06)] backdrop-blur-xl lg:hidden"
        aria-label="Main navigation"
      >
        <div className="mx-auto flex w-full max-w-lg">
          {APP_TABS.map(({ to, shortLabel, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) => tabClassName(isActive, true)}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-xl transition-colors sm:h-9 sm:w-9 ${
                      isActive ? "bg-indigo-50" : ""
                    }`}
                  >
                    <Icon
                      className={`h-[18px] w-[18px] sm:h-5 sm:w-5 ${isActive ? "text-indigo-600" : "text-slate-500"}`}
                      strokeWidth={isActive ? 2.5 : 2}
                    />
                    {to === "/wishlist" && wishlistCount > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-indigo-600 px-0.5 text-[9px] font-bold leading-none text-white sm:h-[18px] sm:min-w-[18px] sm:px-1 sm:text-[10px]">
                        {wishlistCount > 99 ? "99+" : wishlistCount}
                      </span>
                    )}
                  </span>
                  <span className={mobileLabelClass(isActive)}>{shortLabel}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    );
  }

  return (
    <nav
      className={`hidden min-w-0 items-center gap-0.5 overflow-x-auto rounded-full border border-slate-200/80 bg-slate-100/80 p-1 shadow-inner [-ms-overflow-style:none] [scrollbar-width:none] lg:flex xl:gap-1 [&::-webkit-scrollbar]:hidden ${className}`}
      aria-label="Main navigation"
    >
      {APP_TABS.map(({ to, label, shortLabel, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end} className={({ isActive }) => tabClassName(isActive)}>
          {({ isActive }) => (
            <>
              <Icon className="h-3.5 w-3.5 shrink-0 xl:h-4 xl:w-4" strokeWidth={isActive ? 2.5 : 2} />
              {to === "/our-service" || to === "/qr-codes" ? (
                <>
                  <span className="hidden xl:inline">{label}</span>
                  <span className="xl:hidden">{shortLabel}</span>
                </>
              ) : (
                label
              )}
              {to === "/wishlist" && wishlistCount > 0 && (
                <span
                  className={`rounded-full px-1 py-0.5 text-[9px] font-bold xl:px-1.5 xl:text-[10px] ${
                    isActive ? "bg-white/20 text-white" : "bg-indigo-100 text-indigo-700"
                  }`}
                >
                  {wishlistCount}
                </span>
              )}
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
