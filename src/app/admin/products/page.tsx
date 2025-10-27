import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

export default async function AdminProductsPage() {
  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, active, sort_order")
    .order("sort_order", { ascending: true });

  // Supabase-js does not expose a .group() helper. Fetch product_id list and count in code.
  const { data: variants } = await supabase
    .from("product_variants")
    .select("product_id");

  const productIdToCount = new Map<string, number>();
  (variants ?? []).forEach((v: any) => {
    productIdToCount.set(v.product_id, (productIdToCount.get(v.product_id) ?? 0) + 1);
  });

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Products</h2>
        <Link
          href="/admin/products/new"
          className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          New product
        </Link>
      </div>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Name</th>
              <th className="px-4 py-2 text-left font-medium">Slug</th>
              <th className="px-4 py-2 text-left font-medium">Variants</th>
              <th className="px-4 py-2 text-left font-medium">Active</th>
              <th className="px-4 py-2 text-left font-medium">Sort</th>
              <th className="px-4 py-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {(products ?? []).map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2">{p.name}</td>
                <td className="px-4 py-2 text-muted-foreground">{p.slug}</td>
                <td className="px-4 py-2">{productIdToCount.get(p.id) ?? 0}</td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      p.active ? "bg-primary/10 text-foreground" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {p.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-2">{p.sort_order}</td>
                <td className="px-4 py-2">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted"
                  >
                    Edit
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


