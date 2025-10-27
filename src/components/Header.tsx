"use client";
import Link from "next/link";
import { ShoppingCart, Menu } from "lucide-react";
import { useEffect, useState } from "react";
import { useCartStore } from "@/store/cart";
import { supabase } from "@/lib/supabaseClient";

export function Header() {
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);
  const itemCount = useCartStore((s) => s.items.reduce((n, i) => n + i.quantity, 0));

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="text-base font-semibold tracking-tight md:text-lg">
          <span className="inline-flex items-center gap-2">
            <img src="/logo.png" alt="FoxesGear" className="h-6 w-6" />
            FoxesGear
          </span>
        </Link>
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground sm:flex">
          <Link href="/shop" className="transition-colors hover:text-foreground">
            Shop
          </Link>
          {authed ? (
            <>
              <Link href="/admin" className="transition-colors hover:text-foreground">
                Admin
              </Link>
              <button
                onClick={async () => {
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
                className="text-left transition-colors hover:text-foreground"
              >
                Logout
              </button>
            </>
          ) : (
            <Link href="/login" className="transition-colors hover:text-foreground">
              Login
            </Link>
          )}
          <Link
            href="/cart"
            className="relative inline-flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-foreground shadow-sm transition hover:bg-muted"
            aria-label="Open cart"
          >
            <ShoppingCart size={16} />
            <span className="hidden sm:inline">Cart</span>
            {itemCount > 0 && (
              <span className="absolute -right-2 -top-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-primary-foreground">
                {itemCount}
              </span>
            )}
          </Link>
        </nav>

        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground transition hover:bg-muted sm:hidden"
          aria-label="Open menu"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Menu size={18} />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="sm:hidden">
          <div className="border-t border-border bg-background/95 backdrop-blur">
            <div className="container py-4">
              <div className="flex flex-col gap-4">
                <Link href="/shop" className="text-sm" onClick={() => setOpen(false)}>
                  Shop
                </Link>
                {authed ? (
                  <>
                    <Link href="/admin" className="text-sm" onClick={() => setOpen(false)}>
                      Admin
                    </Link>
                    <button
                      onClick={async () => {
                        await supabase.auth.signOut();
                        setOpen(false);
                        window.location.href = "/";
                      }}
                      className="text-left text-sm"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="text-sm" onClick={() => setOpen(false)}>
                    Login
                  </Link>
                )}
                <Link href="/cart" className="text-sm" onClick={() => setOpen(false)}>
                  <span className="inline-flex items-center gap-2">
                    <ShoppingCart size={16} />
                    Cart
                    {itemCount > 0 && (
                      <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[11px] font-semibold leading-none text-primary-foreground">
                        {itemCount}
                      </span>
                    )}
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}


