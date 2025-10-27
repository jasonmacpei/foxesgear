import { supabase } from "@/lib/supabaseClient";

export default async function AdminReportsPage() {
  const { data: printer } = await supabase.rpc("exec", {
    // Placeholder: some Supabase instances can run RPC but not raw SQL; here we fetch via views if present.
  } as any);

  return (
    <div>
      <h2 className="mb-6 text-2xl font-semibold">Reports</h2>
      <div className="mb-4 flex gap-3">
        <a href="/api/reports/printer.csv" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Export Printer CSV
        </a>
        <a href="/api/reports/sales.csv" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          Export Sales CSV
        </a>
      </div>

      <div className="rounded-lg border border-border p-4 text-sm text-muted-foreground">
        Exports produce aggregate CSVs for printer and sales. Inline previews can be added after CSV endpoints are wired.
      </div>
    </div>
  );
}


