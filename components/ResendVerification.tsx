"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResendVerification() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [devUrl, setDevUrl] = useState<string | null>(null);
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
      else setMsg("Sent — check your inbox (and spam).");
      if (data.devVerifyUrl) setDevUrl(data.devVerifyUrl);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      <button className="btn secondary" onClick={resend} disabled={busy} type="button">
        {busy ? "Sending…" : "Resend verification email"}
      </button>
      {msg ? <p className="small" style={{ color: "var(--good)" }}>{msg}</p> : null}
      {devUrl ? <p className="small">Dev link: <Link href={devUrl}>verify now</Link></p> : null}
      {error ? <p className="small" style={{ color: "var(--bad)" }}>{error}</p> : null}
    </div>
  );
}
