import "server-only";
import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "./supabaseServer";
import { supabaseAdmin } from "./supabaseAdmin";

// Always verify with Auth and read the current database role; never trust metadata.
export async function getAdminAccess() {
  const client = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  if (error || !user) {
    return { user: null, status: 401 } as const;
  }
  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("is_admin, is_disabled")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError) return { user: null, status: 503 } as const;
  if (!profile?.is_admin || profile.is_disabled) return { user: null, status: 403 } as const;
  const { data: ownerId, error: ownerError } = await supabaseAdmin.rpc("store_owner_id");
  if (ownerError || !ownerId) return { user: null, status: 503 } as const;
  return { user, status: 200, isOwner: ownerId === user.id } as const;
}

export async function requireAdminPage() {
  const access = await getAdminAccess();
  if (!access.user) redirect(`/login?reason=${access.status === 403 ? "denied" : "signin"}`);
  return { ...access.user, isOwner: access.isOwner };
}

export async function checkAdminRequest(request: Request) {
  if (!["GET", "HEAD"].includes(request.method)) {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) {
      return {
        user: null,
        response: NextResponse.json({ error: "Invalid request origin" }, { status: 403 }),
      };
    }
  }
  const access = await getAdminAccess();
  if (!access.user) {
    return {
      user: null,
      response: NextResponse.json(
        {
          error:
            access.status === 401
              ? "Sign in required"
              : access.status === 403
                ? "Admin access required"
                : "Access check unavailable",
        },
        { status: access.status, headers: { "Cache-Control": "private, no-store" } },
      ),
    };
  }
  return { user: access.user, isOwner: access.isOwner, response: null };
}

export async function requireOwnerPage() {
  const access = await requireAdminPage();
  if (!access.isOwner) redirect("/admin?reason=owner-only");
  return access;
}

export async function checkOwnerRequest(request: Request) {
  const access = await checkAdminRequest(request);
  if (access.response) return access;
  if (!access.isOwner)
    return {
      user: null,
      response: NextResponse.json(
        { error: "Only the store owner can manage users" },
        { status: 403, headers: { "Cache-Control": "private, no-store" } },
      ),
    };
  return access;
}
