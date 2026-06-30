"use client";

import { useState, useTransition } from "react";

import { deleteUser, startImpersonation, toggleAdmin, updateUserName } from "@/app/(admin)/admin/users/actions";

const BTN = "rounded border px-2 py-1 text-[11px] transition-colors disabled:opacity-50";

export function UserManage({
  targetUserId,
  targetName,
  isAdmin,
  isSelf,
}: {
  targetUserId: string;
  targetName: string;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const [pending, start] = useTransition();
  const [name, setName] = useState(targetName);
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState<null | "admin" | "delete">(null);

  return (
    <div className="flex w-full max-w-sm flex-col items-stretch gap-2 sm:w-auto sm:items-end">
      {/* SUPPORT — view-as / help set up (the common, safe actions) */}
      <div className="flex flex-wrap justify-end gap-1.5">
        <button
          className={BTN}
          style={{ borderColor: "var(--accent,#d97706)", color: "var(--accent,#d97706)" }}
          disabled={pending || isSelf}
          title={isSelf ? "You can't view-as yourself" : "See the app as this user (audited)"}
          onClick={() => start(() => startImpersonation(targetUserId, "/dashboard"))}
        >
          View as user
        </button>
        <button
          className={BTN}
          style={{ borderColor: "var(--border,#292524)", color: "var(--text-secondary,#a8a29e)" }}
          disabled={pending || isSelf}
          title="Open their Inputs in view-as mode to set up on their behalf"
          onClick={() => start(() => startImpersonation(targetUserId, "/inputs"))}
        >
          Help set up
        </button>
      </div>

      {/* MANAGE */}
      <div className="flex flex-wrap justify-end gap-1.5">
        <button
          className={BTN}
          style={{ borderColor: "var(--border,#292524)", color: "var(--text-secondary,#a8a29e)" }}
          disabled={pending}
          onClick={() => setEditing((v) => !v)}
        >
          Edit name
        </button>
        {!isSelf && (
          <button
            className={BTN}
            style={{ borderColor: "var(--border,#292524)", color: "var(--text-secondary,#a8a29e)" }}
            disabled={pending}
            onClick={() => setConfirm(confirm === "admin" ? null : "admin")}
          >
            {isAdmin ? "Revoke admin" : "Make admin"}
          </button>
        )}
        {!isSelf && (
          <button
            className={BTN}
            style={{ borderColor: "#dc262655", color: "#ef4444" }}
            disabled={pending}
            onClick={() => setConfirm(confirm === "delete" ? null : "delete")}
          >
            Remove
          </button>
        )}
      </div>

      {editing && (
        <div className="flex items-center gap-1.5">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-[var(--border,#292524)] bg-[var(--elevated,#1c1917)]/40 px-2 py-1 text-[11px] outline-none focus:border-[var(--accent,#d97706)]"
            placeholder="full name"
          />
          <button
            className={BTN}
            style={{ borderColor: "var(--accent,#d97706)", color: "var(--accent,#d97706)" }}
            disabled={pending}
            onClick={() => start(async () => { await updateUserName(targetUserId, name); setEditing(false); })}
          >
            Save
          </button>
        </div>
      )}

      {confirm === "admin" && !isSelf && (
        <ConfirmBox
          tone="#d97706"
          message={isAdmin ? "Revoke admin from this user?" : "Grant FULL admin (sees all users + this console) to this user?"}
          confirmLabel={isAdmin ? "Revoke admin" : "Grant admin"}
          pending={pending}
          onConfirm={() => start(async () => { await toggleAdmin(targetUserId, !isAdmin); setConfirm(null); })}
          onCancel={() => setConfirm(null)}
        />
      )}

      {confirm === "delete" && !isSelf && (
        <ConfirmBox
          tone="#dc2626"
          message="Remove this user permanently? This deletes their account, farms, and all logged data. This cannot be undone."
          confirmLabel="Remove user"
          pending={pending}
          onConfirm={() => start(() => deleteUser(targetUserId))}
          onCancel={() => setConfirm(null)}
        />
      )}
    </div>
  );
}

function ConfirmBox({
  tone,
  message,
  confirmLabel,
  pending,
  onConfirm,
  onCancel,
}: {
  tone: string;
  message: string;
  confirmLabel: string;
  pending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="rounded border p-2 text-[11px]" style={{ borderColor: `${tone}55`, background: `${tone}12` }}>
      <p className="mb-2 text-[var(--text-secondary,#a8a29e)]">{message}</p>
      <div className="flex justify-end gap-1.5">
        <button className={BTN} style={{ borderColor: "var(--border,#292524)" }} disabled={pending} onClick={onCancel}>
          Cancel
        </button>
        <button className={BTN} style={{ borderColor: tone, color: "#fff", background: tone }} disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  );
}
