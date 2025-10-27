import Link from "next/link";
import { Card, CardContent, CardHeader } from "./ui/Card";

export function ProductCard({
  id,
  name,
  slug,
  description,
  imageUrl,
  lowestPriceCents,
}: {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  imageUrl?: string | null;
  lowestPriceCents?: number | null;
}) {
  return (
    <Link href={`/product/${slug}`} className="group block">
      <Card className="h-full overflow-hidden transition hover:shadow-md">
        <CardHeader>
          <div className="aspect-[4/3] w-full overflow-hidden rounded-md bg-muted">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={name}
                className="h-full w-full object-contain p-2"
                loading="lazy"
              />
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-1 flex items-baseline justify-between gap-3">
            <div className="text-base font-semibold tracking-tight group-hover:underline">{name}</div>
            {typeof lowestPriceCents === "number" && (
              <div className="text-sm font-medium tabular-nums">${(lowestPriceCents / 100).toFixed(2)}</div>
            )}
          </div>
          {description ? (
            <div className="line-clamp-2 text-sm text-muted-foreground">{description}</div>
          ) : null}
        </CardContent>
      </Card>
    </Link>
  );
}


