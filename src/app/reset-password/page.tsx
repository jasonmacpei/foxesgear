"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function ResetPasswordPage() {
  const initialization = useRef<Promise<void> | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let mounted = true;
    async function initialize() {
      const params = new URLSearchParams(window.location.search);
      const tokenHash = params.get("token_hash");
      const type = params.get("type");
      if (tokenHash && (type === "invite" || type === "recovery")) {
        window.history.replaceState(null, "", "/reset-password");
        const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
        if (error) throw error;
      }
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) throw new Error("Invalid session");
    }
    initialization.current ??= initialize();
    initialization.current
      .then(() => {
        if (mounted) setReady(true);
      })
      .catch(() => {
        if (mounted)
          setError(
            "This setup link is invalid or expired. Ask an admin for a new link, or use Forgot password on the login page.",
          );
      });
    return () => {
      mounted = false;
    };
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) setError(error.message);
    else {
      setDone(true);
      // Completion was recorded by the Auth database trigger, not by this request.
      // If delivery is interrupted, the server's scheduled retry processes the queue.
      await fetch("/api/account/setup-completed", { method: "POST", keepalive: true }).catch(
        () => {},
      );
      await supabase.auth.signOut();
    }
  }
  return (
    <div className="container max-w-md py-12">
      <h1 className="mb-4 text-2xl font-semibold">Set your password</h1>
      {done ? (
        <p role="status">
          Password saved.{" "}
          <Link className="underline" href="/login">
            Sign in
          </Link>{" "}
          to continue.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm">
            New password
            <Input
              className="mt-1"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <p className="text-sm text-muted-foreground">Use at least 12 characters.</p>
          <label className="block text-sm">
            Confirm password
            <Input
              className="mt-1"
              type="password"
              autoComplete="new-password"
              minLength={12}
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </label>
          <Button disabled={!ready || busy} type="submit">
            {busy ? "Saving…" : "Save password"}
          </Button>
        </form>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}
    </div>
  );
}
