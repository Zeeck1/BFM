import { useState } from "react";
import type { AdminProfile } from "../../lib/admin";

export function AdminUserAvatar({
  user,
  className = "h-10 w-10",
}: {
  user: AdminProfile;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const name = user.full_name || user.username || user.email || "User";
  const initial = name.trim().charAt(0).toUpperCase() || "U";

  if (user.avatar_url && !failed) {
    return (
      <img
        src={user.avatar_url}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${className} shrink-0 rounded-full object-cover ring-2 ring-indigo-100`}
      />
    );
  }

  return (
    <div
      aria-label={name}
      className={`flex ${className} shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white ring-2 ring-indigo-100`}
    >
      {initial}
    </div>
  );
}
