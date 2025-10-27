"use client";

import { useState } from "react";
import { useCartStore } from "@/store/cart";

export default function CheckoutPage() {
  const { items, subtotalCents } = useCartStore();
  const [loading, setLoading] = useState(false);

  async function startCheckout() {
    try {
      setLoading(true);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  }

  const subtotal = (subtotalCents() / 100).toFixed(2);

  return (
    <div className="container py-10">
      <h2 className="mb-6 text-2xl font-semibold">Checkout</h2>
      <div className="mb-4 text-muted-foreground">Subtotal: ${subtotal}</div>
      <button
        onClick={startCheckout}
        disabled={loading || items.length === 0}
        className="rounded-md bg-primary px-6 py-3 text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Redirecting..." : "Pay with Stripe"}
      </button>
    </div>
  );
}


