"use client";

import Link from "next/link";
import { useCartStore } from "@/store/cart";

export default function CartPage() {
  const { items, subtotalCents, updateQuantity, removeItem } = useCartStore();
  const subtotal = (subtotalCents() / 100).toFixed(2);

  return (
    <div className="container py-10">
      <h2 className="mb-6 text-2xl font-semibold">Cart</h2>
      {items.length === 0 ? (
        <p className="text-muted-foreground">Your cart is empty.</p>
      ) : (
        <div className="space-y-6">
          <ul className="divide-y rounded-md border border-border bg-card">
            {items.map((i) => (
              <li key={i.variantId} className="flex items-center justify-between gap-4 p-4">
                <div className="min-w-0">
                  <div className="truncate font-medium">{i.productName}</div>
                  <div className="text-sm text-muted-foreground">
                    {[i.size, i.color].filter(Boolean).join(" • ")}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="inline-flex items-center rounded-md border border-border">
                    <button
                      className="px-2 py-1 hover:bg-muted"
                      aria-label="Decrease quantity"
                      onClick={() => updateQuantity(i.variantId as any, Math.max(1, i.quantity - 1))}
                    >
                      −
                    </button>
                    <div className="w-10 select-none text-center tabular-nums">{i.quantity}</div>
                    <button
                      className="px-2 py-1 hover:bg-muted"
                      aria-label="Increase quantity"
                      onClick={() => updateQuantity(i.variantId as any, i.quantity + 1)}
                    >
                      +
                    </button>
                  </div>
                  <div className="w-20 text-right tabular-nums">${((i.unitPriceCents * i.quantity) / 100).toFixed(2)}</div>
                  <button
                    className="rounded-md border border-border px-2 py-1 hover:bg-muted"
                    onClick={() => removeItem(i.variantId as any)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold">Subtotal</span>
            <span className="text-lg font-semibold">${subtotal}</span>
          </div>
          <Link href="/checkout" className="inline-flex">
            <span className="sr-only">Go to checkout</span>
            <button className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-primary-foreground shadow-sm transition hover:opacity-90">
              Checkout
            </button>
          </Link>
        </div>
      )}
    </div>
  );
}


