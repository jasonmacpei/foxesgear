"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import type { Product } from "@/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type Props = {
  initial?: Partial<Product>;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export function ProductForm({ initial }: Props) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [imageUrl, setImageUrl] = useState<string | null>(initial?.image_url ?? null);
  const [active, setActive] = useState<boolean>(initial?.active ?? true);
  const [sortOrder, setSortOrder] = useState<number>(initial?.sort_order ?? 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Variant preset (create mode only)
  const isCreate = !initial?.id;
  const defaultColors = ["Green", "Black", "White"] as const;
  const defaultSizes = [
    "Youth S",
    "Youth M",
    "Youth L",
    "Adult S",
    "Adult M",
    "Adult L",
    "Adult XL",
    "Adult XXL",
  ] as const;
  const [usePreset, setUsePreset] = useState(true);
  const [selectedColors, setSelectedColors] = useState<string[]>([...defaultColors]);
  const [selectedSizes, setSelectedSizes] = useState<string[]>([...defaultSizes]);
  const [variantPrice, setVariantPrice] = useState<string>("");

  // Auto-suggest slug from name if user hasn't typed a custom one
  const suggestedSlug = useMemo(() => slugify(name), [name]);
  useEffect(() => {
    if (!initial?.slug) setSlug(suggestedSlug);
  }, [suggestedSlug, initial?.slug]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || null,
        image_url: imageUrl,
        active,
        sort_order: Number(sortOrder) || 0,
      } as const;

      if (initial?.id) {
        const { error } = await supabase.from("products").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        // create product and fetch id
        const { data: inserted, error } = await supabase
          .from("products")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        // If requested, create standard variant combinations with uniform price
        if (usePreset && inserted?.id && selectedColors.length && selectedSizes.length) {
          const priceCents = Math.max(0, Math.round((Number(variantPrice) || 0) * 100));
          const rows = [] as any[];
          for (const size of selectedSizes) {
            for (const color of selectedColors) {
              rows.push({
                product_id: inserted.id,
                size_value: size,
                color_value: color,
                price_cents: priceCents,
                active: true,
              });
            }
          }
          if (rows.length) {
            await supabase.from("product_variants").insert(rows);
          }
        }
      }
      router.push("/admin/products");
      router.refresh();
    } catch (err: any) {
      setError(err?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-sm">
          Name
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="text-sm">
          Slug
          <Input className="mt-1" value={slug} onChange={(e) => setSlug(e.target.value)} required />
          <div className="mt-1 text-xs text-muted-foreground">Suggested: {suggestedSlug || ""}</div>
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="text-sm">
          <div className="mb-1">Product image</div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              setSaving(true);
              setError(null);
              try {
                const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
                const key = `products/${crypto.randomUUID()}.${ext}`;
                const { error: upErr } = await supabase.storage
                  .from("product-images")
                  .upload(key, file, { cacheControl: "3600", upsert: false, contentType: file.type });
                if (upErr) throw upErr;
                const { data } = supabase.storage.from("product-images").getPublicUrl(key);
                setImageUrl(data.publicUrl);
              } catch (err: any) {
                setError(err?.message ?? "Upload failed");
              } finally {
                setSaving(false);
              }
            }}
          />
          <div className="flex items-center gap-3">
            <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={saving}>
              {saving ? "Uploading…" : "Upload image"}
            </Button>
            {imageUrl && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setImageUrl(null)}
                className="text-sm"
              >
                Remove
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-end">
          {imageUrl ? (
            <img src={imageUrl} alt="Preview" className="h-24 w-24 rounded-md border border-border object-cover" />
          ) : (
            <div className="grid h-24 w-24 place-items-center rounded-md border border-dashed border-border text-xs text-muted-foreground">
              No image
            </div>
          )}
        </div>
      </div>
      <label className="text-sm block">
        Description
        <textarea
          className="mt-1 w-full rounded-md border border-border bg-background p-3"
          rows={4}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      {isCreate && (
        <div className="mt-4 space-y-4 rounded-lg border border-border p-4">
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" checked={usePreset} onChange={(e) => setUsePreset(e.target.checked)} />
            Create standard variants
          </label>
          {usePreset && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="mb-2 text-sm font-medium">Colors</div>
                  <div className="flex flex-wrap gap-3">
                    {defaultColors.map((c) => (
                      <label key={c} className="inline-flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedColors.includes(c)}
                          onChange={(e) =>
                            setSelectedColors((prev) =>
                              e.target.checked ? [...prev, c] : prev.filter((x) => x !== c),
                            )
                          }
                        />
                        {c}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="mb-2 text-sm font-medium">Sizes</div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {defaultSizes.map((s) => (
                      <label key={s} className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedSizes.includes(s)}
                          onChange={(e) =>
                            setSelectedSizes((prev) =>
                              e.target.checked ? [...prev, s] : prev.filter((x) => x !== s),
                            )
                          }
                        />
                        {s}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <label className="text-sm block">
                Variant price (applied to all)
                <Input
                  className="mt-1 max-w-xs"
                  placeholder="e.g. 22.00"
                  value={variantPrice}
                  onChange={(e) => setVariantPrice(e.target.value)}
                />
              </label>
            </>
          )}
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="inline-flex items-center gap-2 text-sm">
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Active
        </label>
        <label className="text-sm">
          Sort order
          <Input
            className="mt-1"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value) || 0)}
          />
        </label>
      </div>
      {error && <div className="rounded-md border border-border p-3 text-sm text-red-600">{error}</div>}
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : initial?.id ? "Save changes" : "Create product"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.push("/admin/products")}>Cancel</Button>
      </div>
    </form>
  );
}


