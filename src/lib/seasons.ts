import "server-only";
import { supabaseAdmin } from "./supabaseAdmin";

export type Season = {
  id: string;
  name: string;
  starts_on: string;
  ends_on: string;
  is_current: boolean;
};

export async function getSeasons(): Promise<Season[]> {
  const { data, error } = await supabaseAdmin
    .from("seasons")
    .select("id, name, starts_on, ends_on, is_current")
    .order("starts_on", { ascending: false });
  if (error) throw new Error("Could not load seasons");
  return data ?? [];
}

export async function resolveSeason(requested?: string) {
  const seasons = await getSeasons();
  const season = requested
    ? seasons.find((s) => s.id === requested)
    : seasons.find((s) => s.is_current);
  if (!season) throw new Error("Season not found");
  return { seasons, season };
}

// Stripe metadata pins a session to the season selected when checkout started.
// Historical sessions without metadata use the actual Stripe creation date.
export async function seasonForStripeSession(session: {
  metadata: Record<string, string> | null;
  created: number;
}) {
  const seasons = await getSeasons();
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Halifax",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(session.created * 1000));
  const id = session.metadata?.season_id;
  const season = id
    ? seasons.find((s) => s.id === id)
    : seasons.find((s) => date >= s.starts_on && date <= s.ends_on);
  if (!season) throw new Error("No season found for Stripe session");
  return season;
}
