"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Season } from "@/lib/seasons";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export function SeasonsManager({ seasons }: { seasons: Season[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [current, setCurrent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  async function save(body: object) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save season");
      setName("");
      setStart("");
      setEnd("");
      setCurrent(false);
      setMessage("Season saved. Existing orders stay in their original season.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Seasons</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          New checkouts use the current season. Switching seasons keeps past orders and reports
          intact. A checkout already started keeps its original season.
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <div className="space-y-3">
        {seasons.map((s) => (
          <div
            key={s.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4"
          >
            <div>
              <h3 className="font-semibold">
                {s.name}
                {s.is_current ? " · Current" : ""}
              </h3>
              <p className="text-sm text-muted-foreground">
                {s.starts_on} to {s.ends_on}
              </p>
            </div>
            {!s.is_current && (
              <Button
                disabled={busy}
                onClick={() => {
                  if (window.confirm(`Use ${s.name} for new checkouts?`))
                    void save({ seasonId: s.id });
                }}
              >
                Make current
              </Button>
            )}
          </div>
        ))}
      </div>
      <form
        className="space-y-4 rounded-lg border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save({ name, startsOn: start, endsOn: end, makeCurrent: current });
        }}
      >
        <h3 className="text-lg font-semibold">Add season</h3>
        <label className="block text-sm">
          Season name
          <Input
            className="mt-1"
            placeholder="2027–2028"
            required
            maxLength={60}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            Start date
            <Input
              className="mt-1"
              type="date"
              required
              value={start}
              onChange={(e) => setStart(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            End date
            <Input
              className="mt-1"
              type="date"
              required
              min={start}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={current} onChange={(e) => setCurrent(e.target.checked)} />
          Use for new checkouts
        </label>
        <Button type="submit" disabled={busy}>
          Add season
        </Button>
      </form>
    </div>
  );
}
