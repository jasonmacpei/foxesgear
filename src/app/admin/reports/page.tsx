import { requireAdminPage } from "@/lib/adminAuth";
import { resolveSeason } from "@/lib/seasons";
import { getSeasonReport } from "@/lib/seasonReports";
import { SeasonSelector } from "@/components/SeasonSelector";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";
const fmt = (n: number) => `$${(n / 100).toFixed(2)}`;

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const selection = await resolveSeason(params.season).catch(() => null);
  if (!selection) notFound();
  const { seasons, season } = selection;
  const report = await getSeasonReport(season.id);
  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Reports</h2>
      <SeasonSelector seasons={seasons} selected={season.id} />
      <p className="mb-4 text-sm text-muted-foreground">
        {season.name} · Paid live orders only. Test orders and refunded orders are excluded.
      </p>
      <div className="mb-6 flex flex-wrap gap-3">
        <a
          href={`/api/reports/printer?season=${season.id}`}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Export Printer CSV
        </a>
        <a
          href={`/api/reports/sales?season=${season.id}`}
          className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
        >
          Export Sales CSV
        </a>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground">Paid orders</div>
          <div className="text-xl font-semibold">{report.orderCount}</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground">Revenue</div>
          <div className="text-xl font-semibold">{fmt(report.revenueCents)}</div>
        </div>
        <div className="rounded-lg border border-border p-4">
          <div className="text-sm text-muted-foreground">Stripe fees</div>
          <div className="text-xl font-semibold">
            {report.feeCents === null ? "Unavailable" : fmt(report.feeCents)}
          </div>
        </div>
      </div>
      {report.missingFees > 0 && (
        <p className="mb-4 text-sm text-muted-foreground">
          Fee and net totals are unavailable because {report.missingFees} order(s) have no saved
          Stripe fee details.
        </p>
      )}
      {report.orderCount === 0 && (
        <p className="mb-4 rounded-lg border border-border p-4 text-sm">
          No paid live orders for this season yet.
        </p>
      )}
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="overflow-x-auto rounded-lg border border-border">
          <h3 className="border-b border-border px-4 py-3 font-semibold">Printer Summary</h3>
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-left">Size</th>
                <th className="p-3 text-left">Color</th>
                <th className="p-3 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {report.printer.map((r) => (
                <tr
                  key={JSON.stringify([r.product_name, r.size, r.color])}
                  className="border-t border-border"
                >
                  <td className="p-3">{r.product_name}</td>
                  <td className="p-3">{r.size}</td>
                  <td className="p-3">{r.color}</td>
                  <td className="p-3 text-right">{r.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto rounded-lg border border-border">
          <h3 className="border-b border-border px-4 py-3 font-semibold">Sales Summary</h3>
          <table className="w-full text-sm">
            <thead className="bg-muted/60">
              <tr>
                <th className="p-3 text-left">Product</th>
                <th className="p-3 text-right">Revenue</th>
                <th className="p-3 text-right">Qty</th>
              </tr>
            </thead>
            <tbody>
              {report.sales.map((r) => (
                <tr key={r.product_name} className="border-t border-border">
                  <td className="p-3">{r.product_name}</td>
                  <td className="p-3 text-right">{fmt(r.revenue_cents)}</td>
                  <td className="p-3 text-right">{r.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-border p-3 text-sm">
            Net after Stripe fees: {report.netCents === null ? "Unavailable" : fmt(report.netCents)}
          </div>
        </div>
      </div>
    </div>
  );
}
