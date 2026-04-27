"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { login } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    // Mimic an async call so the button has a loading frame.
    setTimeout(() => {
      if (login(password)) {
        router.replace("/dashboard");
      } else {
        setError("Incorrect password.");
        setSubmitting(false);
      }
    }, 250);
  };

  return (
    <main className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
      {/* Left: form */}
      <div className="flex items-center justify-center px-6 py-12 surface-grid">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-10 flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-ink-900 text-white">
              <svg
                viewBox="0 0 16 16"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              >
                <rect x="2" y="2" width="12" height="12" rx="1.5" />
                <path d="M2 6h12M6 2v12" />
              </svg>
            </div>
            <div>
              <div className="font-display text-lg font-semibold leading-none tracking-tight">
                Control Sheet
              </div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500">
                Automation Portal
              </div>
            </div>
          </div>

          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight text-ink-900">
            Sign in
          </h1>
          <p className="mt-2 text-sm text-ink-600">
            Internal access only. Contact ops if you need credentials.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div>
              <label htmlFor="email" className="label">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@company.com"
                className="input"
                disabled={submitting}
                defaultValue="ops@company.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="label">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input"
                disabled={submitting}
                required
              />
            </div>

            {error && (
              <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={submitting}>
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-8 text-xs text-ink-500">
            Placeholder authentication. Replace with SSO or Supabase Auth before
            production.
          </p>
        </div>
      </div>

      {/* Right: editorial panel */}
      <aside className="relative hidden overflow-hidden bg-ink-900 text-white lg:block">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "radial-gradient(circle at 30% 20%, rgba(99,102,241,0.45), transparent 50%), radial-gradient(circle at 70% 80%, rgba(56,189,248,0.25), transparent 55%)",
          }}
        />
        <div className="relative flex h-full flex-col justify-between p-12">
          <div className="text-[11px] uppercase tracking-[0.22em] text-white/60">
            Internal Operations
          </div>

          <div>
            <p className="font-display text-3xl leading-tight tracking-tight">
              <span className="italic text-white/70">“</span>
              Process a quarter&apos;s worth of control sheets in the time it
              used to take to open one.
              <span className="italic text-white/70">”</span>
            </p>
            <div className="mt-6 text-xs uppercase tracking-[0.18em] text-white/50">
              Risk &amp; Controls Team
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 text-xs text-white/60">
            <Stat value="100%" label="Style preserved" />
            <Stat value="<1s" label="Avg. process time" />
            <Stat value="∞" label="Audit history" />
          </div>
        </div>
      </aside>
    </main>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border-t border-white/10 pt-4">
      <div className="font-display text-2xl font-semibold text-white">
        {value}
      </div>
      <div className="mt-1 uppercase tracking-wider">{label}</div>
    </div>
  );
}
