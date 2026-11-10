import { sendSetupInvitation } from "@/lib/accountEmails";
import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { checkOwnerRequest } from "@/lib/adminAuth";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { z } from "zod";

export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const createSchema = z.object({
  email: z.string().trim().email().max(254),
  fullName: z.string().trim().min(1).max(100),
  isAdmin: z.boolean(),
});
const updateSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("access"),
    userId: z.string().uuid(),
    isAdmin: z.boolean(),
    disabled: z.boolean(),
  }),
  z.object({ action: z.literal("resend-invitation"), userId: z.string().uuid() }),
]);

export async function GET(req: NextRequest) {
  const access = await checkOwnerRequest(req);
  if (access.response) return access.response;
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") || 1));
  if (!Number.isSafeInteger(page))
    return NextResponse.json({ error: "Invalid page" }, { status: 400 });
  const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 50 });
  if (error) return NextResponse.json({ error: "Could not load users" }, { status: 500 });
  const { data: profiles, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select(
      "id, full_name, is_admin, is_disabled, invitation_email_status, invitation_sent_at, setup_complete, setup_completed_at",
    )
    .in(
      "id",
      data.users.map((u) => u.id),
    );
  if (profileError)
    return NextResponse.json({ error: "Could not load user access" }, { status: 500 });
  return NextResponse.json(
    {
      currentUserId: access.user.id,
      hasMore: data.users.length === 50,
      users: data.users.map((u) => {
        const p = profiles?.find((p) => p.id === u.id);
        return {
          id: u.id,
          email: u.email,
          fullName: p?.full_name ?? "",
          isAdmin: p?.is_admin ?? false,
          isOwner: u.id === access.user.id,
          disabled: p?.is_disabled ?? false,
          lastSignIn: u.last_sign_in_at ?? null,
          invitationEmailStatus: p?.invitation_email_status ?? "not_sent",
          invitationSentAt: p?.invitation_sent_at ?? null,
          setupComplete: p?.setup_complete ?? false,
          setupCompletedAt: p?.setup_completed_at ?? null,
        };
      }),
    },
    { headers },
  );
}

export async function POST(req: NextRequest) {
  const access = await checkOwnerRequest(req);
  if (access.response) return access.response;
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return NextResponse.json({ error: "Enter a name and valid email address" }, { status: 400 });
  const { email, fullName, isAdmin } = parsed.data;
  const invitationToken = randomUUID();
  const { error: invitationError } = await supabaseAdmin.rpc("authorize_user_invitation", {
    actor_id: access.user.id,
    invite_email: email.toLowerCase(),
    invite_token: invitationToken,
  });
  if (invitationError)
    return NextResponse.json(
      { error: "Only the owner can authorize a new account" },
      { status: 403 },
    );
  // Create the account before emailing so its assigned access is already in place.
  const { data, error } = await supabaseAdmin.auth.admin.generateLink({
    type: "invite",
    email: email.toLowerCase(),
    options: { data: { full_name: fullName, owner_invitation_token: invitationToken } },
  });
  if (error || !data.user || !data.properties) {
    return NextResponse.json(
      { error: "Could not create this account. If it already exists, use Resend invitation." },
      { status: 400 },
    );
  }
  const { error: profileError } = await supabaseAdmin.rpc("manage_user_access", {
    actor_id: access.user.id,
    target_id: data.user.id,
    make_admin: isAdmin,
    disable_user: false,
  });
  if (profileError)
    return NextResponse.json(
      {
        error:
          "Account created, but access could not be saved. The invitation has not been emailed. Review this user before resending.",
      },
      { status: 500 },
    );
  const recipient = { id: data.user.id, email: data.user.email ?? email.toLowerCase(), fullName };
  const delivery = await sendSetupInvitation({
    actorId: access.user.id,
    userId: recipient.id,
    email: recipient.email,
    fullName,
    completed: false,
    initialToken: data.properties.hashed_token,
  });
  return NextResponse.json(
    { ok: true, recipient, emailStatus: delivery.status },
    { status: 201, headers },
  );
}

export async function PATCH(req: NextRequest) {
  const access = await checkOwnerRequest(req);
  if (access.response) return access.response;
  const parsed = updateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid user update" }, { status: 400 });
  const input = parsed.data;
  if (input.action === "resend-invitation") {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("full_name, is_disabled, setup_complete")
      .eq("id", input.userId)
      .maybeSingle();
    if (!profile || profile.is_disabled)
      return NextResponse.json(
        { error: "Enable this user before emailing an invitation" },
        { status: 400 },
      );
    const { data: account, error: accountError } = await supabaseAdmin.auth.admin.getUserById(
      input.userId,
    );
    if (accountError || !account.user?.email)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    const recipient = {
      id: account.user.id,
      email: account.user.email,
      fullName: profile.full_name ?? "",
    };
    const delivery = await sendSetupInvitation({
      actorId: access.user.id,
      userId: recipient.id,
      email: recipient.email,
      fullName: recipient.fullName,
      completed: profile.setup_complete,
    });
    if (delivery.status === "rate_limited")
      return NextResponse.json(
        { error: "Please wait one minute before resending this email" },
        { status: 429, headers },
      );
    return NextResponse.json({ ok: true, recipient, emailStatus: delivery.status }, { headers });
  }
  // This database function serializes role changes and rechecks the actor atomically.
  const { error } = await supabaseAdmin.rpc("manage_user_access", {
    actor_id: access.user.id,
    target_id: input.userId,
    make_admin: input.isAdmin,
    disable_user: input.disabled,
  });
  if (error)
    return NextResponse.json(
      {
        error:
          "Access change refused. The owner account is protected; only the owner can manage other users.",
      },
      { status: 400 },
    );
  const { error: signInError } = await supabaseAdmin.auth.admin.updateUserById(input.userId, {
    ban_duration: input.disabled ? "876000h" : "none",
  });
  if (signInError)
    return NextResponse.json(
      {
        error:
          "Store permissions were updated, but sign-in status could not be changed. Retry this action.",
      },
      { status: 500 },
    );
  return NextResponse.json({ ok: true }, { headers });
}
