"use client";

import Link from "next/link";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      window.location.href = "/admin";
    } catch (err: any) {
      setError(err?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container max-w-md py-12">
      <h1 className="mb-4 text-2xl font-semibold">Login</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm">
          Email
          <Input
            type="email"
            required
            className="mt-1"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Password
          <Input
            type="password"
            required
            className="mt-1"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        <div className="flex items-center justify-between">
          <Button type="submit" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </Button>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:underline"
            onClick={async () => {
              setError(null);
              try {
                const redirectTo = `${window.location.origin}/reset-password`;
                const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
                if (error) throw error;
                setResetSent(true);
              } catch (err: any) {
                setError(err?.message ?? "Failed to send reset email");
              }
            }}
          >
            Forgot password?
          </button>
        </div>
      </form>
      {error && (
        <div className="mt-4 rounded-md border border-border p-3 text-sm text-red-600">{error}</div>
      )}
      {resetSent && (
        <div className="mt-4 rounded-md border border-border p-3 text-sm text-muted-foreground">
          Check your email for the reset link.
        </div>
      )}
      <div className="mt-6 text-xs text-muted-foreground">
        Don’t see a signup? New accounts must be created by an admin.
      </div>
    </div>
  );
}


