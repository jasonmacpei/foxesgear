import "server-only";
import { resend } from "./resendClient";
import { supabaseAdmin } from "./supabaseAdmin";
import { siteOrigin } from "./siteOrigin";

const ownerEmail = "jasonmacpei@hotmail.com";
const escapeHtml = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );

function fromAddress() {
  if (!process.env.RESEND_FROM) throw new Error("Account email sender is not configured");
  return process.env.RESEND_FROM;
}

export async function sendSetupInvitation(input: {
  actorId: string;
  userId: string;
  email: string;
  fullName: string;
  completed: boolean;
  initialToken?: string;
}) {
  const { data: attemptId, error: reservationError } = await supabaseAdmin.rpc(
    "reserve_invitation_email",
    { actor_id: input.actorId, target_id: input.userId },
  );
  if (reservationError || !attemptId)
    return {
      status: reservationError?.message.includes("one minute")
        ? ("rate_limited" as const)
        : ("failed" as const),
    };
  try {
    let token = input.initialToken;
    if (!token) {
      const { data, error } = await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: input.email,
      });
      if (error || !data.properties) throw new Error("Could not generate a setup invitation");
      token = data.properties.hashed_token;
    }
    const link = new URL("/reset-password", siteOrigin());
    link.searchParams.set("token_hash", token);
    link.searchParams.set("type", input.initialToken ? "invite" : "recovery");
    const title = input.completed
      ? "Reset your FoxesGear password"
      : "Set up your FoxesGear account";
    const text = `Hi ${input.fullName || "there"},\n\n${input.completed ? "Use this private link to reset your password:" : "You have been invited to FoxesGear. Use this private link to choose your password:"}\n${link}\n\nThen sign in at ${siteOrigin()}/login using ${input.email}.\n\nThis link expires. If you need a new one, contact the store owner.\nIf you were not expecting this email, you can ignore it.`;
    const { data, error } = await resend.emails.send(
      {
        from: fromAddress(),
        to: input.email,
        replyTo: ownerEmail,
        subject: title,
        text,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#18181b"><h1 style="font-size:24px">${title}</h1><p>Hi ${escapeHtml(input.fullName || "there")},</p><p>${input.completed ? "Choose a new password for your FoxesGear account." : "Your FoxesGear account is ready. Choose your own password to finish setting it up."}</p><p style="margin:28px 0"><a href="${escapeHtml(link.toString())}" style="background:#f97316;color:white;padding:12px 20px;border-radius:8px;text-decoration:none">${input.completed ? "Reset password" : "Set up my account"}</a></p><p>Then <a href="${escapeHtml(siteOrigin())}/login">sign in</a> using <strong>${escapeHtml(input.email)}</strong>.</p><p style="color:#52525b;font-size:13px">This private link expires. Contact the store owner if you need another invitation. If you were not expecting this email, you can ignore it.</p></div>`,
      },
      { idempotencyKey: `account-invitation/${attemptId}`, signal: AbortSignal.timeout(12000) },
    );
    if (error || !data?.id) throw new Error("Email provider did not accept the invitation");
    const { error: saveError } = await supabaseAdmin
      .from("profiles")
      .update({ invitation_email_status: "sent", invitation_sent_at: new Date().toISOString() })
      .eq("id", input.userId)
      .eq("invitation_attempt_id", attemptId);
    if (saveError) return { status: "sent" as const, trackingWarning: true };
    return { status: "sent" as const };
  } catch {
    await supabaseAdmin
      .from("profiles")
      .update({ invitation_email_status: "failed" })
      .eq("id", input.userId)
      .eq("invitation_attempt_id", attemptId);
    return { status: "failed" as const };
  }
}

export async function deliverSignupNotifications(userId?: string) {
  const { data: jobs, error } = await supabaseAdmin.rpc("claim_signup_emails", {
    target_user_id: userId ?? null,
  });
  if (error) throw new Error("Could not load signup notifications");
  let sent = 0;
  for (const job of jobs ?? []) {
    let messageId: string | null = null;
    let failure: string | null = null;
    try {
      const when = new Date(job.completed_at).toLocaleString("en-CA", {
        timeZone: "America/Halifax",
        dateStyle: "medium",
        timeStyle: "short",
      });
      const text = `${job.full_name || job.email} completed their FoxesGear account setup.\n\nName: ${job.full_name || "Not provided"}\nEmail: ${job.email}\nCompleted: ${when} (Atlantic time)\n\nManage users: ${siteOrigin()}/admin/users`;
      const result = await resend.emails.send(
        {
          from: fromAddress(),
          to: ownerEmail,
          subject: `FoxesGear signup: ${job.full_name || job.email}`,
          text,
        },
        { idempotencyKey: `signup-completed/${job.id}`, signal: AbortSignal.timeout(12000) },
      );
      if (result.error || !result.data?.id)
        throw new Error("Email provider did not accept signup notification");
      messageId = result.data.id;
      sent++;
    } catch {
      failure = "Email provider unavailable; notification will be retried";
    }
    const saved = await supabaseAdmin.rpc("finish_signup_email", {
      job_id: job.id,
      job_claim_id: job.claim_id,
      provider_message_id: messageId,
      error_text: failure,
    });
    if (saved.error) throw new Error("Could not record notification result");
  }
  return { sent };
}
