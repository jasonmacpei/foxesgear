"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import type { ProductVariant } from "@/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Props = { productId: string };

export function VariantManager({ productId }: Props) {
  const [variants, setVariants] = useState<(ProductVariant & { priceInput?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newSize, setNewSize] = useState("");
  const [newColor, setNewColor] = useState("");
  const [newPrice, setNewPrice] = useState<string>("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("product_variants")
      .select("id, product_id, size_value, color_value, price_cents, active")
      .eq("product_id", productId)
      .order("size_value", { ascending: true });
    if (error) setError(error.message);
    setVariants(((data as any) ?? []).map((v: any) => ({ ...v, priceInput: ((v.price_cents ?? 0) / 100).toFixed(2) })));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  async function addVariant() {
    setError(null);
    const size = newSize.trim() || null;
    const color = newColor.trim() || null;
    const price = Math.max(0, Math.round(Number(newPrice) * 100) || 0);
    const { error } = await supabase.from("product_variants").insert({
      product_id: productId,
      size_value: size,
      color_value: color,
      price_cents: price,
      active: true,
    });
    if (error) setError(error.message);
    setNewSize("");
    setNewColor("");
    setNewPrice("");
    await load();
  }

  async function toggleActive(id: string, active: boolean) {
    setError(null);
    setVariants((prev) => prev.map((v) => (v.id === (id as any) ? { ...v, active } : v)));
    const { error } = await supabase.from("product_variants").update({ active }).eq("id", id);
    if (error) setError(error.message);
  }

  async function updateField(id: string, patch: Partial<ProductVariant>) {
    setError(null);
    setVariants((prev) => prev.map((v) => (v.id === (id as any) ? { ...v, ...(patch as any) } : v)));
    const { error } = await supabase.from("product_variants").update(patch as any).eq("id", id);
    if (error) setError(error.message);
  }

  async function deleteVariant(id: string) {
    setError(null);
    setVariants((prev) => prev.filter((v) => v.id !== (id as any)));
    const { error } = await supabase.from("product_variants").delete().eq("id", id);
    if (error) setError(error.message);
  }

  return (
    <div className="mt-10">
      <h3 className="mb-3 text-lg font-semibold">Variants</h3>
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Input placeholder="Size (e.g. S, M, L, YS)" value={newSize} onChange={(e) => setNewSize(e.target.value)} />
        <Input placeholder="Color (e.g. Black)" value={newColor} onChange={(e) => setNewColor(e.target.value)} />
        <Input
          placeholder="Price (e.g. 22.00)"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
        />
      </div>
      <Button onClick={addVariant} disabled={loading}>
        Add variant
      </Button>

      <div className="mt-6 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-muted-foreground">
            <tr>
              <th className="px-4 py-2 text-left font-medium">Size</th>
              <th className="px-4 py-2 text-left font-medium">Color</th>
              <th className="px-4 py-2 text-left font-medium">Price</th>
              <th className="px-4 py-2 text-left font-medium">Active</th>
              <th className="px-4 py-2 text-left font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-3" colSpan={5}>
                  Loading…
                </td>
              </tr>
            ) : variants.length === 0 ? (
              <tr>
                <td className="px-4 py-3 text-muted-foreground" colSpan={5}>
                  No variants yet.
                </td>
              </tr>
            ) : (
              variants.map((v) => (
                <tr key={v.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <input
                      className="w-28 rounded-md border border-border bg-background px-2 py-1 text-sm"
                      value={v.size_value ?? ""}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((x) => (x.id === v.id ? { ...x, size_value: e.target.value || null } : x)),
                        )
                      }
                      onBlur={(e) => updateField(v.id as any, { size_value: e.target.value || null })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="w-32 rounded-md border border-border bg-background px-2 py-1 text-sm"
                      value={v.color_value ?? ""}
                      onChange={(e) =>
                        setVariants((prev) =>
                          prev.map((x) => (x.id === v.id ? { ...x, color_value: e.target.value || null } : x)),
                        )
                      }
                      onBlur={(e) => updateField(v.id as any, { color_value: e.target.value || null })}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      className="w-24 rounded-md border border-border bg-background px-2 py-1 text-sm"
                      value={v.priceInput ?? ((v.price_cents ?? 0) / 100).toFixed(2)}
                      onChange={(e) =>
                        setVariants((prev) => prev.map((x) => (x.id === v.id ? { ...x, priceInput: e.target.value } : x)))
                      }
                      onBlur={(e) => {
                        const dollars = Number(e.target.value);
                        const cents = Math.max(0, Math.round((isNaN(dollars) ? 0 : dollars) * 100));
                        setVariants((prev) =>
                          prev.map((x) => (x.id === v.id ? { ...x, price_cents: cents, priceInput: (cents / 100).toFixed(2) } : x)),
                        );
                        updateField(v.id as any, { price_cents: cents } as any);
                      }}
                    />
                  </td>
                  <td className="px-4 py-2">
                    <label className="inline-flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={v.active}
                        onChange={(e) => toggleActive(v.id as unknown as string, e.target.checked)}
                      />
                      {v.active ? "Active" : "Inactive"}
                    </label>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm" asChild
                      className="text-xs"
                      onClick={() => deleteVariant(v.id as unknown as string)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {error && <div className="mt-3 rounded-md border border-border p-3 text-sm text-red-600">{error}</div>}
    </div>
  );
}


