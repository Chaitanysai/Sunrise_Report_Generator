"use client";

/**
 * AuthGuard is now a pass-through component as authentication has been removed.
 */
export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
