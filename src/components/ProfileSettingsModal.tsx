import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  Loader2,
  Mail,
  UserRound,
  X,
} from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { userAvatarUrl, userDisplayName } from "../lib/auth";
import { supabase } from "../lib/supabase";

interface ProfileSettingsModalProps {
  open: boolean;
  user: SupabaseUser | null;
  onClose: () => void;
}

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function safeFileName(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return `${Date.now()}.${ext.replace(/[^a-z0-9]/g, "") || "jpg"}`;
}

function ProfileAvatar({
  preview,
  initial,
  displayName,
  onChangePhoto,
}: {
  preview: string | null;
  initial: string;
  displayName: string;
  onChangePhoto: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = Boolean(preview && !imgFailed);

  useEffect(() => {
    setImgFailed(false);
  }, [preview]);

  return (
    <div className="relative z-20 mx-auto w-fit">
      <div className="rounded-full bg-white p-1.5 shadow-xl shadow-slate-900/15 ring-1 ring-slate-200">
        {showImage ? (
          <img
            src={preview!}
            alt={displayName}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="block h-24 w-24 rounded-full object-cover sm:h-28 sm:w-28"
          />
        ) : (
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-3xl font-bold text-white sm:h-28 sm:w-28 sm:text-4xl">
            {initial}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onChangePhoto}
        className="absolute bottom-0.5 right-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg ring-2 ring-white transition hover:bg-indigo-600 sm:h-10 sm:w-10"
        aria-label="Change photo"
      >
        <Camera className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ProfileSettingsModal({ open, user, onClose }: ProfileSettingsModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open || !user) return;
    setDisplayName(userDisplayName(user));
    setAvatarFile(null);
    setAvatarPreview(userAvatarUrl(user));
    setError("");
    setSaved(false);
  }, [open, user]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || !user) return null;

  const currentUser = user;
  const initial = displayName.trim().charAt(0).toUpperCase() || "U";
  const email = user.email ?? "";

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setSaved(false);
    setError("");

    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      setError("Avatar image must be smaller than 2MB.");
      return;
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  }

  async function handleSave() {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Name cannot be empty.");
      return;
    }

    setSaving(true);
    setError("");
    setSaved(false);

    let nextAvatarUrl = userAvatarUrl(currentUser);

    if (avatarFile) {
      const path = `${currentUser.id}/${safeFileName(avatarFile)}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        setSaving(false);
        setError(uploadError.message);
        return;
      }

      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      nextAvatarUrl = data.publicUrl;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: {
        full_name: trimmedName,
        name: trimmedName,
        avatar_url: nextAvatarUrl,
        picture: nextAvatarUrl,
      },
    });

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ full_name: trimmedName, avatar_url: nextAvatarUrl })
      .eq("id", currentUser.id);

    if (profileUpdateError) {
      setError(profileUpdateError.message);
      return;
    }

    setAvatarFile(null);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 700);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={(e) => e.target === e.currentTarget && !saving && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-settings-title"
    >
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[1.75rem] bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl">
        {/* Header */}
        <div className="relative shrink-0 rounded-t-[1.75rem] bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-5 pb-8 pt-5 sm:rounded-t-2xl sm:px-6 sm:pb-10 sm:pt-6">
          <div className="pointer-events-none absolute inset-0 rounded-t-[1.75rem] bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.22),transparent_55%)] sm:rounded-t-2xl" />
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative z-10">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-medium text-indigo-200">
              <UserRound className="h-3 w-3" />
              Account settings
            </div>
            <h2 id="profile-settings-title" className="text-xl font-bold tracking-tight text-white">
              Edit Profile
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Update how your name and photo appear across BFM.
            </p>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleAvatarChange}
          className="sr-only"
        />

        {/* Avatar + form — avatar sits in document flow so it cannot be covered */}
        <div className="relative z-10 min-h-0 flex-1 overflow-y-auto bg-white px-5 pb-2 sm:px-6">
          <div className="-mt-14 mb-4 flex justify-center sm:-mt-16">
            <ProfileAvatar
              preview={avatarPreview}
              initial={initial}
              displayName={displayName}
              onChangePhoto={openFilePicker}
            />
          </div>

          <div className="mb-5 text-center">
            <button
              type="button"
              onClick={openFilePicker}
              className="text-sm font-semibold text-indigo-600 transition hover:text-indigo-500"
            >
              Change photo
            </button>
            <p className="mt-0.5 text-[11px] text-slate-400 sm:text-xs">
              JPG, PNG, or WebP · max 2MB
            </p>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <UserRound className="h-3.5 w-3.5" />
                Display name
              </span>
              <input
                value={displayName}
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  setSaved(false);
                }}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-indigo-300 focus:bg-white focus:ring-2 focus:ring-indigo-500/10"
                placeholder="Your name"
                autoComplete="name"
              />
            </label>

            {email && (
              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <Mail className="h-3.5 w-3.5" />
                  Email
                </span>
                <div className="flex items-center rounded-xl border border-slate-100 bg-slate-50/80 px-4 py-3">
                  <p className="min-w-0 truncate text-sm text-slate-500">{email}</p>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  Signed in with Google — email cannot be changed here.
                </p>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2.5 rounded-xl border border-red-100 bg-red-50 p-3.5">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
                <p className="text-sm leading-snug text-red-600">{error}</p>
              </div>
            )}

            {saved && (
              <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50 p-3.5">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                <p className="text-sm font-medium text-emerald-700">Profile updated successfully.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 rounded-b-[1.75rem] border-t border-slate-100 bg-white px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:rounded-b-2xl sm:px-6 sm:pb-4">
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="w-full rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 sm:flex-1"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-slate-700 disabled:opacity-50 sm:flex-1"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
