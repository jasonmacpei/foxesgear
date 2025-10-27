"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";

type Props = { children: React.ReactNode };

export function AdminGuard({ children }: Props) {
  const [status, setStatus] = useState<"loading" | "anon" | "denied" | "ok">("loading");

  useEffect(() => {
    let mounted = true;
    async function run() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!mounted) return;
      if (!user) {
        setStatus("anon");
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_admin")
        .eq("id", user.id)
        .single();
      if (!mounted) return;
      setStatus(profile?.is_admin ? "ok" : "denied");
    }
    run();
    return () => {
      mounted = false;
    };
  }, []);

  if (status === "loading") {
    return (
      <div className="rounded-lg border border-border p-6 text-sm text-muted-foreground">Checking access…</div>
    );
  }
  if (status === "anon") {
    return (
      <div className="rounded-lg border border-border p-6 text-sm">
        <div className="mb-2 font-medium">Admin login required</div>
        <div className="text-muted-foreground">Please sign in to continue.</div>
        <div className="mt-4">
          <Link href="/login" className="rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
            Go to Login
          </Link>
        </div>
      </div>
    );
  }
  if (status === "denied") {
    return (
      <div className="rounded-lg border border-border p-6 text-sm">
        <div className="mb-2 font-medium">Access denied</div>
        <div className="text-muted-foreground">Your account is not authorized to access admin.</div>
      </div>
    );
  }
  return <>{children}</>;
}


