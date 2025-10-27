import { supabase } from "@/lib/supabaseClient";
import { ProductForm } from "../ProductForm";
import { VariantManager } from "../VariantManager";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEditProductPage({ params }: Props) {
  const { id } = await params;
  const { data: product } = await supabase
    .from("products")
    .select("id, name, slug, description, image_url, active, sort_order")
    .eq("id", id)
    .single();

  if (!product) {
    return <div className="rounded-md border border-border p-4 text-sm">Product not found.</div>;
  }

  return (
    <div>
      <h2 className="mb-4 text-2xl font-semibold">Edit product</h2>
      <ProductForm initial={product as any} />
      <VariantManager productId={product.id} />
    </div>
  );
}


