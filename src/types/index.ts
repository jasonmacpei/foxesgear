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
  customer_name: string;
  affiliated_player: string;
  affiliated_group: AffiliatedGroup;
  phone: string;
  email: string;
  payment_method: "stripe";
  status: "pending" | "paid" | "fulfilled" | "cancelled";
  amount_total_cents: number;
  stripe_session_id?: string | null;
  paid_at?: string | null;
};

export type AffiliatedGroup =
  | "Tykes - Kindegarden"
  | "Small Ball Girls (Gr 1-2)"
  | "Small Ball Boys (Gr 1-2)"
  | "Jr Mini Girls (Gr 3-4)"
  | "Jr Mini Boys (Gr 3-4)"
  | "Mini Girls House (Gr 5-6)"
  | "Mini Boys House (Gr 5-6)"
  | "Mini Girls Rep (Gr 5-6)"
  | "Mini Boys Rep (Gr 5-6)";


