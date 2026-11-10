import { checkAdminRequest } from "@/lib/adminAuth";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stripe } from "@/lib/stripeClient";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const access = await checkAdminRequest(req);
  if (access.response) return access.response;
  const { orderId } = await context.params;
  if (!orderId) {
    return NextResponse.json({ error: "missing_order_id" }, { status: 400 });
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId);
  const isSession = /^cs_(test_|live_)?[a-zA-Z0-9]+$/.test(orderId);
  if (!isUuid && !isSession) return NextResponse.json({ error: "invalid_order_id" }, { status: 400 });
  const { data: order, error } = await supabaseAdmin.from("orders").select("*")
    .eq(isUuid ? "id" : "stripe_session_id", orderId).maybeSingle();

  if (error) {
    return NextResponse.json({ error: "order_lookup_failed", detail: error.message }, { status: 500 });
  }
  if (!order) {
    return NextResponse.json({ error: "order_not_found", detail: `No order for id or session: ${orderId}` }, { status: 404 });
  }

  if (order.status !== "paid") {
    return NextResponse.json({ error: "order_not_paid" }, { status: 400 });
  }

  try {
    // Prefer refunding by charge if available; otherwise derive from payment_intent via session
    let chargeId: string | null = (order as any).stripe_charge_id ?? null;

    if (!chargeId && order.stripe_session_id) {
      // Retrieve Checkout Session, then fetch Payment Intent and get its latest charge id
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id);
      const paymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : (session.payment_intent as any)?.id ?? null;

      if (paymentIntentId) {
        try {
          const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ["latest_charge"] });
          const latestCharge = (pi as any).latest_charge;
          if (typeof latestCharge === "string") {
            chargeId = latestCharge;
          } else if (latestCharge && typeof latestCharge === "object") {
            chargeId = (latestCharge as any).id ?? null;
          }

          // Fallback: list charges for the payment intent
          if (!chargeId) {
            const cl = await stripe.charges.list({ payment_intent: paymentIntentId, limit: 1 });
            chargeId = cl.data[0]?.id ?? null;
          }
        } catch (_e) {
          // Swallow and fall through to missing_charge_id handling below
        }
      }
    }

    if (!chargeId) {
      return NextResponse.json(
        { error: "missing_charge_id", detail: `No charge could be derived for order ${order.id}` },
        { status: 400 },
      );
    }

    // Issue full refund
    await stripe.refunds.create({ charge: chargeId }, { idempotencyKey: `full-refund-${order.id}` });

    // Update order status to refunded
    await supabaseAdmin.from("orders").update({ status: "refunded" }).eq("id", order.id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "refund_failed", detail: e?.message ?? String(e) }, { status: 500 });
  }
}



