import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stripe } from "@/lib/stripeClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toCsv(rows: any[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replaceAll("\"", "\"\"")}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) lines.push(headers.map((h) => escape((r as any)[h])).join(","));
  return lines.join("\n") + "\n";
}

export async function GET(req: NextRequest) {
  // Aggregate sales from our DB (paid orders only)
  const { data: items, error } = await supabaseAdmin
    .from("order_items")
    .select("product_name, line_total_cents, quantity")
    .order("product_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const productTo = new Map<string, { revenue_cents: number; qty: number }>();
  for (const it of items ?? []) {
    const entry = productTo.get(it.product_name) ?? { revenue_cents: 0, qty: 0 };
    entry.revenue_cents += (it.line_total_cents as number);
    entry.qty += (it.quantity as number);
    productTo.set(it.product_name, entry);
  }
  const rows = Array.from(productTo.entries()).map(([product_name, v]) => ({
    product_name,
    revenue: (v.revenue_cents / 100).toFixed(2),
    qty: v.qty,
  }));

  // Stripe fees: best-effort estimate via balance transactions if key has permission
  let stripeFees = null as null | { gross: number; fee: number; net: number };
  try {
    // Sum last 100 balance transactions
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
    stripeFees = { gross: gross / 100, fee: fee / 100, net: net / 100 };
  } catch {
    // ignore if permissions do not allow
  }

  const csv = toCsv(rows);
  const summary = stripeFees
    ? `\nSummary:,Gross,${stripeFees.gross.toFixed(2)},Fee,${stripeFees.fee.toFixed(2)},Net,${stripeFees.net.toFixed(2)}\n`
    : "\nSummary:,Stripe fees unavailable (insufficient permissions)\n";

  return new NextResponse(csv + summary, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=sales_summary.csv",
    },
  });
}


