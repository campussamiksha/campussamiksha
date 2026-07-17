"use client";

import { useState } from "react";

type Option = { slug: string; name: string };

export default function InstitutionalEmailVerify({
  institutions,
  preselect,
}: {
  institutions: Option[];
  preselect?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/verification/email/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: fd.get("slug"), email: fd.get("email") }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send");
      setSent(String(fd.get("email")));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="notice good">
        <strong>Check your institutional inbox.</strong> We&rsquo;ve emailed a link to <b>{sent}</b> —
        click it to get your Verified employee badge instantly. (Link expires in 30 minutes.)
      </div>
    );
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <label>Institution</label>
      <select name="slug" required defaultValue={preselect ?? ""}>
        <option value="" disabled>— select —</option>
        {institutions.map((i) => (
          <option key={i.slug} value={i.slug}>{i.name}</option>
        ))}
      </select>

      <label>Institutional email <span className="field-hint">(e.g. name@iitb.ac.in)</span></label>
      <input name="email" type="email" required placeholder="you@institute.ac.in" />

      <p className="small muted" style={{ marginTop: 10 }}>
        We send a one-time link to this address to confirm you work there. The email is used only for
        this check — it&rsquo;s never shown on your reviews or shared.
      </p>
      {error ? <p className="small" style={{ color: "var(--bad)" }}>{error}</p> : null}
      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 4 }}>
        {busy ? "Sending…" : "Email me a verification link"}
      </button>
    </form>
  );
}
