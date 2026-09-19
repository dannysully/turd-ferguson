"use client";

import { useActionState } from "react";

import { submitContactForm, type ContactFormState } from "@/app/contact/actions";
import { T } from "@/config/tokens";

/**
 * The contact form, from Contact.dc.html: name, work email, agency, and what
 * you need. Four fields, because every extra one costs replies and the scan
 * already answers most of what a longer form would ask.
 */

const initialState: ContactFormState = { status: "idle" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
  fontSize: "14px",
  color: T.ink,
  background: T.surface,
  border: "1px solid " + T.line,
  borderRadius: "10px",
  padding: "11px 13px",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: T.ink,
  marginBottom: "6px",
};

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);

  if (state.status === "success") {
    return (
      <div style={{ background: T.wash, border: "1px solid " + T.accent, borderRadius: "14px", padding: "20px 22px" }}>
        <p style={{ margin: 0, fontSize: "15px", fontWeight: 600, color: T.ink }}>Message received.</p>
        <p style={{ margin: "6px 0 0", fontSize: "14px", lineHeight: 1.65, color: T.soft }}>
          It reaches the people doing the work, and is usually answered the same working day.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate>
      <label htmlFor="c-name" style={labelStyle}>
        Name
      </label>
      <input id="c-name" name="name" type="text" required autoComplete="name" style={inputStyle} />

      <label htmlFor="c-email" style={{ ...labelStyle, marginTop: "16px" }}>
        Work email
      </label>
      <input
        id="c-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        placeholder="you@youragency.com"
        style={inputStyle}
      />

      <label htmlFor="c-agency" style={{ ...labelStyle, marginTop: "16px" }}>
        Agency
      </label>
      <input id="c-agency" name="company" type="text" autoComplete="organization" style={inputStyle} />

      <label htmlFor="c-msg" style={{ ...labelStyle, marginTop: "16px" }}>
        What do you need
      </label>
      <textarea id="c-msg" name="message" rows={4} required style={{ ...inputStyle, resize: "vertical" }} />

      {state.status === "error" ? (
        <p role="alert" style={{ margin: "12px 0 0", fontSize: "13px", color: T.badFg }}>
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        className="btn-primary"
        disabled={pending}
        style={{
          width: "100%",
          marginTop: "18px",
          fontFamily: "inherit",
          fontSize: "15px",
          fontWeight: 600,
          border: 0,
          borderRadius: "10px",
          padding: "13px 20px",
          cursor: pending ? "wait" : "pointer",
        }}
      >
        {pending ? "Sending" : "Send"}
      </button>
      <p style={{ margin: "12px 0 0", fontSize: "12.5px", lineHeight: 1.55, color: T.soft }}>
        Goes to a person, usually answered the same working day. We do not add you to anything - see the{" "}
        <a href="/legal" style={{ fontWeight: 600, textDecoration: "none", color: T.accent }}>
          privacy policy
        </a>
        .
      </p>
    </form>
  );
}
