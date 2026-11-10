"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { Season } from "@/lib/seasons";

export function SeasonSelector({ seasons, selected }: { seasons: Season[]; selected: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  return (
    <label className="mb-6 flex flex-wrap items-center gap-3 text-sm font-medium">
      Season
      <select
        aria-label="Season"
        className="rounded-md border border-border bg-background px-3 py-2"
        value={selected}
        onChange={(e) => {
          const next = new URLSearchParams(params.toString());
          next.set("season", e.target.value);
          router.push(`${pathname}?${next}`);
        }}
      >
        {seasons.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
            {s.is_current ? " (current)" : ""}
          </option>
        ))}
      </select>
    </label>
  );
}
