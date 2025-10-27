import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OrdersTableClient from "./OrdersTableClient";

export const dynamic = "force-dynamic";

type Status = "pending" | "paid" | "fulfilled" | "cancelled";
type EnvFilter = "all" | "prod" | "test";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: Status; env?: EnvFilter };
}) {
  const status = (searchParams.status ?? "paid") as Status;
  const env = (searchParams.env ?? "all") as EnvFilter;

  let query = supabaseAdmin
    .from("orders")
    .select("id, email, payment_method, status, amount_total_cents, paid_at, created_at, is_test, stripe_session_id")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data: rawOrders } = await query;

  const orders = (rawOrders ?? []).filter((o: any) => {
    const isTest = Boolean(o.is_test) || (o.stripe_session_id?.startsWith("cs_test_") ?? false);
    if (env === "prod") return !isTest;
    if (env === "test") return isTest;
    return true;
  });

  const tabs: Status[] = ["pending", "paid", "fulfilled", "cancelled"];
  const envTabs: { key: EnvFilter; label: string }[] = [
    { key: "prod", label: "Non-test" },
    { key: "test", label: "Test" },
    { key: "all", label: "All" },
  ];

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Orders</h2>
      {/* Simple Atlantic timezone formatter */}
      {(() => {
        return null;
      })()}
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <a
            key={t}
            href={`?status=${t}&env=${env}`}
            className={`rounded-md border px-3 py-1.5 text-sm capitalize hover:bg-muted ${
              t === status ? "bg-muted" : ""
            }`}
          >
            {t}
          </a>
        ))}
        <span className="mx-2 inline-block h-6 w-px self-center bg-border" />
        {envTabs.map((e) => (
          <a
            key={e.key}
            href={`?status=${status}&env=${e.key}`}
            className={`rounded-md border px-3 py-1.5 text-sm hover:bg-muted ${
              e.key === env ? "bg-muted" : ""
            }`}
          >
            {e.label}
          </a>
        ))}
      </div>

      <OrdersTableClient orders={orders} />
    </div>
  );
}


