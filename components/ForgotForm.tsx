"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotForm() {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/auth/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: fd.get("email") }),
      });
      if (!res.ok) throw new Error("Something went wrong");
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="card" style={{ maxWidth: 420, margin: "0 auto" }}>
        <h1 style={{ marginTop: 0 }}>Check your email</h1>
        <p className="muted">
          If an account exists for that address, we&rsquo;ve emailed a link to reset your password.
          It expires in 30 minutes.
        </p>
        <Link className="btn secondary" href="/login">Back to log in</Link>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={onSubmit} style={{ maxWidth: 420, margin: "0 auto" }}>
      <h1 style={{ marginTop: 0 }}>Reset your password</h1>
      <p className="muted small" style={{ marginTop: 0 }}>Enter your email and we&rsquo;ll send a reset link.</p>
      <label>Email</label>
      <input name="email" type="email" required placeholder="you@example.com" />
      {error ? <p className="small" style={{ color: "var(--bad)" }}>{error}</p> : null}
      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 12 }}>
        {busy ? "Sending…" : "Send reset link"}
      </button>
      <p className="small muted" style={{ marginTop: 14 }}>
        Remembered it? <Link href="/login">Log in</Link>
      </p>
    </form>
  );
}
