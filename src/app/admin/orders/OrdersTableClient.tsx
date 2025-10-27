"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Order = {
  id: string;
  email: string;
  payment_method: string;
  status: string;
  amount_total_cents: number;
  paid_at?: string | null;
  created_at: string;
  is_test?: boolean;
};

export default function OrdersTableClient({ orders }: { orders: Order[] }) {
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedOrder) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from("order_items")
        .select("product_name, size_value, color_value, quantity, unit_price_cents, line_total_cents")
        .eq("order_id", selectedOrder.id)
        .order("product_name");
      if (!cancelled) {
        setItems(data ?? []);
        setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [selectedOrder]);

  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead className="bg-muted/60 text-muted-foreground">
          <tr>
            <th className="px-4 py-2 text-left font-medium">Order</th>
            <th className="px-4 py-2 text-left font-medium">Email</th>
            <th className="px-4 py-2 text-left font-medium">Payment</th>
            <th className="px-4 py-2 text-left font-medium">Status</th>
            <th className="px-4 py-2 text-left font-medium">Total</th>
            <th className="px-4 py-2 text-left font-medium">Paid</th>
            <th className="px-4 py-2 text-left font-medium">Created</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr
              key={o.id}
              className="cursor-pointer border-t border-border hover:bg-muted/50"
              onClick={() => setSelectedOrder(o)}
            >
              <td className="px-4 py-2 text-muted-foreground">
                {o.id.slice(0, 8)}
                {o.is_test ? (
                  <span className="ml-2 inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium text-yellow-800">
                    Test
                  </span>
                ) : null}
              </td>
              <td className="px-4 py-2">{o.email}</td>
              <td className="px-4 py-2 capitalize">{o.payment_method}</td>
              <td className="px-4 py-2 capitalize">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    o.status === "paid"
                      ? "bg-primary/10 text-foreground"
                      : o.status === "fulfilled"
                        ? "bg-muted text-foreground"
                        : o.status === "pending"
                          ? "bg-muted text-muted-foreground"
                          : "bg-muted text-muted-foreground"
                  }`}
                >
                  {o.status}
                </span>
              </td>
              <td className="px-4 py-2">${(o.amount_total_cents / 100).toFixed(2)}</td>
              <td className="px-4 py-2 text-muted-foreground">
                {o.paid_at
                  ? new Date(o.paid_at).toLocaleString("en-CA", {
                      timeZone: "America/Halifax",
                      year: "numeric",
                      month: "short",
                      day: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "-"}
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {new Date(o.created_at).toLocaleString("en-CA", {
                  timeZone: "America/Halifax",
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {selectedOrder ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={() => setSelectedOrder(null)}>
          <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
            <div className="mb-3 flex items-center justify-between">
              <div className="text-lg font-semibold">Order {selectedOrder.id.slice(0, 8)}</div>
              <button className="rounded-md border border-border px-2 py-1 text-sm hover:bg-muted" onClick={() => setSelectedOrder(null)}>
                Close
              </button>
            </div>
            <div className="mb-3 text-sm text-muted-foreground">{selectedOrder.email}</div>
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2">Qty</th>
                  <th className="px-3 py-2 text-right">Price</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td className="px-3 py-3" colSpan={4}>
                      Loading…
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={`${it.product_name}-${it.size_value}-${it.color_value}`}>
                      <td className="px-3 py-2">
                        {it.product_name}
                        <div className="text-xs text-muted-foreground">
                          {[it.size_value ? `Size: ${it.size_value}` : null, it.color_value ? `Color: ${it.color_value}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">{it.quantity}</td>
                      <td className="px-3 py-2 text-right">${(it.unit_price_cents / 100).toFixed(2)}</td>
                      <td className="px-3 py-2 text-right">${(it.line_total_cents / 100).toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  );
}


