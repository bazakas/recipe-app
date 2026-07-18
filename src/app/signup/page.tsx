"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AuthShell } from "@/components/AuthShell";
import { GoogleButton } from "@/components/GoogleButton";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await fetch("/api/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Couldn't create your account.");
      setPending(false);
      return;
    }
    // Auto sign-in after successful signup.
    await signIn("credentials", { email, password, redirect: false });
    setPending(false);
    router.push("/");
    router.refresh();
  }

  return (
    <AuthShell title="Create your account" subtitle="Start saving and scaling recipes.">
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <span className="label-caps">Name (optional)</span>
          <input
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="auth-input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-caps">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="auth-input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-caps">Password</span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="auth-input"
          />
          <span className="text-xs text-muted">At least 8 characters.</span>
        </label>
        {error && <p className="text-sm text-hot">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="mt-1 rounded-lg bg-accent px-4 py-2.5 font-semibold text-accent-fg disabled:opacity-60"
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>
      <GoogleButton callbackUrl="/" />
      <p className="mt-6 text-sm text-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-accent underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
