import { supabase } from "@/lib/supabaseClient";

type Status = "pending" | "paid" | "fulfilled" | "cancelled";

export default async function AdminOrdersPage({ searchParams }: { searchParams: { status?: Status } }) {
  const status = (searchParams.status ?? "paid") as Status;
  let query = supabase
    .from("orders")
    .select("id, email, payment_method, status, amount_total_cents, paid_at, created_at")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data: orders } = await query;

  const tabs: Status[] = ["pending", "paid", "fulfilled", "cancelled"];

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Orders</h2>
      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <a
            key={t}
            href={`?status=${t}`}
            className={`rounded-md border px-3 py-1.5 text-sm capitalize hover:bg-muted ${
              t === status ? "bg-muted" : ""
            }`}
          >
            {t}
          </a>
        ))}
      </div>

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
            {(orders ?? []).map((o) => (
              <tr key={o.id} className="border-t border-border">
                <td className="px-4 py-2 text-muted-foreground">{o.id.slice(0, 8)}</td>
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
                <td className="px-4 py-2 text-muted-foreground">{o.paid_at ?? "-"}</td>
                <td className="px-4 py-2 text-muted-foreground">{o.created_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


