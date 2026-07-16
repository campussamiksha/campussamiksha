"use client";

import { useState } from "react";

const REASONS: [string, string][] = [
  ["names_individual", "Names / targets an individual"],
  ["defamation", "Defamatory or false"],
  ["fake", "Fake / not a real employee"],
  ["spam", "Spam"],
  ["abuse", "Abusive language"],
  ["other", "Other"],
];

export default function ReportButton({ reviewId }: { reviewId: string }) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(reason: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/reviews/${reviewId}/report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not report");
      setDone(true);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  if (done) return <span className="small muted">Reported — thank you.</span>;

  return (
    <span className="small">
      {!open ? (
        <button className="linklike" onClick={() => setOpen(true)} type="button"
                style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0, width: "auto" }}>
          Report
        </button>
      ) : (
        <span style={{ display: "inline-flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {REASONS.map(([v, l]) => (
            <button key={v} type="button" disabled={busy} onClick={() => submit(v)}
                    className="pill" style={{ cursor: "pointer", background: "#fff" }}>
              {l}
            </button>
          ))}
          <button type="button" onClick={() => setOpen(false)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", width: "auto" }}>
            cancel
          </button>
        </span>
      )}
      {error ? <span style={{ color: "var(--bad)" }}> {error}</span> : null}
    </span>
  );
}
