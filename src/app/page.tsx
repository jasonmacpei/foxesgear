import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { getSiteSettings } from "@/lib/settings";

export default async function Home() {
  const settings = await getSiteSettings();
  const closed = settings.store_closed;
  const message =
    settings.store_closed_message ??
    "We’re currently closed and will reopen once we restock in the new year!";
  return (
    <section className="container flex flex-col items-center gap-6 pt-8 pb-16 text-center">
      <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-base font-semibold text-muted-foreground sm:gap-3 sm:px-6 sm:py-3 sm:text-xl md:text-2xl lg:px-8 lg:py-4 lg:text-3xl">
        Stratford Foxes Official Shop
      </div>
      <div className="flex h-40 w-full max-w-[30rem] items-center justify-center sm:h-48 md:h-56">
        <img
          src="/foxes-logo.png"
          alt="Stratford Foxes logo"
          className="h-full w-full rounded-3xl object-contain shadow"
        />
      </div>
      {closed ? (
        <>
          <h1 className="max-w-3xl text-balance text-4xl font-extrabold tracking-tight md:text-5xl">
            We’re currently closed
          </h1>
          <p className="max-w-2xl text-pretty text-lg text-muted-foreground">{message}</p>
        </>
      ) : (
        <>
          <h1 className="max-w-3xl text-balance text-4xl font-extrabold tracking-tight md:text-5xl">
            Premium team apparel for players and families
          </h1>
          <p className="max-w-2xl text-pretty text-lg text-muted-foreground">
            Order your gear with secure Stripe checkout.
          </p>
          <p className="max-w-2xl text-pretty text-lg font-medium text-muted-foreground">
            The order window closes Sunday, November 9th — pick up from your coach at practice.
          </p>
          <div className="flex items-center gap-3">
            <Button asChild>
              <Link href="/shop">Shop Now</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/cart">View Cart</Link>
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
