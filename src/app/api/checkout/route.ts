import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripeClient";
import { supabase } from "@/lib/supabaseClient";

const ItemSchema = z.object({
  variantId: z.string(),
  productName: z.string(),
  size: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  unitPriceCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive(),
});

const CustomerSchema = z.object({
  name: z.string().min(1),
  affiliatedPlayer: z.string().min(1),
  affiliatedGroup: z.enum([
    "Tykes - Kindegarden",
    "Small Ball Girls (Gr 1-2)",
    "Small Ball Boys (Gr 1-2)",
    "Jr Mini Girls (Gr 3-4)",
    "Jr Mini Boys (Gr 3-4)",
    "Mini Girls House (Gr 5-6)",
    "Mini Boys House (Gr 5-6)",
    "Mini Girls Rep (Gr 5-6)",
    "Mini Boys Rep (Gr 5-6)",
  ]),
  phone: z.string().min(1),
  email: z.string().email(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parse = z
    .object({ items: z.array(ItemSchema).min(1), customer: CustomerSchema })
    .safeParse(body);
  if (!parse.success) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  // Server-side validation: fetch variants and trusted prices/names
  const { items, customer } = parse.data;
  const variantIds = Array.from(new Set(items.map((i) => i.variantId)));

  // Fetch variants
  const { data: variants, error: variantsErr } = await supabase
    .from("product_variants")
    .select("id, product_id, size_value, color_value, price_cents, active")
    .in("id", variantIds);
  if (variantsErr) {
    return NextResponse.json({ error: "variant_fetch_failed" }, { status: 500 });
  }

  const productIds = Array.from(new Set((variants ?? []).map((v) => v.product_id)));
  const { data: products, error: productsErr } = await supabase
    .from("products")
    .select("id, name, slug, active")
    .in("id", productIds);
  if (productsErr) {
    return NextResponse.json({ error: "product_fetch_failed" }, { status: 500 });
  }

  const variantIdToVariant = new Map<string, any>();
  (variants ?? []).forEach((v) => variantIdToVariant.set(v.id, v));
  const productIdToName = new Map<string, string>();
  const productIdToSlug = new Map<string, string>();
  (products ?? []).forEach((p: any) => {
    productIdToName.set(p.id, p.name);
    productIdToSlug.set(p.id, p.slug);
  });

  // Build trusted Stripe line items
  const lineItems = [] as any[];
  for (const item of items) {
    const v = variantIdToVariant.get(item.variantId);
    if (!v || !v.active) {
      return NextResponse.json({ error: "invalid_variant" }, { status: 400 });
    }
    if (item.size && v.size_value && item.size !== v.size_value) {
      return NextResponse.json({ error: "size_mismatch" }, { status: 400 });
    }
    if (item.color && v.color_value && item.color !== v.color_value) {
      return NextResponse.json({ error: "color_mismatch" }, { status: 400 });
    }
    const productName = productIdToName.get(v.product_id) ?? item.productName;
    const productSlug = productIdToSlug.get(v.product_id) ?? "";
    lineItems.push({
      quantity: item.quantity,
      price_data: {
        currency: "cad",
        unit_amount: v.price_cents,
        product_data: {
          name: productName,
          metadata: {
            variantId: item.variantId,
            size: v.size_value ?? "",
            color: v.color_value ?? "",
            slug: productSlug,
          },
        },
      },
    });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: lineItems,
    customer_email: customer.email,
    metadata: {
      customer_name: customer.name,
      affiliated_player: customer.affiliatedPlayer,
      affiliated_group: customer.affiliatedGroup,
      phone: customer.phone,
    },
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/checkout`,
  });

  return NextResponse.json({ url: session.url });
}


