import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OrdersTableClient from "./OrdersTableClient";

export const dynamic = "force-dynamic";

type Status = "pending" | "paid" | "fulfilled" | "cancelled";
type EnvFilter = "all" | "prod" | "test";

export default async function AdminOrdersPage() {
  const { data: rawOrders } = await supabaseAdmin
    .from("orders")
    .select("id, email, payment_method, status, amount_total_cents, paid_at, created_at, is_test, stripe_session_id")
    .order("created_at", { ascending: false });

  const orders = rawOrders ?? [];

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Orders</h2>
      {/* All orders shown; buttons removed per request */}

      <OrdersTableClient orders={orders} />
    </div>
  );
}


