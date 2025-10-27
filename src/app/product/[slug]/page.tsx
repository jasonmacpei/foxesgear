import { supabase } from "@/lib/supabaseClient";
import { AddToCart } from "./ui";

type Props = { params: Promise<{ slug: string }> };

export default async function ProductDetailPage({ params }: Props) {
  const { slug } = await params;
  const { data: product } = await supabase
    .from("products")
    .select("id, name, description, image_url")
    .eq("slug", slug)
    .eq("active", true)
    .single();

  const { data: variants } = await supabase
    .from("product_variants")
    .select("id, size_value, color_value, price_cents")
    .eq("product_id", product?.id ?? "")
    .eq("active", true);

  if (!product) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <h2 className="mb-6 text-2xl font-semibold">Product not found</h2>
      </div>
    );
  }

  return (
    <div className="container py-10">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <div className="aspect-square w-full overflow-hidden rounded-lg bg-muted">
            {product.image_url ? (
              <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
            ) : null}
          </div>
        </div>
        <div>
          <h2 className="mb-2 text-2xl font-semibold tracking-tight">{product.name}</h2>
          {product.description && (
            <p className="mb-6 max-w-2xl text-muted-foreground">{product.description}</p>
          )}
          <AddToCart productName={product.name} variants={variants ?? []} />
        </div>
      </div>
    </div>
  );
}


