import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { checkAdminRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

const input = z
  .object({
    seasonId: z.string().uuid(),
    collected: z.boolean(),
    expectedCollectedAt: z.string().datetime({ offset: true }).nullable(),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> },
) {
  const access = await checkAdminRequest(request);
  if (access.response) return access.response;
  const { orderId } = await context.params;
  const body = input.safeParse(await request.json().catch(() => null));
  const headers = { "Cache-Control": "private, no-store" };
  if (!z.string().uuid().safeParse(orderId).success || !body.success)
    return NextResponse.json({ error: "Invalid pickup details" }, { status: 400, headers });

  const { data, error } = await supabaseAdmin.rpc("set_order_pickup", {
    actor_id: access.user.id,
    target_order_id: orderId,
    target_season_id: body.data.seasonId,
    is_collected: body.data.collected,
    expected_collected_at: body.data.expectedCollectedAt,
  });
  if (error) {
    const conflict = error.code === "40001";
    const missing = error.code === "P0002";
    const denied = error.code === "42501";
    return NextResponse.json(
      {
        error: conflict
          ? "Pickup changed since this page loaded. Refresh and try again."
          : missing
            ? "Paid live order not found in this season."
            : denied
              ? "Admin access required"
              : "Could not save pickup. Please try again.",
      },
      { status: conflict ? 409 : missing ? 404 : denied ? 403 : 500, headers },
    );
  }
  return NextResponse.json({ collectedAt: data }, { headers });
}
