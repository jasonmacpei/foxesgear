import Link from "next/link";
import { AdminGuard } from "@/components/AdminGuard";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="container py-10">
      <h1 className="mb-6 text-2xl font-bold tracking-tight">Admin</h1>

      {/* Mobile top nav */}
      <nav className="mb-6 flex gap-3 text-sm md:hidden" aria-label="Admin">
        <Link href="/admin" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
          Dashboard
        </Link>
        <Link href="/admin/products" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
          Products
        </Link>
        <Link href="/admin/orders" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
          Orders
        </Link>
        <Link href="/admin/reports" className="rounded-md border border-border px-3 py-1.5 hover:bg-muted">
          Reports
        </Link>
      </nav>

      <AdminGuard>
        <div className="grid gap-8 md:grid-cols-[220px_1fr]">
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
            </nav>
          </aside>
          <section>{children}</section>
        </div>
      </AdminGuard>
    </div>
  );
}


