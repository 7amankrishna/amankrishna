"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, Loader2 } from "lucide-react";

/** Admin login via Supabase Auth (email + password). */
export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const form = new FormData(e.currentTarget);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });

    if (error) {
      setError("Sign-in failed. Check your email and password.");
      setLoading(false);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-6">
      <form onSubmit={onSubmit} className="g-border w-full max-w-sm space-y-4 p-8">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-10 items-center justify-center rounded-xl bg-violet/15 text-violet">
            <Lock className="size-5" />
          </span>
          <div>
            <h1 className="font-medium">Admin sign in</h1>
            <p className="text-sm text-muted">Portfolio dashboard</p>
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm focus:border-violet/60 focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-muted">Password</span>
          <input
            name="password"
            type="password"
            required
            className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-sm focus:border-violet/60 focus:outline-none"
          />
        </label>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-fg py-3 text-sm font-medium text-ink transition-colors hover:opacity-90 disabled:opacity-60"
        >
          {loading && <Loader2 className="size-4 animate-spin" />}
          Sign in
        </button>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>
    </main>
  );
}
