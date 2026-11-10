import Link from "next/link";
import { requireAdminPage } from "@/lib/adminAuth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdminPage();
  return (
    <div className="container py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Admin</h1>

      {/* Mobile top nav */}
      <nav className="mb-6 flex flex-wrap gap-3 text-sm md:hidden" aria-label="Admin">
        <Link href="/admin" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
          Dashboard
        </Link>
        <Link
          href="/admin/products"
          className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
        >
          Products
        </Link>
        <Link
          href="/admin/orders"
          className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
        >
          Orders
        </Link>
        <Link
          href="/admin/reports"
          className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
        >
          Reports
        </Link>
        <Link
          href="/admin/users"
          className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
        >
          Users
        </Link>
        <Link
          href="/admin/seasons"
          className="rounded-md border border-border px-3 py-1.5 hover:bg-muted"
        >
          Seasons
        </Link>
      </nav>

      <div className="grid min-w-0 grid-cols-1 gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="hidden rounded-lg border border-border bg-card p-4 md:block">
          <nav className="flex flex-col gap-1 text-sm" aria-label="Admin sidebar">
            <Link href="/admin" className="rounded-md px-3 py-2 hover:bg-muted">
              Dashboard
            </Link>
            <Link href="/admin/products" className="rounded-md px-3 py-2 hover:bg-muted">
              Products
            </Link>
            <Link href="/admin/orders" className="rounded-md px-3 py-2 hover:bg-muted">
              Orders
            </Link>
            <Link href="/admin/reports" className="rounded-md px-3 py-2 hover:bg-muted">
              Reports
            </Link>
            <Link href="/admin/users" className="rounded-md px-3 py-2 hover:bg-muted">
              Users
            </Link>
            <Link href="/admin/seasons" className="rounded-md px-3 py-2 hover:bg-muted">
              Seasons
            </Link>
          </nav>
        </aside>
        <section className="min-w-0">{children}</section>
      </div>
    </div>
  );
}
