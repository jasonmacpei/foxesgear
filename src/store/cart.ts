import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { CartItem, UUID } from "@/types";

type CartState = {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (variantId: UUID) => void;
  updateQuantity: (variantId: UUID, quantity: number) => void;
  clear: () => void;
  subtotalCents: () => number;
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.variantId === item.variantId);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.variantId === item.variantId ? { ...i, quantity: i.quantity + item.quantity } : i,
              ),
            };
          }
          return { items: [...state.items, item] };
        }),
      removeItem: (variantId) => set((state) => ({ items: state.items.filter((i) => i.variantId !== variantId) })),
      updateQuantity: (variantId, quantity) =>
        set((state) => ({
          items: state.items.map((i) => (i.variantId === variantId ? { ...i, quantity } : i)),
        })),
      clear: () => set({ items: [] }),
      subtotalCents: () => get().items.reduce((sum, i) => sum + i.unitPriceCents * i.quantity, 0),
    }),
    { name: "foxesgear-cart" },
  ),
);


