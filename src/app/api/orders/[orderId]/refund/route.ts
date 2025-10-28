import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { stripe } from "@/lib/stripeClient";

export const runtime = "nodejs";

export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await context.params;
  if (!orderId) {
    return NextResponse.json({ error: "missing_order_id" }, { status: 400 });
  }

  // Fetch order with Stripe charge or session to derive payment intent
  // Try matching by order UUID or by stripe_session_id (just in case the client passed a session id)
  let { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("*")
    .or(`id.eq.${orderId},stripe_session_id.eq.${orderId}`)
    .limit(1)
    .maybeSingle();

  // Fallback: in case a Checkout Session ID was passed by mistake
  if ((!order || error) && !order && orderId) {
    const fallback = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("stripe_session_id", orderId)
      .maybeSingle();
    order = fallback.data as typeof order;
    error = fallback.error ?? null;
  }

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
    await stripe.refunds.create({ charge: chargeId });

    // Update order status to refunded
    await supabaseAdmin.from("orders").update({ status: "refunded" }).eq("id", order.id);

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: "refund_failed", detail: e?.message ?? String(e) }, { status: 500 });
  }
}



