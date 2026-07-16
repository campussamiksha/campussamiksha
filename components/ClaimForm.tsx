"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ClaimForm({ slug }: { slug: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/claims", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug,
          officialEmail: fd.get("officialEmail"),
          designation: fd.get("designation"),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not submit");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error");
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="card" style={{ background: "#e7f6ef", borderColor: "#bfe6d3" }}>
        <strong style={{ color: "var(--good)" }}>Claim submitted.</strong>
        <div className="small muted">
          A moderator will verify your affiliation. Once approved you can post official responses
          to reviews.
        </div>
        <button className="btn secondary" style={{ marginTop: 10 }} onClick={() => router.push(`/institutions/${slug}`)}>
          Back to profile
        </button>
      </div>
    );
  }

  return (
    <form className="card" onSubmit={onSubmit}>
      <label>Official work email <span className="field-hint">(must be your institutional domain)</span></label>
      <input name="officialEmail" type="email" required placeholder="you@institute.ac.in" />

      <label>Your designation</label>
      <input name="designation" placeholder="e.g. Registrar, HR Manager, Public Relations Officer" />

      <p className="small muted" style={{ marginTop: 12 }}>
        Claims are manually verified. We may ask for proof of authority to represent the
        institution. Official responses you post are public and moderated.
      </p>

      {error ? <p className="small" style={{ color: "var(--bad)" }}>{error}</p> : null}

      <button className="btn" type="submit" disabled={busy} style={{ marginTop: 6 }}>
        {busy ? "Submitting…" : "Submit claim"}
      </button>
    </form>
  );
}
