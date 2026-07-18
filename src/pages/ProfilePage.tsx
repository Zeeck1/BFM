import { type ChangeEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useOutletContext } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  Camera,
  CheckCircle2,
  Loader2,
  Mail,
  UserRound,
} from "lucide-react";
import type { AppOutletContext } from "../components/AppLayout";
import { userAvatarUrl, userDisplayName } from "../lib/auth";
import { supabase } from "../lib/supabase";
import { syncOwnerProfileInSharedLists } from "../lib/shareList";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

function safeFileName(file: File): string {
  const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
  return `${Date.now()}.${ext.replace(/[^a-z0-9]/g, "") || "jpg"}`;
}

function AvatarDisplay({
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
    <div className="relative mx-auto w-fit">
      <div className="rounded-full bg-white p-1.5 shadow-xl shadow-slate-900/15 ring-1 ring-slate-200">
        {showImage ? (
          <img
            src={preview!}
            alt={displayName}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="block h-28 w-28 rounded-full object-cover sm:h-32 sm:w-32"
          />
        ) : (
          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-4xl font-bold text-white sm:h-32 sm:w-32 sm:text-5xl">
            {initial}
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onChangePhoto}
        className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-lg ring-2 ring-white transition hover:bg-indigo-600"
        aria-label="Change photo"
      >
        <Camera className="h-4 w-4" />
      </button>
    </div>
  );
}

export function ProfilePage() {
  const { user } = useOutletContext<AppOutletContext>();
  const navigate = useNavigate();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
      return;
    }
    setDisplayName(userDisplayName(user));
    setAvatarPreview(userAvatarUrl(user));
  }, [user, navigate]);

  if (!user) return null;

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
    if (!user) return;
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Name cannot be empty.");
      return;
    }
    setSaving(true);
    setError("");
    setSaved(false);

    let nextAvatarUrl = userAvatarUrl(user);

    if (avatarFile) {
      const path = `${user.id}/${safeFileName(avatarFile)}`;
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, avatarFile, { cacheControl: "3600", upsert: true });

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
      .eq("id", user.id);

    if (profileUpdateError) {
      setError(profileUpdateError.message);
      return;
    }

    // Keep existing shared list rows in sync with the new name and/or avatar.
    void syncOwnerProfileInSharedLists(user.id, trimmedName, nextAvatarUrl ?? null);

    setAvatarFile(null);
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-10">
      {/* Back button */}
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="mb-6 flex items-center gap-2 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Edit Profile</h1>
        <p className="mt-1 text-sm text-slate-500">
          Update how your name and photo appear across BFM.
        </p>
      </div>

      {/* Avatar card */}
      <div className="mb-6 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 px-6 pb-8 pt-6 shadow-sm">
        <div className="pointer-events-none absolute inset-0 rounded-2xl bg-[radial-gradient(ellipse_at_top,rgba(99,102,241,0.22),transparent_55%)]" />
        <div className="relative">
          <AvatarDisplay
            preview={avatarPreview}
            initial={initial}
            displayName={displayName}
            onChangePhoto={openFilePicker}
          />
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={openFilePicker}
              className="text-sm font-semibold text-indigo-300 transition hover:text-white"
            >
              Change photo
            </button>
            <p className="mt-0.5 text-[11px] text-slate-500">JPG, PNG, or WebP · max 2MB</p>
          </div>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleAvatarChange}
        className="sr-only"
      />

      {/* Form card */}
      <div className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm">
        <div className="space-y-5">
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

      {/* Save button */}
      <div className="mt-4">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-slate-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}
