import { NextRequest, NextResponse } from "next/server";
import { checkAdminRequest } from "@/lib/adminAuth";
import { resolveSeason } from "@/lib/seasons";
import { getSeasonReport } from "@/lib/seasonReports";
import { toCsv } from "@/lib/csv";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(req: NextRequest) {
  const access = await checkAdminRequest(req);
  if (access.response) return access.response;
  const selection = await resolveSeason(req.nextUrl.searchParams.get("season") ?? undefined).catch(
    () => null,
  );
  if (!selection) return NextResponse.json({ error: "Season not found" }, { status: 404 });
  const { season } = selection;
  const report = await getSeasonReport(season.id);
  const rows = report.sales.map((r) => ({
    season: season.name,
    product_name: r.product_name,
    revenue: (r.revenue_cents / 100).toFixed(2),
    qty: r.qty,
  }));
  const summary = toCsv([
    { season: season.name, metric: "Paid live orders", value: report.orderCount },
    { season: season.name, metric: "Revenue CAD", value: (report.revenueCents / 100).toFixed(2) },
    {
      season: season.name,
      metric: "Stripe fees CAD",
      value: report.feeCents === null ? "Unavailable" : (report.feeCents / 100).toFixed(2),
    },
    {
      season: season.name,
      metric: "Net CAD",
      value: report.netCents === null ? "Unavailable" : (report.netCents / 100).toFixed(2),
    },
  ]);
  return new NextResponse(
    (rows.length ? toCsv(rows) : "season,product_name,revenue,qty\n") + "\n" + summary,
    {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Content-Disposition": `attachment; filename=sales_${season.starts_on.slice(0, 4)}.csv`,
      },
    },
  );
}
