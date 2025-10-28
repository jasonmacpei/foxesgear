import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stripe } from "@/lib/stripeClient";

function fmt(n: number) {
  return `$${(n / 100).toFixed(2)}`;
}

export default async function AdminReportsPage() {
  const { data: printerRaw } = await supabaseAdmin
    .from("order_items")
    .select("product_name, size_value, color_value, quantity, orders!inner(status)")
    .eq("orders.status", "paid")
    .order("product_name")
    .order("size_value")
    .order("color_value");

  const groupKey = (r: any) => `${r.product_name}|${r.size_value ?? ""}|${r.color_value ?? ""}`;
  const grouped = new Map<string, number>();
  for (const r of printerRaw ?? []) {
    grouped.set(groupKey(r), (grouped.get(groupKey(r)) ?? 0) + (r.quantity as number));
  }
  const printer = Array.from(grouped.entries()).map(([k, qty]) => {
    const [product_name, size, color] = k.split("|");
    return { product_name, size, color, qty };
  });

  const { data: salesRaw } = await supabaseAdmin
    .from("order_items")
    .select("product_name, line_total_cents, quantity, orders!inner(status)")
    .eq("orders.status", "paid")
    .order("product_name");
  const totals = new Map<string, { revenue_cents: number; qty: number }>();
  for (const r of salesRaw ?? []) {
    const t = totals.get(r.product_name) ?? { revenue_cents: 0, qty: 0 };
    t.revenue_cents += (r.line_total_cents as number);
    t.qty += (r.quantity as number);
    totals.set(r.product_name, t);
  }
  const sales = Array.from(totals.entries()).map(([product_name, v]) => ({
    product_name,
    revenue_cents: v.revenue_cents,
    qty: v.qty,
  }));

  const totalRevenueCents = sales.reduce((s, r) => s + r.revenue_cents, 0);

  // Best-effort Stripe fee summary (aggregated), optional if permissions allow
  let stripeSummary: { gross: number; fee: number; net: number } | null = null;
  try {
    const bt = await stripe.balanceTransactions.list({ limit: 100 });
    let gross = 0,
      fee = 0,
      net = 0;
    for (const t of bt.data) {
      if (t.type === "charge") {
        gross += t.amount;
        fee += t.fee ?? 0;
        net += t.net;
      }
    }
    stripeSummary = { gross: gross / 100, fee: fee / 100, net: net / 100 };
  } catch {
    stripeSummary = null;
  }

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold">Reports</h2>
      <div className="mb-4 flex gap-3">
        <a href="/api/reports/printer" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Export Printer CSV
        </a>
        <a href="/api/reports/sales" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Export Sales CSV
        </a>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="rounded-lg border border-border">
          <div className="border-b px-4 py-3 font-medium">Printer Summary</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-left">Size</th>
                <th className="px-3 py-2 text-left">Color</th>
                <th className="px-3 py-2 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {printer.map((r) => (
                <tr key={`${r.product_name}-${r.size}-${r.color}`} className="border-t border-border">
                  <td className="px-3 py-2">{r.product_name}</td>
                  <td className="px-3 py-2">{r.size}</td>
                  <td className="px-3 py-2">{r.color}</td>
                  <td className="px-3 py-2 text-right">{r.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg border border-border">
          <div className="border-b px-4 py-3 font-medium">Sales Summary</div>
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Product</th>
                <th className="px-3 py-2 text-right">Qty</th>
                <th className="px-3 py-2 text-right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((r) => (
                <tr key={r.product_name} className="border-t border-border">
                  <td className="px-3 py-2">{r.product_name}</td>
                  <td className="px-3 py-2 text-right">{r.qty}</td>
                  <td className="px-3 py-2 text-right">{fmt(r.revenue_cents)}</td>
                </tr>
              ))}
              <tr className="border-t border-border font-semibold">
                <td className="px-3 py-2 text-right" colSpan={2}>
                  Total
                </td>
                <td className="px-3 py-2 text-right">{fmt(totalRevenueCents)}</td>
              </tr>
            </tbody>
          </table>
          <div className="px-4 py-3 text-sm text-muted-foreground">
            {stripeSummary ? (
              <div>
                Stripe summary (recent): Gross ${stripeSummary.gross.toFixed(2)} · Fee ${stripeSummary.fee.toFixed(
                  2,
                )} · Net ${stripeSummary.net.toFixed(2)}
              </div>
            ) : (
              <div>Stripe fee summary unavailable (insufficient permissions).</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


