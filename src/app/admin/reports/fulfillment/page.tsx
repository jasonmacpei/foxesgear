import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPage } from "@/lib/adminAuth";
import { resolveSeason } from "@/lib/seasons";
import { getFulfillmentReport } from "@/lib/fulfillmentReports";
import { SeasonSelector } from "@/components/SeasonSelector";
import { FulfillmentReports } from "./FulfillmentReports";
import "./print.css";

export const dynamic = "force-dynamic";

export default async function FulfillmentPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; view?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const selection = await resolveSeason(params.season).catch(() => null);
  if (!selection) notFound();
  const orders = await getFulfillmentReport(selection.season.id);
  return (
    <div className="fulfillment-report">
      <div className="report-controls">
        <Link
          className="mb-4 inline-block text-sm underline"
          href={`/admin/reports?season=${selection.season.id}`}
        >
          Back to reports
        </Link>
        <h2 className="mb-4 text-2xl font-semibold">Packing &amp; pickup</h2>
        <SeasonSelector seasons={selection.seasons} selected={selection.season.id} />
      </div>
      <FulfillmentReports
        key={selection.season.id}
        season={selection.season}
        orders={orders}
        initialView={params.view === "packing" ? "packing" : "pickup"}
      />
    </div>
  );
}
