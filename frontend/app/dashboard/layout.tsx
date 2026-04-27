import AuthGuard from "@/components/AuthGuard";
import Header from "@/components/Header";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-ink-50 surface-grid">
        <Header />
        <main className="mx-auto max-w-6xl px-6 py-10">{children}</main>
      </div>
    </AuthGuard>
  );
}
