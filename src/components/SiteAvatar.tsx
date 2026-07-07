interface SiteAvatarProps {
  name?: string;
  className?: string;
}

export function SiteAvatar({ name, className = "" }: SiteAvatarProps) {
  const letter = (name ?? "?").charAt(0).toUpperCase();
  const palettes = [
    "bg-violet-50 text-violet-400",
    "bg-indigo-50 text-indigo-400",
    "bg-sky-50 text-sky-400",
    "bg-emerald-50 text-emerald-400",
    "bg-orange-50 text-orange-400",
    "bg-rose-50 text-rose-400",
  ];
  const idx = letter.charCodeAt(0) % palettes.length;

  return (
    <div
      className={`flex h-full w-full items-center justify-center text-3xl font-bold ${palettes[idx]} ${className}`}
    >
      {letter}
    </div>
  );
}
