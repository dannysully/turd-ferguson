"use client";

import { useEffect, useRef } from "react";

/**
 * R163 (1 Oct 2026, danny.md line 172): the login link opens the dashboard
 * without a click. On mount it submits its form once, through the form's own
 * submit button, so SubmitButton reads "Opening your dashboard...". Still the
 * POST: a mail scanner fetches the page and runs no script, so it never spends
 * the token. Without script the button is the way on.
 */
export default function AutoSubmit() {
  const ref = useRef<HTMLSpanElement>(null);
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const form = ref.current?.closest("form");
    const button = form?.querySelector<HTMLButtonElement>('button[type="submit"]');
    form?.requestSubmit(button ?? undefined);
  }, []);
  return <span ref={ref} hidden />;
}
