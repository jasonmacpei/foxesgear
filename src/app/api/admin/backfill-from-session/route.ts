import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resend } from "@/lib/resendClient";
import type Stripe from "stripe";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-admin-token");
  if (!token || token !== process.env.ADMIN_BACKFILL_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { sessionId } = await req.json().catch(() => ({ sessionId: undefined }));
  if (!sessionId) {
    return NextResponse.json({ error: "missing_session_id" }, { status: 400 });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "line_items.data.price.product"],
    });

    if (!session || session.payment_status !== "paid") {
      return NextResponse.json({ error: "session_not_paid" }, { status: 400 });
    }

    const email = session.customer_details?.email ?? session.customer_email ?? "";
    const meta = (session.metadata ?? {}) as Record<string, string>;

    // Check if already exists (idempotent by stripe_session_id)
    const { data: existing } = await supabaseAdmin
      .from("orders")
      .select("id")
      .eq("stripe_session_id", session.id)
      .limit(1)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({ ok: true, note: "already_present", orderId: existing.id });
    }

    const amountTotal = session.amount_total ?? 0;
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .insert({
        email,
        customer_name: meta.customer_name ?? "",
        affiliated_player: meta.affiliated_player ?? "",
        affiliated_group: meta.affiliated_group ?? "",
        phone: meta.phone ?? "",
        payment_method: "stripe",
        status: "paid",
        amount_total_cents: amountTotal,
        stripe_session_id: session.id,
        is_test: !(session.livemode ?? false),
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (orderErr || !order) {
      return NextResponse.json({ error: "order_insert_failed", detail: orderErr?.message }, { status: 500 });
    }

    // Insert items
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { expand: ["data.price.product"] });
    for (const li of lineItems.data) {
      const productName = li.description ?? "Item";
      const unitPrice = li.price?.unit_amount ?? 0;
      const qty = li.quantity ?? 1;
      const priceProduct = li.price?.product as unknown as { metadata?: Record<string, string> } | string | null | undefined;
      const metaFromProduct = typeof priceProduct === "object" && priceProduct !== null ? priceProduct.metadata ?? {} : {};
      const metaFromLine = (li as unknown as { metadata?: Record<string, string> })?.metadata ?? {};
      const mergedMeta = { ...metaFromProduct, ...metaFromLine } as Record<string, string>;
      const size = mergedMeta.size ?? null;
      const color = mergedMeta.color ?? null;

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

    // Send email (best effort)
    const from = process.env.RESEND_FROM;
    if (from && email) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
        const logoUrl = siteUrl ? `${siteUrl}/logo.png` : "";
        const currency = (session.currency ?? "cad").toUpperCase();
        const html = `<div>Thanks for your order.</div>`; // keep minimal for backfill
        await resend.emails.send({ from, to: email, subject: "FoxesGear Order Confirmation", html });
      } catch (_) {}
    }

    return NextResponse.json({ ok: true, orderId: order.id });
  } catch (e: any) {
    return NextResponse.json({ error: "backfill_failed", detail: e?.message ?? String(e) }, { status: 500 });
  }
}


