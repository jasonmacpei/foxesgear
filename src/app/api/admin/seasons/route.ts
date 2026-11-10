import { NextRequest, NextResponse } from "next/server";
import { checkAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

const schema = z.union([
  z.object({ seasonId: z.string().uuid() }),
  z.object({
    name: z.string().trim().min(1).max(60),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
    makeCurrent: z.boolean(),
  }),
]);
export async function POST(req: NextRequest) {
  const access = await checkAdminRequest(req);
  if (access.response) return access.response;
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Enter a valid season name and dates" }, { status: 400 });
  const input = parsed.data;
  const existing = "seasonId" in input;
  const { error } = await supabaseAdmin.rpc("manage_season", {
    actor_id: access.user.id,
    target_id: existing ? input.seasonId : null,
    season_name: existing ? null : input.name,
    start_date: existing ? null : input.startsOn,
    end_date: existing ? null : input.endsOn,
    activate: existing || input.makeCurrent,
  });
  if (error)
    return NextResponse.json(
      { error: "Could not save season. Check for duplicate names or overlapping dates." },
      { status: 400 },
    );
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
