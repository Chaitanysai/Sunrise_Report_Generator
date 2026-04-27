"use client";

import Link from "next/link";

export default function Header() {
  return (
    <header className="border-b border-ink-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Logomark />
          <div>
            <div className="font-display text-lg font-semibold leading-none tracking-tight text-ink-900">
              Control Sheet
            </div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-ink-500">
              Automation Portal
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
}

function Logomark() {
  return (
    <div className="grid h-9 w-9 place-items-center rounded-md bg-ink-900 text-white">
      <svg
        viewBox="0 0 16 16"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="2" y="2" width="12" height="12" rx="1.5" />
        <path d="M2 6h12M6 2v12" />
      </svg>
    </div>
  );
}
