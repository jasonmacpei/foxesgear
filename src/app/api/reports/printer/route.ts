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
  const report = await getSeasonReport(selection.season.id);
  const rows = report.printer.map((r) => ({ season: selection.season.name, ...r }));
  return new NextResponse(rows.length ? toCsv(rows) : "season,product_name,size,color,qty\n", {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Content-Disposition": `attachment; filename=printer_${selection.season.starts_on.slice(0, 4)}.csv`,
    },
  });
}
