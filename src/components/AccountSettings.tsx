"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { updateProfile, changePassword } from "@/lib/actions";
import { ThemeChooser } from "@/components/ThemeChooser";

type Msg = { type: "ok" | "err"; text: string } | null;

export function AccountSettings({
  initial,
}: {
  initial: { name: string; email: string; image: string; hasPassword: boolean };
}) {
  const router = useRouter();
  const { update } = useSession();

  // Profile
  const [name, setName] = useState(initial.name);
  const [image, setImage] = useState(initial.image);
  const [profilePending, setProfilePending] = useState(false);
  const [profileMsg, setProfileMsg] = useState<Msg>(null);

  // Password
  const [current, setCurrent] = useState("");
  const [next1, setNext1] = useState("");
  const [next2, setNext2] = useState("");
  const [pwPending, setPwPending] = useState(false);
  const [pwMsg, setPwMsg] = useState<Msg>(null);

  const previewImage = /^https?:\/\//i.test(image.trim()) ? image.trim() : null;
  const initialLetter = (name || initial.email).charAt(0).toUpperCase();

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfilePending(true);
    setProfileMsg(null);
    const res = await updateProfile(name, image);
    setProfilePending(false);
    if (res.ok) {
      await update({ name: res.name, image: res.image });
      setProfileMsg({ type: "ok", text: "Profile saved." });
      router.refresh();
    } else {
      setProfileMsg({ type: "err", text: res.error });
    }
  }

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (next1 !== next2) {
      setPwMsg({ type: "err", text: "The new passwords don't match." });
      return;
    }
    setPwPending(true);
    setPwMsg(null);
    const res = await changePassword(current, next1);
    setPwPending(false);
    if (res.ok) {
      setPwMsg({ type: "ok", text: "Password updated." });
      setCurrent("");
      setNext1("");
      setNext2("");
    } else {
      setPwMsg({ type: "err", text: res.error });
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-10">
      {/* Profile */}
      <section>
        <h2 className="font-title text-xl">Profile</h2>
        <form onSubmit={saveProfile} className="mt-3 flex flex-col gap-4">
          <div className="flex items-center gap-4">
            {previewImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewImage}
                alt="Profile picture preview"
                className="h-16 w-16 shrink-0 rounded-full border border-line object-cover"
              />
            ) : (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-2xl font-semibold uppercase">
                {initialLetter}
              </span>
            )}
            <div className="text-sm text-muted">
              Signed in as <span className="text-ink">{initial.email}</span>
            </div>
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="label-caps">Display name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="field-input"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="label-caps">Profile picture URL</span>
            <input
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://…"
              className="field-input"
            />
            <span className="text-xs text-muted">
              Paste a link to an image. Leave blank to use your initial.
            </span>
          </label>

          {profileMsg && (
            <p className={`text-sm ${profileMsg.type === "ok" ? "text-accent" : "text-hot"}`}>
              {profileMsg.text}
            </p>
          )}
          <div>
            <button
              type="submit"
              disabled={profilePending}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
            >
              {profilePending ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </section>

      {/* Appearance */}
      <section>
        <h2 className="font-title text-xl">Appearance</h2>
        <p className="mt-1 text-sm text-muted">
          Choose light or dark, or follow your device setting.
        </p>
        <div className="mt-3">
          <ThemeChooser />
        </div>
      </section>

      {/* Password */}
      <section>
        <h2 className="font-title text-xl">
          {initial.hasPassword ? "Change password" : "Set a password"}
        </h2>
        {!initial.hasPassword && (
          <p className="mt-1 text-sm text-muted">
            You currently sign in with Google. Set a password to also sign in with your
            email.
          </p>
        )}
        <form onSubmit={savePassword} className="mt-3 flex max-w-sm flex-col gap-4">
          {initial.hasPassword && (
            <label className="flex flex-col gap-1.5">
              <span className="label-caps">Current password</span>
              <input
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                className="field-input"
              />
            </label>
          )}
          <label className="flex flex-col gap-1.5">
            <span className="label-caps">New password</span>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={next1}
              onChange={(e) => setNext1(e.target.value)}
              className="field-input"
            />
            <span className="text-xs text-muted">At least 8 characters.</span>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="label-caps">Confirm new password</span>
            <input
              type="password"
              autoComplete="new-password"
              value={next2}
              onChange={(e) => setNext2(e.target.value)}
              className="field-input"
            />
          </label>
          {pwMsg && (
            <p className={`text-sm ${pwMsg.type === "ok" ? "text-accent" : "text-hot"}`}>
              {pwMsg.text}
            </p>
          )}
          <div>
            <button
              type="submit"
              disabled={pwPending || !next1}
              className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
            >
              {pwPending ? "Saving…" : initial.hasPassword ? "Change password" : "Set password"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
