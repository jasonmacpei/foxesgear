"use client";

import { useCallback, useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

type UserRow = {
  id: string;
  email: string;
  fullName: string;
  isAdmin: boolean;
  disabled: boolean;
  lastSignIn: string | null;
};

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
  const [link, setLink] = useState("");

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
    setLink("");
    try {
      const res = await fetch("/api/admin/users", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save user");
      if (data.setupLink) setLink(data.setupLink);
      else setMessage("User access updated.");
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Users</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add accounts and control admin access. Admins can manage the store, orders, refunds,
          seasons, and other users. Standard users have no admin access.
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
          {busy ? "Saving…" : "Create account and setup link"}
        </Button>
        <p className="text-sm text-muted-foreground">
          Share the private setup link directly with the person. They choose their own password. No
          email is sent automatically.
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
      {link && (
        <div className="space-y-3 rounded-lg border border-border p-4" role="status">
          <h3 className="font-semibold">Private password-setup link</h3>
          <p className="text-sm">
            This expiring link gives access to the account. Share it only with the intended person.
          </p>
          <Input aria-label="Password setup link" value={link} readOnly />
          <Button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setMessage("Link copied.");
              } catch {
                setError("Select the link above and copy it.");
              }
            }}
          >
            Copy link
          </Button>
          <button className="ml-3 text-sm underline" onClick={() => setLink("")}>
            Dismiss
          </button>
        </div>
      )}
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/60">
            <tr>
              <th className="p-3">User</th>
              <th className="p-3">Access</th>
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
                  {u.disabled ? "Disabled" : u.isAdmin ? "Admin" : "Standard"}
                </td>
                <td className="p-3">
                  {u.lastSignIn
                    ? new Date(u.lastSignIn).toLocaleDateString("en-CA", {
                        timeZone: "America/Halifax",
                      })
                    : "Never"}
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-3">
                    <button
                      className="underline disabled:opacity-40"
                      disabled={busy || u.disabled}
                      onClick={() => void change("PATCH", { action: "setup-link", userId: u.id })}
                    >
                      Setup link
                    </button>
                    {u.id !== currentId && (
                      <>
                        <button
                          className="underline disabled:opacity-40"
                          disabled={busy || u.disabled}
                          onClick={() => {
                            if (
                              window.confirm(
                                `${u.isAdmin ? "Remove" : "Grant"} admin access for ${u.email}?`,
                              )
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
                            if (
                              window.confirm(
                                `${u.disabled ? "Enable" : "Disable"} access for ${u.email}?`,
                              )
                            )
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
