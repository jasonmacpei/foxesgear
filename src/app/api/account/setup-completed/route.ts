import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import { deliverSignupNotifications } from "@/lib/accountEmails";

export async function POST(req: NextRequest) {
  if (req.headers.get("origin") !== req.nextUrl.origin)
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  const client = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  // The database queues this event only after a real first password update.
  try {
    await deliverSignupNotifications(user.id);
  } catch {
    /* The durable queue is retried by cron. */
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
}
