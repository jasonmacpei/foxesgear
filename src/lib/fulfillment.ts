export type FulfillmentItem = {
  id: string;
  product_name: string;
  size_value: string | null;
  color_value: string | null;
  quantity: number;
};

export type FulfillmentOrder = {
  id: string;
  customer_name: string;
  affiliated_player: string;
  affiliated_group: string;
  collected_at: string | null;
  items: FulfillmentItem[];
};

export function orderLabel(id: string) {
  return id.slice(0, 8).toUpperCase();
}

export function groupLabel(order: FulfillmentOrder) {
  return order.affiliated_group.trim() || "No group recorded";
}

export function collectionDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Halifax",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function groupOrders(orders: FulfillmentOrder[]) {
  const groups = new Map<string, FulfillmentOrder[]>();
  for (const order of orders) {
    const group = groupLabel(order);
    const existing = groups.get(group);
    if (existing) existing.push(order);
    else groups.set(group, [order]);
  }
  return Array.from(groups, ([name, orders]) => ({ name, orders })).sort((a, b) =>
    a.name.localeCompare(b.name, "en", { numeric: true }),
  );
}
