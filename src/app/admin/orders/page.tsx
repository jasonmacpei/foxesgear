import { resolveSeason } from "@/lib/seasons";
import { SeasonSelector } from "@/components/SeasonSelector";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import OrdersTableClient from "./OrdersTableClient";

export const dynamic = "force-dynamic";

type Status = "pending" | "paid" | "fulfilled" | "cancelled";
type EnvFilter = "all" | "prod" | "test";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const selection = await resolveSeason(params.season).catch(() => null);
  if (!selection) notFound();
  const { seasons, season } = selection;
  const { data: rawOrders, error } = await supabaseAdmin
    .from("orders")
    .select(
      "id, email, payment_method, status, amount_total_cents, paid_at, created_at, is_test, stripe_session_id, customer_name, affiliated_player, affiliated_group",
    )
    .eq("season_id", season.id)
    .order("created_at", { ascending: false });

  if (error) throw new Error("Could not load orders");
  const orders = rawOrders ?? [];

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Orders</h2>
      <SeasonSelector seasons={seasons} selected={season.id} />

      <OrdersTableClient key={season.id} orders={orders} />
    </div>
  );
}
