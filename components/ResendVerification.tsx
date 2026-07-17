"use client";

import { useState } from "react";

export default function ResendVerification() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not resend");
      if (data.alreadyVerified) setMsg("Your email is already verified — refresh the page.");
      else setMsg("We’ve emailed you a link. You can also verify instantly here:");
      if (data.verifyUrl) setLink(data.verifyUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button className="btn secondary" onClick={resend} disabled={busy} type="button">
        {busy ? "Sending…" : "Resend verification link"}
      </button>
      {msg ? <p className="small" style={{ color: "var(--good)", marginBottom: 4 }}>{msg}</p> : null}
      {link ? <a className="btn" href={link}>Verify my email now</a> : null}
      {error ? <p className="small" style={{ color: "var(--bad)" }}>{error}</p> : null}
    </div>
  );
}
