"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  isOwner: boolean;
  disabled: boolean;
  lastSignIn: string | null;
  invitationEmailStatus: "not_sent" | "sending" | "sent" | "failed";
  invitationSentAt: string | null;
  setupComplete: boolean;
  setupCompletedAt: string | null;
};

function emailAction(user: UserRow) {
  return user.setupComplete
    ? "Send password reset"
    : user.invitationEmailStatus === "not_sent"
      ? "Send invitation"
      : "Resend invitation";
}

export function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [currentId, setCurrentId] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const res = await fetch(`/api/admin/users?page=${page}`, { cache: "no-store" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not load users");
    return data;
  }, [page]);
  const applyUsers = useCallback(
    (data: { users: UserRow[]; currentUserId: string; hasMore: boolean }) => {
      setUsers(data.users);
      setCurrentId(data.currentUserId);
      setHasMore(data.hasMore);
    },
    [],
  );
  useEffect(() => {
    let active = true;
    load()
      .then((data) => {
        if (active) applyUsers(data);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    return () => {
      active = false;
    };
  }, [load, applyUsers]);

  async function change(method: "POST" | "PATCH", body: object) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/admin/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save user");
      if (data.emailStatus) {
        const recipient = data.recipient;
        if (data.emailStatus === "sent")
          setMessage(
            `Email sent to ${recipient.fullName || recipient.email} (${recipient.email}).`,
          );
        else
          setError(
            `The account is saved, but the email to ${recipient.email} could not be sent. Use Resend invitation to try again in one minute.`,
          );
      } else setMessage("User access updated.");
      if (method === "POST") {
        setEmail("");
        setName("");
        setIsAdmin(false);
      }
      applyUsers(await load());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setBusy(false);
    }
  }

  function userActions(u: UserRow) {
    return (
      <div className="flex flex-wrap gap-3">
        <button
          className="underline disabled:opacity-40"
          disabled={busy || u.disabled}
          aria-label={`${emailAction(u)} to ${u.fullName || u.email}`}
          onClick={() => void change("PATCH", { action: "resend-invitation", userId: u.id })}
        >
          {emailAction(u)}
        </button>
        {!u.isOwner && u.id !== currentId && (
          <>
            <button
              className="underline disabled:opacity-40"
              disabled={busy || u.disabled}
              onClick={() => {
                if (
                  window.confirm(`${u.isAdmin ? "Remove" : "Grant"} admin access for ${u.email}?`)
                )
                  void change("PATCH", {
                    action: "access",
                    userId: u.id,
                    isAdmin: !u.isAdmin,
                    disabled: false,
                  });
              }}
            >
              {u.isAdmin ? "Remove admin" : "Make admin"}
            </button>
            <button
              className="underline disabled:opacity-40"
              disabled={busy}
              onClick={() => {
                if (window.confirm(`${u.disabled ? "Enable" : "Disable"} access for ${u.email}?`))
                  void change("PATCH", {
                    action: "access",
                    userId: u.id,
                    isAdmin: false,
                    disabled: !u.disabled,
                  });
              }}
            >
              {u.disabled ? "Enable" : "Disable"}
            </button>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Users</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Only you, the protected store owner, can add users or change their access. Admins can
          manage products, orders, refunds, and seasons. Standard users have no admin access.
        </p>
      </div>
      <form
        className="space-y-4 rounded-lg border border-border p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void change("POST", { email, fullName: name, isAdmin });
        }}
      >
        <h3 className="text-lg font-semibold">Add user</h3>
        <label className="block text-sm">
          Full name
          <Input
            className="mt-1"
            required
            maxLength={100}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          Email
          <Input
            className="mt-1"
            required
            type="email"
            maxLength={254}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} />
          Give admin access
        </label>
        <Button disabled={busy} type="submit">
          {busy ? "Saving…" : "Add user and email invitation"}
        </Button>
        <p className="text-sm text-muted-foreground">
          FoxesGear will email their setup invitation automatically. You’ll be emailed at
          jasonmacpei@hotmail.com when they choose their password and complete setup.
        </p>
      </form>
      {error && (
        <p role="alert" className="rounded-md border border-red-300 p-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="text-sm">
          {message}
        </p>
      )}
      <div className="hidden overflow-x-auto rounded-lg border border-border md:block">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Access</th>
              <th className="p-3">Account setup</th>
              <th className="p-3">Last sign in</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="p-3">
                  <div className="font-medium">
                    {u.fullName || u.email}
                    {u.id === currentId ? " (you)" : ""}
                  </div>
                  <div className="text-muted-foreground">{u.email}</div>
                </td>
                <td className="p-3">
                  {u.isOwner
                    ? "Owner · protected"
                    : u.disabled
                      ? "Disabled"
                      : u.isAdmin
                        ? "Admin"
                        : "Standard"}
                </td>
                <td className="p-3">
                  <div className={u.setupComplete ? "font-medium text-green-700" : "font-medium"}>
                    {u.setupComplete ? "Setup complete" : "Awaiting setup"}
                  </div>
                  {u.setupComplete ? (
                    <div className="text-xs text-muted-foreground">
                      {u.setupCompletedAt
                        ? new Date(u.setupCompletedAt).toLocaleString("en-CA", {
                            timeZone: "America/Halifax",
                            dateStyle: "medium",
                            timeStyle: "short",
                          })
                        : "Date unavailable"}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">
                      {u.invitationEmailStatus === "sent" && u.invitationSentAt
                        ? `Invitation emailed ${new Date(u.invitationSentAt).toLocaleString("en-CA", { timeZone: "America/Halifax", dateStyle: "medium", timeStyle: "short" })}`
                        : u.invitationEmailStatus === "failed"
                          ? "Email failed — resend needed"
                          : u.invitationEmailStatus === "sending"
                            ? "Email sending…"
                            : "Invitation not emailed yet"}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {u.lastSignIn
                    ? new Date(u.lastSignIn).toLocaleDateString("en-CA", {
                        timeZone: "America/Halifax",
                      })
                    : "Never"}
                </td>
                <td className="p-3">{userActions(u)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="space-y-3 md:hidden">
        {users.map((u) => (
          <article
            key={u.id}
            className="space-y-3 rounded-lg border border-border p-4"
            aria-label={`Account for ${u.fullName || u.email}`}
          >
            <div>
              <div className="font-semibold">
                {u.fullName || u.email}
                {u.id === currentId ? " (you)" : ""}
              </div>
              <div className="break-all text-sm text-muted-foreground">{u.email}</div>
            </div>
            <div className="flex flex-wrap gap-2 text-sm">
              <span className="rounded-full bg-muted px-2 py-1">
                {u.isOwner
                  ? "Owner · protected"
                  : u.disabled
                    ? "Disabled"
                    : u.isAdmin
                      ? "Admin"
                      : "Standard"}
              </span>
              <span
                className={`rounded-full px-2 py-1 ${u.setupComplete ? "bg-green-50 text-green-800" : "bg-muted"}`}
              >
                {u.setupComplete ? "Setup complete" : "Awaiting setup"}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {u.setupComplete
                ? u.setupCompletedAt
                  ? `Completed ${new Date(u.setupCompletedAt).toLocaleString("en-CA", { timeZone: "America/Halifax", dateStyle: "medium", timeStyle: "short" })}`
                  : "Setup date unavailable"
                : u.invitationEmailStatus === "sent" && u.invitationSentAt
                  ? `Invitation emailed ${new Date(u.invitationSentAt).toLocaleString("en-CA", { timeZone: "America/Halifax", dateStyle: "medium", timeStyle: "short" })}`
                  : u.invitationEmailStatus === "failed"
                    ? "Email failed — resend needed"
                    : u.invitationEmailStatus === "sending"
                      ? "Email sending…"
                      : "Invitation not emailed yet"}
            </p>
            {userActions(u)}
          </article>
        ))}
      </div>
      <div className="flex items-center gap-4 text-sm">
        <button
          disabled={busy || page === 1}
          className="underline disabled:opacity-40"
          onClick={() => setPage((p) => p - 1)}
        >
          Previous
        </button>
        <span>Page {page}</span>
        <button
          disabled={busy || !hasMore}
          className="underline disabled:opacity-40"
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
