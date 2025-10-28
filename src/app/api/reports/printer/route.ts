import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

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
  for (const r of rows) {
    lines.push(headers.map((h) => escape((r as any)[h])).join(","));
  }
  return lines.join("\n") + "\n";
}

export async function GET(req: NextRequest) {
  const { data, error } = await supabaseAdmin
    .from("order_items")
    .select("product_name, size_value, color_value, quantity, orders!inner(status)")
    .eq("orders.status", "paid")
    .order("product_name")
    .order("size_value")
    .order("color_value");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const grouped = new Map<string, number>();
  for (const r of data ?? []) {
    const key = `${r.product_name}||${r.size_value ?? ""}||${r.color_value ?? ""}`;
    grouped.set(key, (grouped.get(key) ?? 0) + (r.quantity as number));
  }
  const rows = Array.from(grouped.entries()).map(([k, qty]) => {
    const [product_name, size, color] = k.split("||");
    return { product_name, size, color, qty };
  });
  const csv = toCsv(rows);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": "attachment; filename=printer_summary.csv",
    },
  });
}


