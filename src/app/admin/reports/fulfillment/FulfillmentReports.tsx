"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Season } from "@/lib/seasons";
import {
  collectionDate,
  groupLabel,
  groupOrders,
  orderLabel,
  type FulfillmentOrder,
} from "@/lib/fulfillment";

const control = "rounded-md border border-border bg-background px-3 py-2 text-sm";

export function FulfillmentReports({
  season,
  orders,
  initialView,
}: {
  season: Season;
  orders: FulfillmentOrder[];
  initialView: "packing" | "pickup";
}) {
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [group, setGroup] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refreshing, startRefresh] = useTransition();
  const busy = !!saving || refreshing;
  const refreshOrders = () => startRefresh(() => router.refresh());

  const groups = groupOrders(orders);
  const collected = orders.filter((o) => o.collected_at).length;
  const term = search.trim().toLowerCase();
  const visible = orders.filter(
    (o) =>
      (!group || groupLabel(o) === group) &&
      (status === "all" || (status === "collected" ? !!o.collected_at : !o.collected_at)) &&
      (!term || `${o.customer_name} ${o.affiliated_player} ${o.id}`.toLowerCase().includes(term)),
  );

  async function savePickup(order: FulfillmentOrder) {
    setSaving(order.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/orders/${order.id}/pickup`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          seasonId: season.id,
          collected: !order.collected_at,
          expectedCollectedAt: order.collected_at,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        if (response.status === 409 || response.status === 404) refreshOrders();
        throw new Error(result.error || "Could not save pickup. Please try again.");
      }
      refreshOrders();
      setMessage(
        `Order ${orderLabel(order.id)} ${result.collectedAt ? "marked collected" : "marked awaiting pickup"}.`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save pickup. Please try again.");
    } finally {
      setSaving(null);
    }
  }

  return (
    <>
      <div className="report-controls space-y-4">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Report type">
          {(
            [
              ["pickup", "Pickup checklist"],
              ["packing", "Packing slips"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={view === value}
              className={`${control} ${view === value ? "bg-muted font-semibold" : ""}`}
              onClick={() => {
                setView(value);
                const url = new URL(window.location.href);
                url.searchParams.set("view", value);
                window.history.replaceState(null, "", url);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {orders.length} paid orders · {orders.length - collected} awaiting pickup · {collected}{" "}
          collected
        </p>
        <div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_minmax(0,1.2fr)_auto]">
          <label className="grid min-w-0 gap-1 text-sm">
            Group
            <select
              aria-label="Group"
              className={`${control} max-w-full`}
              value={group}
              onChange={(e) => setGroup(e.target.value)}
            >
              <option value="">All groups</option>
              {groups.map((g) => (
                <option key={g.name} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            Pickup status
            <select
              aria-label="Pickup status"
              className={control}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="all">All orders</option>
              <option value="awaiting">Awaiting pickup</option>
              <option value="collected">Collected</option>
            </select>
          </label>
          <label className="grid min-w-0 gap-1 text-sm">
            Find an order
            <input
              type="search"
              className={`${control} min-w-0`}
              placeholder="Player, customer or order number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </label>
          <button
            className={`${control} justify-self-start disabled:opacity-50`}
            type="button"
            disabled={!visible.length || busy}
            onClick={() => window.print()}
          >
            Print {view === "packing" ? "packing slips" : "pickup checklist"}
          </button>
        </div>
        <p className="text-sm text-muted-foreground">
          Printing includes only the orders shown below. Test and refunded orders are excluded.
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}{" "}
            <button className="underline" onClick={refreshOrders}>
              Refresh orders
            </button>
          </p>
        )}
        {message && (
          <p role="status" className="text-sm">
            {message}
          </p>
        )}
      </div>

      <div className="report-output mt-6">
        {!visible.length ? (
          <p className="rounded-lg border border-border p-4">
            {orders.length
              ? "No orders match these filters."
              : "No paid live orders for this season yet."}
          </p>
        ) : view === "packing" ? (
          visible.map((order) => (
            <article
              key={order.id}
              className="packing-slip mb-6 rounded-lg border border-border p-5"
              aria-label={`Packing slip ${orderLabel(order.id)}`}
            >
              <div className="mb-4 flex flex-wrap justify-between gap-2 border-b border-border pb-3">
                <div>
                  <h3 className="text-lg font-semibold">FoxesGear · Packing slip</h3>
                  <p className="text-sm">{season.name}</p>
                </div>
                <p className="font-semibold">Order {orderLabel(order.id)}</p>
              </div>
              <dl className="mb-5 grid gap-2 text-sm">
                <div>
                  <dt className="inline font-semibold">Customer: </dt>
                  <dd className="inline">{order.customer_name || "Not recorded"}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold">Player: </dt>
                  <dd className="inline">{order.affiliated_player || "Not recorded"}</dd>
                </div>
                <div>
                  <dt className="inline font-semibold">Group: </dt>
                  <dd className="inline">{groupLabel(order)}</dd>
                </div>
              </dl>
              {order.items.length ? (
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-2">Packed</th>
                      <th className="p-2">Item</th>
                      <th className="packing-variant-column p-2">Size</th>
                      <th className="packing-variant-column p-2">Colour</th>
                      <th className="p-2 text-right">Qty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id} className="border-b border-border">
                        <td className="p-2">
                          <span className="paper-checkbox" aria-label="Packed checkbox" />
                        </td>
                        <td className="p-2">
                          {item.product_name}
                          <span className="packing-variant-inline text-xs text-muted-foreground">
                            {[item.size_value, item.color_value].filter(Boolean).join(" · ")}
                          </span>
                        </td>
                        <td className="packing-variant-column p-2">{item.size_value || "—"}</td>
                        <td className="packing-variant-column p-2">{item.color_value || "—"}</td>
                        <td className="p-2 text-right">{item.quantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="font-semibold">No saved items — check this order before packing.</p>
              )}
              <p className="mt-4 text-right font-semibold">
                Total items: {order.items.reduce((n, i) => n + i.quantity, 0)}
              </p>
              <div className="mt-6 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span>Packed by: ____________________</span>
                <span>Date: ______________</span>
              </div>
              <p className="mt-3 text-sm">
                {order.collected_at
                  ? `Collected ${collectionDate(order.collected_at)} (Atlantic)`
                  : "Awaiting pickup"}
              </p>
              <p className="mt-3 break-all text-xs text-muted-foreground">
                Order reference: {order.id}
              </p>
            </article>
          ))
        ) : (
          <>
            <h3 className="mb-2 text-xl font-semibold">FoxesGear · Pickup checklist</h3>
            <p className="mb-4 text-sm">
              {season.name} · {visible.length} orders shown ·{" "}
              {status === "all"
                ? "All pickup statuses"
                : status === "collected"
                  ? "Collected"
                  : "Awaiting pickup"}
            </p>
            {groupOrders(visible).map((g) => (
              <section key={g.name} className="pickup-group mb-6" aria-label={g.name}>
                <h4 className="mb-2 font-semibold">
                  {g.name} · {g.orders.length} orders
                </h4>
                <div className="pickup-table-wrap overflow-x-auto rounded-lg border border-border">
                  <table role="table" className="pickup-table w-full text-left text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="p-3">Order / family</th>
                        <th className="p-3">Items</th>
                        <th className="p-3">Collection</th>
                      </tr>
                    </thead>
                    <tbody role="rowgroup">
                      {g.orders.map((order) => (
                        <tr
                          key={order.id}
                          role="row"
                          className="border-t border-border"
                          aria-label={`Order ${orderLabel(order.id)}`}
                        >
                          <td role="cell" className="p-3 align-top">
                            <p className="font-semibold">
                              {order.affiliated_player || "Player not recorded"}
                            </p>
                            <p>{order.customer_name || "Customer not recorded"}</p>
                            <p className="text-xs text-muted-foreground">{orderLabel(order.id)}</p>
                          </td>
                          <td role="cell" className="p-3 align-top">
                            {order.items.length ? (
                              <ul className="space-y-1">
                                {order.items.map((item) => (
                                  <li key={item.id}>
                                    {item.quantity} × {item.product_name}
                                    {item.size_value ? ` · ${item.size_value}` : ""}
                                    {item.color_value ? ` · ${item.color_value}` : ""}
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p>No saved items — check order</p>
                            )}
                          </td>
                          <td role="cell" className="p-3 align-top">
                            <p className="mb-2">
                              {order.collected_at
                                ? `Collected ${collectionDate(order.collected_at)} (Atlantic)`
                                : "Awaiting pickup"}
                            </p>
                            <button
                              type="button"
                              className={`${control} report-controls disabled:opacity-50`}
                              disabled={busy}
                              aria-label={`${order.collected_at ? "Undo collection for" : "Mark collected for"} order ${orderLabel(order.id)}`}
                              onClick={() => savePickup(order)}
                            >
                              {saving === order.id
                                ? "Saving…"
                                : order.collected_at
                                  ? "Undo collection"
                                  : "Mark collected"}
                            </button>
                            {!order.collected_at && (
                              <span className="print-pickup-box">
                                <span className="paper-checkbox" /> Collected
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
          </>
        )}
      </div>
    </>
  );
}
