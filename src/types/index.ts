export type UUID = string & { readonly __brand: unique symbol };

export type Product = {
  id: UUID;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  active: boolean;
  sort_order: number;
  created_at?: string;
};

export type ProductVariant = {
  id: UUID;
  product_id: UUID;
  size_value?: string | null;
  color_value?: string | null;
  price_cents: number;
  sku?: string | null;
  image_url?: string | null;
  active: boolean;
};

export type CartItem = {
  variantId: UUID;
  productName: string;
  size?: string | null;
  color?: string | null;
  unitPriceCents: number;
  quantity: number;
};

export type Order = {
  id: UUID;
  email: string;
  payment_method: "stripe";
  status: "pending" | "paid" | "fulfilled" | "cancelled";
  amount_total_cents: number;
  stripe_session_id?: string | null;
  paid_at?: string | null;
};


