"use client";

import { useState, useMemo } from "react";
import { useCartStore } from "@/store/cart";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";

type Variant = { id: string; size_value: string | null; color_value: string | null; price_cents: number };

export function AddToCart({
  productName,
  variants,
}: {
  productName: string;
  variants: Variant[];
}) {
  const sizeRank = (s: string): number => {
    const val = s.trim().toLowerCase();
    const groupRank = val.startsWith("y") ? 0 : 1; // youth first, then adult/default
    const r = (token: string): number => {
      if (token.includes("5xl")) return 90;
      if (token.includes("4xl")) return 80;
      if (token.includes("3xl") || token.includes("xxxl")) return 70;
      if (token.includes("2xl") || token.includes("xxl")) return 60;
      if (token.includes("xl")) return 50;
      if (/(^|\b)x?s\b/.test(token)) return token.includes("xs") ? 10 : 20; // xs before s
      if (/\bm\b/.test(token)) return 30;
      if (/\bl\b/.test(token)) return 40;
      return 999;
    };
    return groupRank * 100 + r(val);
  };

  const sizes = useMemo(() => {
    const uniq = Array.from(new Set(variants.map((v) => v.size_value).filter(Boolean))) as string[];
    return uniq.sort((a, b) => sizeRank(a) - sizeRank(b));
  }, [variants]);
  const colors = useMemo(
    () => Array.from(new Set(variants.map((v) => v.color_value).filter(Boolean))) as string[],
    [variants],
  );
  const [size, setSize] = useState<string | null>(sizes[0] ?? null);
  const [color, setColor] = useState<string | null>(colors[0] ?? null);
  const [quantity, setQuantity] = useState(1);
  const add = useCartStore((s) => s.addItem);
  const { show } = useToast();

  const activeVariant = useMemo(() => {
    return variants.find((v) => (v.size_value ?? null) === size && (v.color_value ?? null) === color);
  }, [variants, size, color]);

  const price = activeVariant?.price_cents ?? 0;

  function addToCart() {
    if (!activeVariant) return;
    add({
      variantId: activeVariant.id as unknown as any,
      productName,
      size,
      color,
      unitPriceCents: price,
      quantity,
    });
    show({
      variant: "success",
      title: "Added to cart",
      description: `${productName}${size ? ` · ${size}` : ""}${color ? ` · ${color}` : ""}`,
    });
  }

  return (
    <div className="flex max-w-md flex-col gap-4">
      {sizes.length > 0 && (
        <label className="text-sm">
          Size
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
            value={size ?? ""}
            onChange={(e) => setSize(e.target.value || null)}
          >
            {sizes.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      )}
      {colors.length > 0 && (
        <label className="text-sm">
          Color
          <select
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2"
            value={color ?? ""}
            onChange={(e) => setColor(e.target.value || null)}
          >
            {colors.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="text-sm">
        Quantity
        <Input
          type="number"
          min={1}
          className="mt-1"
          value={quantity}
          onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
        />
      </label>
      <Button disabled={!activeVariant} onClick={addToCart} className="mt-2">
        Add to cart {price ? `- $${(price / 100).toFixed(2)}` : ""}
      </Button>
    </div>
  );
}


