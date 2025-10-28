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
  const { data: order, error } = await supabaseAdmin
    .from("orders")
    .select("id, status, amount_total_cents, stripe_charge_id, stripe_session_id, is_test")
    .eq("id", orderId)
    .single();

  if (error || !order) {
    return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }

  if (order.status !== "paid") {
    return NextResponse.json({ error: "order_not_paid" }, { status: 400 });
  }

  try {
    // Prefer refunding by charge if available; otherwise by payment_intent from session
    let chargeId: string | null = order.stripe_charge_id ?? null;

    if (!chargeId && order.stripe_session_id) {
      // Retrieve session to get payment_intent -> charge
      const session = await stripe.checkout.sessions.retrieve(order.stripe_session_id, { expand: ["payment_intent.charges"] });
      const pi = session.payment_intent as any;
      const charges = pi?.charges?.data ?? [];
      chargeId = charges[0]?.id ?? null;
    }

    if (!chargeId) {
      return NextResponse.json({ error: "missing_charge_id" }, { status: 400 });
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



