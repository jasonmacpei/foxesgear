"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export type SetupInvitation = { id: string; email: string; fullName: string; link: string };

export function ShareAccessDialog({
  invitation,
  onClose,
}: {
  invitation: SetupInvitation;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const linkRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [copying, setCopying] = useState(false);
  const [feedback, setFeedback] = useState<{ manual: boolean; text: string } | null>(null);
  const recipient = invitation.fullName || invitation.email;
  const loginUrl = `${new URL(invitation.link).origin}/login`;
  const message = `Hi ${invitation.fullName || "there"},

You have an account on FoxesGear. Use this private link to choose your password:
${invitation.link}

Then sign in at ${loginUrl} using ${invitation.email}.

This link expires. If it no longer works, ask me for a new one.`;
  const emailDraft = `mailto:${encodeURIComponent(invitation.email)}?subject=${encodeURIComponent("Set up your FoxesGear account")}&body=${encodeURIComponent(message)}`;

  useEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    return () => {
      dialog.close();
    };
  }, []);

  async function copy(kind: "invitation" | "link") {
    setCopying(true);
    setFeedback(null);
    const value = kind === "invitation" ? message : invitation.link;
    const label = kind === "invitation" ? "Invitation" : "Setup link";
    let copied = false;
    try {
      await navigator.clipboard.writeText(value);
      copied = true;
    } catch {
      // Some browsers deny Clipboard API access. Try a selection-based copy,
      // then leave the correct text selected for the user's keyboard shortcut.
      if (kind === "link" && detailsRef.current) detailsRef.current.open = true;
      const field = kind === "invitation" ? messageRef.current : linkRef.current;
      field?.focus();
      field?.select();
      try {
        copied = document.execCommand("copy");
      } catch {
        /* Manual copy remains available. */
      }
    }
    setFeedback(
      copied
        ? {
            manual: false,
            text: `${label} copied for ${recipient}. Paste it into your email or message.`,
          }
        : {
            manual: true,
            text: `${label} selected for ${recipient}. Press ⌘C on Mac or Ctrl+C on Windows to copy it.`,
          },
    );
    setCopying(false);
  }

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onCancel={onClose}
      aria-labelledby="share-access-title"
      aria-describedby="share-access-description"
      className="fixed inset-0 m-auto max-h-[calc(100dvh_-_2rem)] w-[calc(100%_-_2rem)] max-w-xl overflow-y-auto rounded-2xl border border-border bg-background p-5 text-foreground shadow-xl backdrop:bg-black/45 sm:p-6"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Share account access
          </p>
          <h3 id="share-access-title" className="break-words text-xl font-semibold">
            Share access with {recipient}
          </h3>
          <p className="mt-1 break-all text-sm text-muted-foreground">{invitation.email}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close sharing window"
          className="shrink-0 rounded-md px-2 py-1 text-xl text-muted-foreground hover:bg-muted"
        >
          ×
        </button>
      </div>
      <div
        id="share-access-description"
        className="my-5 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950"
      >
        <p className="font-semibold">FoxesGear has not emailed this invitation.</p>
        <p className="mt-1">
          Copy it into an email or message to {recipient}, or open an email draft below. They use
          the link to choose their own password.
        </p>
      </div>
      <label htmlFor="access-invitation" className="text-sm font-medium">
        Invitation for {recipient}
      </label>
      <textarea
        id="access-invitation"
        ref={messageRef}
        readOnly
        value={message}
        rows={9}
        className="mt-2 w-full resize-y rounded-lg border border-border bg-muted/30 p-3 text-sm leading-relaxed"
      />
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="button" disabled={copying} onClick={() => void copy("invitation")}>
          Copy invitation
        </Button>
        <a
          href={emailDraft}
          className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Open email draft
        </a>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Opening a draft does not send it. Review the recipient and press Send in your email app. If
        no draft opens, use Copy invitation.
      </p>
      {feedback && (
        <p
          role="status"
          className={`mt-4 rounded-lg border p-3 text-sm ${feedback.manual ? "border-border bg-muted" : "border-green-300 bg-green-50 text-green-950"}`}
        >
          {feedback.text}
        </p>
      )}
      <details ref={detailsRef} className="mt-5 border-t border-border pt-4">
        <summary className="cursor-pointer text-sm text-muted-foreground">Show link only</summary>
        <Input
          ref={linkRef}
          aria-label={`Password setup link for ${recipient}`}
          className="mt-3"
          value={invitation.link}
          readOnly
        />
        <button
          type="button"
          disabled={copying}
          className="mt-3 text-sm underline disabled:opacity-40"
          onClick={() => void copy("link")}
        >
          Copy link only
        </button>
      </details>
      <p className="mt-5 text-xs text-muted-foreground">
        This expiring link gives access to {recipient}’s account. Share it only with{" "}
        {invitation.email}.
      </p>
      <div className="mt-5 flex justify-end">
        <Button type="button" variant="outline" onClick={onClose}>
          Done
        </Button>
      </div>
    </dialog>
  );
}
