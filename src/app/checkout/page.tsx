"use client";

import { useMemo, useState } from "react";
import { useCartStore } from "@/store/cart";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function CheckoutPage() {
  const { items, subtotalCents } = useCartStore();
  const [loading, setLoading] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [affiliatedPlayer, setAffiliatedPlayer] = useState("");
  const [affiliatedGroup, setAffiliatedGroup] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const groups = useMemo(
    () => [
      "Tykes - Kindegarden",
      "Small Ball Girls (Gr 1-2)",
      "Small Ball Boys (Gr 1-2)",
      "Jr Mini Girls (Gr 3-4)",
      "Jr Mini Boys (Gr 3-4)",
      "Mini Girls House (Gr 5-6)",
      "Mini Boys House (Gr 5-6)",
      "Mini Girls Rep (Gr 5-6)",
      "Mini Boys Rep (Gr 5-6)",
    ],
    [],
  );

  const formValid = useMemo(() => {
    const hasAll = customerName && affiliatedPlayer && affiliatedGroup && phone && email;
    const emailOk = /.+@.+\..+/.test(email);
    return Boolean(hasAll && emailOk);
  }, [customerName, affiliatedPlayer, affiliatedGroup, phone, email]);

  async function startCheckout() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
          customer: {
            name: customerName,
            affiliatedPlayer,
            affiliatedGroup,
            phone,
            email,
          },
        }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else if (data.error) {
        setError(data.error);
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
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Customer Name</label>
            <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Affiliated Player</label>
            <Input value={affiliatedPlayer} onChange={(e) => setAffiliatedPlayer(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Affiliated Group</label>
            <select
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-foreground shadow-sm outline-none ring-0 focus-visible:border-border focus-visible:ring-2 focus-visible:ring-[color:var(--ring)]"
              value={affiliatedGroup}
              onChange={(e) => setAffiliatedGroup(e.target.value)}
              required
            >
              <option value="" disabled>
                Select a group
              </option>
              {groups.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Phone</label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm text-muted-foreground">Email</label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

      <div className="mt-6">
        <Button onClick={startCheckout} disabled={loading || items.length === 0 || !formValid}>
          {loading ? "Redirecting..." : "Pay with Stripe"}
        </Button>
      </div>
    </div>
  );
}


