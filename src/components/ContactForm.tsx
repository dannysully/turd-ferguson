"use client";

import { useActionState } from "react";
import { submitContactForm, type ContactFormState } from "@/app/contact/actions";

const initialState: ContactFormState = { status: "idle" };

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.75rem 1rem",
  border: "1px solid #B4B2A9",
  borderRadius: "6px",
  fontSize: "1rem",
  color: "#3D3D3A",
  background: "#ffffff",
  outline: "none",
  transition: "border-color 0.15s ease",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.875rem",
  color: "#0D1B2A",
  marginBottom: "0.4rem",
  fontFamily: "Georgia, 'Times New Roman', Times, serif",
};

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);

  if (state.status === "success") {
    return (
      <div
        style={{
          padding: "2rem",
          background: "#F5F5F4",
          borderRadius: "8px",
          borderLeft: "3px solid #1D9E75",
        }}
      >
        <p
          style={{
            fontFamily: "Georgia, 'Times New Roman', Times, serif",
            color: "#0D1B2A",
            fontSize: "1.1rem",
            marginBottom: "0.5rem",
          }}
        >
          Message received.
        </p>
        <p style={{ color: "#3D3D3A", lineHeight: 1.7 }}>
          We&apos;ll be in touch shortly to schedule a call.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} noValidate>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.25rem",
          marginBottom: "1.25rem",
        }}
      >
        <div>
          <label htmlFor="name" style={labelStyle}>
            Name <span style={{ color: "#D85A30" }}>*</span>
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoComplete="name"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="email" style={labelStyle}>
            Email <span style={{ color: "#D85A30" }}>*</span>
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="company" style={labelStyle}>
            Company
          </label>
          <input
            id="company"
            name="company"
            type="text"
            autoComplete="organization"
            style={inputStyle}
          />
        </div>
        <div>
          <label htmlFor="website" style={labelStyle}>
            Website URL
          </label>
          <input
            id="website"
            name="website"
            type="url"
            autoComplete="url"
            placeholder="https://"
            style={inputStyle}
          />
        </div>
      </div>

      <div style={{ marginBottom: "1.5rem" }}>
        <label htmlFor="message" style={labelStyle}>
          Message <span style={{ color: "#D85A30" }}>*</span>
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={5}
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </div>

      {state.status === "error" && (
        <p
          style={{
            color: "#c0392b",
            fontSize: "0.875rem",
            marginBottom: "1rem",
          }}
          role="alert"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        style={{
          background: pending ? "#b04020" : "#D85A30",
          color: "#ffffff",
          padding: "0.875rem 2rem",
          borderRadius: "8px",
          fontSize: "1rem",
          fontWeight: 500,
          border: "none",
          cursor: pending ? "wait" : "pointer",
          transition: "background 0.15s ease",
        }}
      >
        {pending ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
