"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/cart";

export default function SuccessPage() {
  const { clear } = useCartStore();

  useEffect(() => {
    // Clear cart once when landing on the success page
    clear();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="container py-16">
      <h2 className="mb-2 text-2xl font-semibold tracking-tight">Thanks for your order!</h2>
      <p className="text-muted-foreground">You will receive a confirmation email shortly.</p>
      <div className="mt-6 text-sm text-muted-foreground">
        Pickup details will be emailed after the pre-order window closes.
      </div>
    </div>
  );
}


