import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";
import type { FulfillmentOrder, FulfillmentItem } from "./fulfillment";

type ReportRow = Omit<FulfillmentOrder, "items" | "collected_at"> & {
  order_items: FulfillmentItem[];
  order_pickups: { collected_at: string } | { collected_at: string }[] | null;
};

export async function getFulfillmentReport(seasonId: string): Promise<FulfillmentOrder[]> {
  const orders: FulfillmentOrder[] = [];
  // Page the parent orders so larger seasons are never silently truncated.
  const pageSize = 200;
  let afterId: string | undefined;
  for (;;) {
    let query = supabaseAdmin
      .from("orders")
      .select(
        "id, customer_name, affiliated_player, affiliated_group, order_items(id, product_name, size_value, color_value, quantity), order_pickups(collected_at)",
      )
      .eq("season_id", seasonId)
      .eq("status", "paid")
      .eq("is_test", false)
      .order("id")
      .limit(pageSize);
    if (afterId) query = query.gt("id", afterId);
    const { data, error } = await query.returns<ReportRow[]>();
    if (error) throw new Error("Could not load packing and pickup reports");
    for (const row of data ?? []) {
      const pickup = Array.isArray(row.order_pickups) ? row.order_pickups[0] : row.order_pickups;
      orders.push({
        id: row.id,
        customer_name: row.customer_name,
        affiliated_player: row.affiliated_player,
        affiliated_group: row.affiliated_group,
        collected_at: pickup?.collected_at ?? null,
        items: (row.order_items ?? []).sort((a, b) =>
          `${a.product_name} ${a.size_value ?? ""} ${a.color_value ?? ""}`.localeCompare(
            `${b.product_name} ${b.size_value ?? ""} ${b.color_value ?? ""}`,
            "en",
            { numeric: true },
          ),
        ),
      });
    }
    if (!data || data.length < pageSize) break;
    afterId = data.at(-1)!.id;
  }
  return orders.sort((a, b) =>
    `${a.affiliated_group} ${a.affiliated_player} ${a.customer_name} ${a.id}`.localeCompare(
      `${b.affiliated_group} ${b.affiliated_player} ${b.customer_name} ${b.id}`,
      "en",
      { numeric: true },
    ),
  );
}
