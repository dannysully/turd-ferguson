"use client";

import { useActionState, type ReactNode } from "react";

import { T } from "@/config/tokens";

import type { AdminResult } from "./actions";

/** One admin form, with the action's sentence shown under it. */
export function ActionForm({
  action,
  children,
  submit,
}: {
  action: (prev: AdminResult | null, form: FormData) => Promise<AdminResult>;
  children: ReactNode;
  submit: string;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  return (
    <form action={formAction} style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center", margin: "6px 0" }}>
      {children}
      <button
        type="submit"
        disabled={pending}
        style={{ padding: "6px 12px", border: `1px solid ${T.line}`, borderRadius: "6px", background: T.surface, color: T.ink, fontSize: "13px" }}
      >
        {pending ? "Working..." : submit}
      </button>
      {state ? (
        <span role="status" style={{ fontSize: "13px", color: state.ok ? T.goodFg : T.badFg }}>
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
