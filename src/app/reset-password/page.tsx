"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="container max-w-md py-12 text-sm text-muted-foreground">Loading…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}

function ResetPasswordInner() {
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "ready" | "updating" | "done" | "error">("idle");

  useEffect(() => {
    // When Supabase sends a recovery link, it arrives with type=recovery
    const type = params.get("type");
    // If user lands here without type=recovery, try to set session from URL to enable update
    if (type !== "recovery") {
      supabase.auth.onAuthStateChange(() => {});
    }
    setStatus("ready");
  }, [params]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setStatus("updating");
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="container max-w-md py-12">
      <h1 className="mb-4 text-2xl font-semibold">Reset password</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          New password
          <Input
            type="password"
            required
            className="mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <Button type="submit" disabled={status === "updating"}>
          {status === "updating" ? "Updating…" : "Update password"}
        </Button>
      </form>
      {status === "done" && (
        <div className="mt-4 rounded-md border border-border p-3 text-sm text-muted-foreground">
          Password updated. You can close this tab.
        </div>
      )}
      {status === "error" && (
        <div className="mt-4 rounded-md border border-border p-3 text-sm text-red-600">
          Failed to update password. Try again.
        </div>
      )}
    </div>
  );
}


