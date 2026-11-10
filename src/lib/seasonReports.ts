import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";

export async function getSeasonReport(seasonId: string) {
  const { data: items, error } = await supabaseAdmin
    .from("order_items")
    .select(
      "product_name, size_value, color_value, quantity, line_total_cents, orders!inner(status, season_id, is_test)",
    )
    .eq("orders.status", "paid")
    .eq("orders.season_id", seasonId)
    .eq("orders.is_test", false)
    .order("product_name")
    .order("size_value")
    .order("color_value");
  if (error) throw new Error("Could not load season report");
  const { data: orders, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("amount_total_cents, stripe_fee_cents, stripe_net_cents")
    .eq("status", "paid")
    .eq("season_id", seasonId)
    .eq("is_test", false);
  if (orderError) throw new Error("Could not load season totals");
  const printer = new Map<
    string,
    { product_name: string; size: string; color: string; qty: number }
  >();
  const sales = new Map<string, { product_name: string; revenue_cents: number; qty: number }>();
  for (const item of items ?? []) {
    const key = JSON.stringify([item.product_name, item.size_value, item.color_value]);
    const p = printer.get(key) ?? {
      product_name: item.product_name,
      size: item.size_value ?? "",
      color: item.color_value ?? "",
      qty: 0,
    };
    p.qty += item.quantity;
    printer.set(key, p);
    const s = sales.get(item.product_name) ?? {
      product_name: item.product_name,
      revenue_cents: 0,
      qty: 0,
    };
    s.qty += item.quantity;
    s.revenue_cents += item.line_total_cents;
    sales.set(item.product_name, s);
  }
  const missingFees = (orders ?? []).filter(
    (o) => o.stripe_fee_cents == null || o.stripe_net_cents == null,
  ).length;
  return {
    printer: Array.from(printer.values()),
    sales: Array.from(sales.values()),
    orderCount: orders?.length ?? 0,
    revenueCents: (orders ?? []).reduce((sum, o) => sum + o.amount_total_cents, 0),
    feeCents: missingFees ? null : (orders ?? []).reduce((sum, o) => sum + o.stripe_fee_cents, 0),
    netCents: missingFees ? null : (orders ?? []).reduce((sum, o) => sum + o.stripe_net_cents, 0),
    missingFees,
  };
}
