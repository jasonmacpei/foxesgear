import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resend } from "@/lib/resendClient";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return new NextResponse("Missing stripe signature or secret", { status: 400 });
  }

  const body = await req.text();
  let event: unknown;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err) {
    return new NextResponse("Invalid signature", { status: 400 });
  }

  // Only handle a subset needed for MVP
  const typed = event as Stripe.Event;
  if (typed.type === "checkout.session.completed") {
    const session = typed.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email ?? session.customer_email ?? "";
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id);

    // Compute totals and persist
    const amountTotal = session.amount_total ?? 0;
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        email,
        payment_method: "stripe",
        status: "paid",
        amount_total_cents: amountTotal,
        stripe_session_id: session.id,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "order_insert_failed" }, { status: 500 });
    }

    for (const li of lineItems.data) {
      // Best-effort extraction of metadata
      const productName = li.description ?? "Item";
      const unitPrice = li.price?.unit_amount ?? 0;
      const qty = li.quantity ?? 1;
      const size = (li.price?.product as unknown as { metadata?: Record<string, string> })?.metadata?.size ??
        (li as unknown as { metadata?: Record<string, string> })?.metadata?.size ?? null;
      const color = (li.price?.product as unknown as { metadata?: Record<string, string> })?.metadata?.color ??
        (li as unknown as { metadata?: Record<string, string> })?.metadata?.color ?? null;

      await supabaseAdmin.from("order_items").insert({
        order_id: order.id,
        product_name: productName,
        size_value: size,
        color_value: color,
        quantity: qty,
        unit_price_cents: unitPrice,
        line_total_cents: unitPrice * qty,
      });
    }

    const from = process.env.RESEND_FROM;
    if (from && email) {
      await resend.emails.send({
        from,
        to: email,
        subject: "FoxesGear Order Confirmation",
        html: `<p>Thanks for your order! We'll email pickup details soon.</p><p>Order total: $${(amountTotal / 100).toFixed(2)}</p>`,
      });
    }
  }

  return NextResponse.json({ received: true });
}


