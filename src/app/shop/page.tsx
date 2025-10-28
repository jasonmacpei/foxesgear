export const dynamic = "force-dynamic";
 
import { supabase } from "@/lib/supabaseClient";
import { ProductCard } from "@/components/ProductCard";

export default async function ShopPage() {
  const { data: products } = await supabase
    .from("products")
    .select("id, name, slug, description, image_url")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  // Fetch lowest price per product
  const productIds = (products ?? []).map((p) => p.id);
  const { data: prices } = await supabase
    .from("product_variants")
    .select("product_id, price_cents")
    .in("product_id", productIds);
  const lowestByProduct = new Map<string, number>();
  for (const row of prices ?? []) {
    const curr = lowestByProduct.get(row.product_id as any);
    const next = row.price_cents as number;
    lowestByProduct.set(row.product_id as any, curr == null ? next : Math.min(curr, next));
  }

  return (
    <div className="container py-10">
      <h2 className="mb-6 text-2xl font-semibold">Shop</h2>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
        {(products ?? []).map((p) => (
          <ProductCard
            key={p.id}
            id={p.id}
            name={p.name}
            slug={p.slug}
            description={p.description}
            imageUrl={p.image_url}
            lowestPriceCents={lowestByProduct.get(p.id) ?? null}
          />
        ))}
      </div>
    </div>
  );
}


