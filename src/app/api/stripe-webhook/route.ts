import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripeClient";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { resend } from "@/lib/resendClient";
import type Stripe from "stripe";

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
    // Expand product so we can read product_data.metadata (size/color/slug)
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
      expand: ["data.price.product"],
    });
    const meta = (session.metadata ?? {}) as Record<string, string>;

    // Compute totals and persist
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
      console.error("order_insert_failed", orderErr);
      return NextResponse.json({ error: "order_insert_failed", detail: orderErr?.message }, { status: 500 });
    }

    // Best-effort: fetch charge + fees and update order
    try {
      const pi = await stripe.paymentIntents.retrieve(String(session.payment_intent), {
        expand: ["latest_charge.balance_transaction"],
      });
      const latestCharge = (pi as any)?.latest_charge as
        | (Stripe.Charge & { balance_transaction?: Stripe.BalanceTransaction | string })
        | string
        | undefined;
      let chargeId: string | null = null;
      let feeCents: number | null = null;
      let netCents: number | null = null;

      if (typeof latestCharge === "string") {
        chargeId = latestCharge;
        const ch = await stripe.charges.retrieve(latestCharge, { expand: ["balance_transaction"] });
        const bt = (ch.balance_transaction as Stripe.BalanceTransaction | null) ?? null;
        if (bt) {
          feeCents = bt.fee ?? null;
          netCents = bt.net ?? null;
        }
      } else if (latestCharge && typeof latestCharge === "object") {
        chargeId = latestCharge.id;
        const bt = latestCharge.balance_transaction as Stripe.BalanceTransaction | string | undefined;
        if (bt && typeof bt !== "string") {
          feeCents = bt.fee ?? null;
          netCents = bt.net ?? null;
        } else if (typeof bt === "string") {
          const btr = await stripe.balanceTransactions.retrieve(bt);
          feeCents = btr.fee ?? null;
          netCents = btr.net ?? null;
        }
      }

      await supabaseAdmin
        .from("orders")
        .update({ stripe_charge_id: chargeId, stripe_fee_cents: feeCents, stripe_net_cents: netCents })
        .eq("id", order.id);
    } catch (e) {
      console.error("stripe_fee_fetch_failed", e);
    }

    // Also accumulate items to include in the email
    const itemsForEmail: {
      productName: string;
      size?: string | null;
      color?: string | null;
      qty: number;
      unitPrice: number;
      lineTotal: number;
      slug?: string | null;
    }[] = [];

    for (const li of lineItems.data) {
      // Best-effort extraction of metadata
      const productName = li.description ?? "Item";
      const unitPrice = li.price?.unit_amount ?? 0;
      const qty = li.quantity ?? 1;
      const priceProduct = li.price?.product as unknown as { metadata?: Record<string, string> } | string | null | undefined;
      const metaFromProduct = typeof priceProduct === "object" && priceProduct !== null ? priceProduct.metadata ?? {} : {};
      const metaFromLine = (li as unknown as { metadata?: Record<string, string> })?.metadata ?? {};
      const mergedMeta = { ...metaFromProduct, ...metaFromLine } as Record<string, string>;
      const size = mergedMeta.size ?? null;
      const color = mergedMeta.color ?? null;
      const slug = mergedMeta.slug ?? null;

      await supabaseAdmin.from("order_items").insert({
        order_id: order.id,
        product_name: productName,
        size_value: size,
        color_value: color,
        quantity: qty,
        unit_price_cents: unitPrice,
        line_total_cents: unitPrice * qty,
      });

      itemsForEmail.push({
        productName,
        size,
        color,
        qty,
        unitPrice,
        lineTotal: unitPrice * qty,
        slug,
      });
    }

    const from = process.env.RESEND_FROM;
    if (from && email) {
      try {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
        const logoUrl = `${siteUrl}/Stratford%20Foxes%20Logo%202.png`;

        const currency = "CAD";
        const rowsHtml = itemsForEmail
          .map((it) => {
            const variantBits = [it.size ? `Size: ${it.size}` : null, it.color ? `Color: ${it.color}` : null]
              .filter(Boolean)
              .join(" · ");
            const nameCell = it.productName;
            return `
              <tr>
                <td style=\"padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827\">${nameCell}${variantBits ? `<div style=\\"color:#6b7280;font-size:12px\\">${variantBits}</div>` : ""}</td>
                <td style=\"padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;text-align:center\">${it.qty}</td>
                <td style=\"padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;text-align:right\">$${(it.unitPrice / 100).toFixed(2)}</td>
                <td style=\"padding:8px 12px;border-bottom:1px solid #e5e7eb;color:#111827;text-align:right\">$${(it.lineTotal / 100).toFixed(2)}</td>
              </tr>`;
          })
          .join("");

        const customerBlock = `
          <div style=\"margin:16px 0;padding:12px;border:1px solid #e5e7eb;border-radius:8px;background:#f9fafb\">
            <div style=\"font-weight:600;margin-bottom:6px\">Customer</div>
            <div style=\"color:#111827\">${meta.customer_name ?? ""}</div>
            <div style=\"color:#6b7280\">${email}</div>
            <div style=\"margin-top:8px;color:#111827\">Affiliated Player: ${meta.affiliated_player ?? ""}</div>
            <div style=\"color:#111827\">Group: ${meta.affiliated_group ?? ""}</div>
            <div style=\"color:#111827\">Phone: ${meta.phone ?? ""}</div>
          </div>`;

        const html = `
          <div style=\"font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111827\">
            <div style=\"text-align:center;margin-bottom:16px\">
              <img src=\"${logoUrl}\" alt=\"Stratford Foxes\" style=\"max-width:160px;height:auto\" />
            </div>
            <h2 style=\"margin:0 0 4px;font-size:20px\">Thanks for your order!</h2>
            <p style=\"margin:0 0 16px;color:#6b7280\">We'll email pickup details soon.</p>
            ${customerBlock}
            <table cellpadding=\"0\" cellspacing=\"0\" width=\"100%\" style=\"border-collapse:collapse;background:#ffffff;border:1px solid #e5e7eb;border-radius:8px;overflow:hidden\">
              <thead>
                <tr style=\"background:#f9fafb;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:.02em\">
                  <th align=\"left\" style=\"padding:10px 12px;border-bottom:1px solid #e5e7eb\">Item</th>
                  <th style=\"padding:10px 12px;border-bottom:1px solid #e5e7eb\">Qty</th>
                  <th align=\"right\" style=\"padding:10px 12px;border-bottom:1px solid #e5e7eb\">Price</th>
                  <th align=\"right\" style=\"padding:10px 12px;border-bottom:1px solid #e5e7eb\">Total</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan=\"3\" style=\"padding:12px;color:#111827;text-align:right;font-weight:600\">Order total</td>
                  <td style=\"padding:12px;color:#111827;text-align:right;font-weight:700\">$${(amountTotal / 100).toFixed(2)} ${currency}</td>
                </tr>
              </tfoot>
            </table>
          </div>`;

        await resend.emails.send({
          from,
          to: email,
          replyTo: "stratfordfoxes@gmail.com",
          subject: "FoxesGear Order Confirmation",
          html,
        });
      } catch (mailErr) {
        // Log but do not fail the webhook; Stripe will consider this delivered
        console.error("resend_send_failed", mailErr);
      }
    }
  }

  return NextResponse.json({ received: true });
}


